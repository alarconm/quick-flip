"""
Membership API endpoints.
Handles Stripe checkout, billing portal, subscription management.
"""
import os
from flask import Blueprint, request, jsonify
from .auth import get_current_member
from ..extensions import db
from ..models import Member, MembershipTier, BonusTransaction
from ..services.stripe_service import StripeService
from ..services.shopify_client import ShopifyClient

membership_bp = Blueprint('membership', __name__)


def get_shopify_client():
    """Create Shopify client from environment."""
    shop_domain = os.getenv('SHOPIFY_DOMAIN')
    access_token = os.getenv('SHOPIFY_ACCESS_TOKEN')
    if not shop_domain or not access_token:
        return None
    return ShopifyClient(shop_domain, access_token)


@membership_bp.route('/tiers', methods=['GET'])
def list_tiers():
    """
    List available membership tiers.

    Returns:
        List of active tiers with pricing and benefits
    """
    tenant_id = int(request.headers.get('X-Tenant-ID', 1))

    tiers = MembershipTier.query.filter_by(
        tenant_id=tenant_id,
        is_active=True
    ).order_by(MembershipTier.display_order).all()

    return jsonify({
        'tiers': [t.to_dict() for t in tiers]
    })


@membership_bp.route('/checkout', methods=['POST'])
def create_checkout():
    """
    Create a Stripe checkout session for subscription signup.

    Request body:
        tier_id: int (required)
        success_url: string (optional) - defaults to portal dashboard
        cancel_url: string (optional) - defaults to pricing page

    Returns:
        Checkout session URL
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.json
    tenant_id = member.tenant_id

    if not data.get('tier_id'):
        return jsonify({'error': 'tier_id is required'}), 400

    # Verify tier exists and is active
    tier = MembershipTier.query.filter_by(
        id=data['tier_id'],
        tenant_id=tenant_id,
        is_active=True
    ).first()

    if not tier:
        return jsonify({'error': 'Invalid tier'}), 400

    if not tier.stripe_price_id:
        return jsonify({'error': 'Tier not configured for payments yet'}), 400

    # Default URLs
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    success_url = data.get('success_url', f'{frontend_url}/dashboard')
    cancel_url = data.get('cancel_url', f'{frontend_url}/pricing')

    # Create checkout session
    stripe_service = StripeService(tenant_id)

    try:
        session = stripe_service.create_checkout_session(
            tier_id=tier.id,
            member_id=member.id,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=member.email if not member.stripe_customer_id else None,
            stripe_customer_id=member.stripe_customer_id
        )

        # Update member's tier (will be confirmed after payment)
        member.tier_id = tier.id
        db.session.commit()

        return jsonify(session)

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Payment setup failed: {str(e)}'}), 500


@membership_bp.route('/portal', methods=['POST'])
def create_portal_session():
    """
    Create a Stripe billing portal session for subscription management.

    Request body:
        return_url: string (optional) - defaults to portal dashboard

    Returns:
        Billing portal URL
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    if not member.stripe_customer_id:
        return jsonify({'error': 'No billing account found. Please complete signup first.'}), 400

    data = request.json or {}
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    return_url = data.get('return_url', f'{frontend_url}/dashboard')

    stripe_service = StripeService(member.tenant_id)

    try:
        session = stripe_service.create_billing_portal_session(
            stripe_customer_id=member.stripe_customer_id,
            return_url=return_url
        )
        return jsonify(session)

    except Exception as e:
        return jsonify({'error': f'Could not create portal session: {str(e)}'}), 500


@membership_bp.route('/change-tier', methods=['POST'])
def change_tier():
    """
    Change subscription to a different tier.

    Request body:
        tier_id: int (required)

    Returns:
        Updated subscription info
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    if not member.stripe_subscription_id:
        return jsonify({'error': 'No active subscription'}), 400

    data = request.json
    if not data.get('tier_id'):
        return jsonify({'error': 'tier_id is required'}), 400

    # Verify new tier
    new_tier = MembershipTier.query.filter_by(
        id=data['tier_id'],
        tenant_id=member.tenant_id,
        is_active=True
    ).first()

    if not new_tier:
        return jsonify({'error': 'Invalid tier'}), 400

    if not new_tier.stripe_price_id:
        return jsonify({'error': 'Tier not configured for payments'}), 400

    if new_tier.id == member.tier_id:
        return jsonify({'error': 'Already on this tier'}), 400

    stripe_service = StripeService(member.tenant_id)

    try:
        result = stripe_service.change_subscription_tier(
            subscription_id=member.stripe_subscription_id,
            new_tier_id=new_tier.id
        )

        # Update member's tier
        member.tier_id = new_tier.id
        db.session.commit()

        return jsonify({
            'message': 'Tier changed successfully',
            'new_tier': new_tier.to_dict(),
            'subscription': result
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Tier change failed: {str(e)}'}), 500


@membership_bp.route('/cancel', methods=['POST'])
def cancel_subscription():
    """
    Cancel membership subscription.
    By default, cancels at end of billing period.

    Request body:
        immediate: bool (optional) - cancel immediately if True

    Returns:
        Cancellation confirmation
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    if not member.stripe_subscription_id:
        return jsonify({'error': 'No active subscription'}), 400

    data = request.json or {}
    immediate = data.get('immediate', False)

    stripe_service = StripeService(member.tenant_id)

    try:
        result = stripe_service.cancel_subscription(
            subscription_id=member.stripe_subscription_id,
            at_period_end=not immediate
        )

        member.cancel_at_period_end = result['cancel_at_period_end']
        if immediate:
            member.status = 'cancelled'
            member.payment_status = 'cancelled'
        db.session.commit()

        message = 'Membership will cancel at end of billing period'
        if immediate:
            message = 'Membership cancelled immediately'

        return jsonify({
            'message': message,
            'subscription': result
        })

    except Exception as e:
        return jsonify({'error': f'Cancellation failed: {str(e)}'}), 500


@membership_bp.route('/reactivate', methods=['POST'])
def reactivate_subscription():
    """
    Reactivate a subscription that was set to cancel at period end.

    Returns:
        Reactivation confirmation
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    if not member.stripe_subscription_id:
        return jsonify({'error': 'No subscription to reactivate'}), 400

    if not member.cancel_at_period_end:
        return jsonify({'error': 'Subscription is not scheduled for cancellation'}), 400

    stripe_service = StripeService(member.tenant_id)

    try:
        result = stripe_service.reactivate_subscription(
            subscription_id=member.stripe_subscription_id
        )

        member.cancel_at_period_end = False
        db.session.commit()

        return jsonify({
            'message': 'Membership reactivated successfully',
            'subscription': result
        })

    except Exception as e:
        return jsonify({'error': f'Reactivation failed: {str(e)}'}), 500


@membership_bp.route('/status', methods=['GET'])
def get_subscription_status():
    """
    Get current subscription status from Stripe.

    Returns:
        Current subscription details
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    if not member.stripe_subscription_id:
        return jsonify({
            'status': 'none',
            'message': 'No active subscription',
            'member_status': member.status,
            'tier': member.tier.to_dict() if member.tier else None
        })

    stripe_service = StripeService(member.tenant_id)

    try:
        subscription = stripe_service.get_subscription(member.stripe_subscription_id)

        return jsonify({
            'status': subscription['status'],
            'current_period_start': subscription['current_period_start'].isoformat(),
            'current_period_end': subscription['current_period_end'].isoformat(),
            'cancel_at_period_end': subscription['cancel_at_period_end'],
            'tier': member.tier.to_dict() if member.tier else None,
            'member_status': member.status
        })

    except Exception as e:
        return jsonify({'error': f'Could not fetch status: {str(e)}'}), 500


@membership_bp.route('/store-credit', methods=['GET'])
def get_store_credit():
    """
    Get member's store credit balance from Shopify.

    Returns:
        Store credit balance and currency
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    if not member.shopify_customer_id:
        return jsonify({
            'balance': 0,
            'currency': 'USD',
            'message': 'No Shopify account linked'
        })

    client = get_shopify_client()
    if not client:
        return jsonify({'error': 'Shopify not configured'}), 500

    try:
        result = client.get_store_credit_balance(member.shopify_customer_id)
        return jsonify({
            'balance': result['balance'],
            'currency': result['currency'],
            'account_id': result.get('account_id')
        })
    except Exception as e:
        return jsonify({'error': f'Could not fetch balance: {str(e)}'}), 500


@membership_bp.route('/bonus-history', methods=['GET'])
def get_bonus_history():
    """
    Get member's bonus transaction history.

    Query params:
        limit: int (optional, default 20)
        offset: int (optional, default 0)

    Returns:
        List of bonus transactions
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)

    transactions = (
        BonusTransaction.query
        .filter_by(member_id=member.id)
        .order_by(BonusTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    total = BonusTransaction.query.filter_by(member_id=member.id).count()

    return jsonify({
        'transactions': [t.to_dict() for t in transactions],
        'total': total,
        'limit': limit,
        'offset': offset
    })


@membership_bp.route('/link-shopify', methods=['POST'])
def link_shopify_customer():
    """
    Link member to their Shopify customer account by email.
    Also syncs their tier to Shopify customer tags.

    Returns:
        Linked customer info
    """
    member = get_current_member()
    if not member:
        return jsonify({'error': 'Not authenticated'}), 401

    client = get_shopify_client()
    if not client:
        return jsonify({'error': 'Shopify not configured'}), 500

    try:
        # Find customer by email
        customer = client.get_customer_by_email(member.email)

        if not customer:
            return jsonify({
                'error': 'No Shopify customer found with this email. Please make a purchase first.'
            }), 404

        # Link the customer
        member.shopify_customer_id = customer['id']
        db.session.commit()

        # Add membership tag
        if member.tier:
            tier_tag = f'qf-{member.tier.name.lower()}'
            client.add_customer_tag(customer['id'], tier_tag)
            client.add_customer_tag(customer['id'], f'QF{member.member_number[2:]}')

        # Get their store credit balance
        balance = client.get_store_credit_balance(customer['id'])

        return jsonify({
            'success': True,
            'customer_id': customer['id'],
            'customer_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
            'store_credit_balance': balance['balance'],
            'tags': customer.get('tags', [])
        })

    except Exception as e:
        return jsonify({'error': f'Failed to link account: {str(e)}'}), 500
