"""
Subscription lifecycle webhook handlers.
Handles customer subscription events for paid membership tiers.

Shopify Subscription Contracts are created when customers purchase
subscription products (via Selling Plans). This handles:
- Subscription started → Assign tier
- Subscription cancelled → Remove/downgrade tier
- Subscription billing failed → Pause tier benefits

Uses TierService for proper auditing and conflict resolution.
"""
import hmac
import hashlib
import base64
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from ..extensions import db
from ..models import Tenant, Member, MembershipTier
from ..services.tier_service import TierService


subscription_lifecycle_bp = Blueprint('subscription_lifecycle', __name__)


def verify_shopify_webhook(data: bytes, hmac_header: str, secret: str) -> bool:
    """Verify Shopify webhook HMAC signature."""
    if not secret or not hmac_header:
        return False
    computed_hmac = base64.b64encode(
        hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    ).decode()
    return hmac.compare_digest(computed_hmac, hmac_header)


def get_tenant_from_domain(shop_domain: str) -> Tenant:
    """Get tenant from Shopify shop domain."""
    return Tenant.query.filter_by(shopify_domain=shop_domain).first()


def find_tier_by_selling_plan(tenant_id: int, selling_plan_id: str) -> MembershipTier:
    """Find membership tier linked to a Shopify selling plan."""
    return MembershipTier.query.filter_by(
        tenant_id=tenant_id,
        shopify_selling_plan_id=selling_plan_id,
        is_active=True
    ).first()


def find_tier_by_product_tags(tenant_id: int, product_tags: list) -> MembershipTier:
    """
    Find membership tier by product tags.

    Products can be tagged with tier names like:
    - 'membership:gold' or 'tier:gold'
    - 'membership-gold' or 'tier-gold'
    """
    for tag in product_tags:
        tag_lower = tag.lower().strip()

        # Check for membership:tier_name or tier:tier_name format
        if tag_lower.startswith('membership:') or tag_lower.startswith('tier:'):
            tier_name = tag_lower.split(':')[1].strip()
            tier = MembershipTier.query.filter(
                MembershipTier.tenant_id == tenant_id,
                MembershipTier.name.ilike(tier_name),
                MembershipTier.is_active == True
            ).first()
            if tier:
                return tier

        # Check for membership-tier_name or tier-tier_name format
        if tag_lower.startswith('membership-') or tag_lower.startswith('tier-'):
            tier_name = tag_lower.split('-', 1)[1].strip()
            tier = MembershipTier.query.filter(
                MembershipTier.tenant_id == tenant_id,
                MembershipTier.name.ilike(tier_name),
                MembershipTier.is_active == True
            ).first()
            if tier:
                return tier

    return None


@subscription_lifecycle_bp.route('/subscription_contracts/create', methods=['POST'])
def handle_subscription_created():
    """
    Handle SUBSCRIPTION_CONTRACTS_CREATE webhook.

    Triggered when a customer purchases a subscription product.
    Assigns the appropriate membership tier based on the selling plan.
    """
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')
    tenant = get_tenant_from_domain(shop_domain)

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    # Verify webhook in production
    if current_app.config.get('ENV') != 'development':
        hmac_header = request.headers.get('X-Shopify-Hmac-SHA256', '')
        if not verify_shopify_webhook(request.data, hmac_header, tenant.webhook_secret):
            return jsonify({'error': 'Invalid signature'}), 401

    try:
        payload = request.json
        contract = payload.get('subscription_contract', {})

        contract_id = contract.get('admin_graphql_api_id')
        customer_id = str(contract.get('customer', {}).get('id', ''))
        customer_email = contract.get('customer', {}).get('email', '')
        status = contract.get('status', '').upper()

        # Get the selling plan from the contract lines
        lines = contract.get('lines', {}).get('edges', [])
        selling_plan_id = None
        product_id = None

        for line in lines:
            node = line.get('node', {})
            selling_plan_id = node.get('sellingPlanId')
            product_id = node.get('productId')
            if selling_plan_id:
                break

        if not customer_id:
            return jsonify({
                'success': False,
                'error': 'No customer ID in subscription contract'
            }), 400

        # Find tier by selling plan
        tier = None
        if selling_plan_id:
            tier = find_tier_by_selling_plan(tenant.id, selling_plan_id)

        if not tier:
            # Try to find by product tags (if product info is available)
            current_app.logger.info(
                f'No membership tier linked to selling plan {selling_plan_id}'
            )
            return jsonify({
                'success': True,
                'message': 'Subscription tracked but no tier assignment (not a membership product)'
            })

        # Find or create member
        member = Member.query.filter_by(
            tenant_id=tenant.id,
            shopify_customer_id=customer_id
        ).first()

        if not member:
            # Auto-enroll customer as member
            member = Member(
                tenant_id=tenant.id,
                shopify_customer_id=customer_id,
                email=customer_email or f'{customer_id}@unknown.com',
                member_number=Member.generate_member_number(tenant.id),
                status='active',
                membership_start_date=datetime.utcnow().date()
            )
            db.session.add(member)
            db.session.flush()  # Get the member ID
            current_app.logger.info(f'Auto-enrolled member {member.member_number}')

        # Use TierService for proper assignment with auditing
        tier_service = TierService(tenant.id)
        result = tier_service.process_subscription_started(
            member_id=member.id,
            contract_id=contract_id,
            tier_id=tier.id,
            selling_plan_id=selling_plan_id
        )

        if result.get('success'):
            current_app.logger.info(
                f'Assigned tier {tier.name} to {member.member_number} via subscription {contract_id}'
            )
            return jsonify({
                'success': True,
                'member_id': member.id,
                'member_number': member.member_number,
                'tier': tier.name,
                'contract_id': contract_id
            })
        else:
            return jsonify(result), 400

    except Exception as e:
        current_app.logger.error(f'Error processing subscription create webhook: {str(e)}')
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@subscription_lifecycle_bp.route('/subscription_contracts/update', methods=['POST'])
def handle_subscription_updated():
    """
    Handle SUBSCRIPTION_CONTRACTS_UPDATE webhook.

    Triggered when a subscription status changes:
    - ACTIVE → Keep tier
    - PAUSED → Pause benefits (optional)
    - CANCELLED → Remove tier
    - EXPIRED → Remove tier
    """
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')
    tenant = get_tenant_from_domain(shop_domain)

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    try:
        payload = request.json
        contract = payload.get('subscription_contract', {})

        contract_id = contract.get('admin_graphql_api_id')
        status = contract.get('status', '').upper()
        customer_id = str(contract.get('customer', {}).get('id', ''))

        if not customer_id:
            return jsonify({'success': True, 'message': 'No customer ID'})

        # Find member by subscription contract or customer ID
        member = Member.query.filter_by(
            tenant_id=tenant.id,
            shopify_subscription_contract_id=contract_id
        ).first()

        if not member:
            member = Member.query.filter_by(
                tenant_id=tenant.id,
                shopify_customer_id=customer_id
            ).first()

        if not member:
            return jsonify({
                'success': True,
                'message': 'Member not found for subscription'
            })

        old_status = member.subscription_status
        tier_service = TierService(tenant.id)

        # Handle status transitions
        if status in ['CANCELLED', 'EXPIRED']:
            result = tier_service.process_subscription_cancelled(
                member_id=member.id,
                contract_id=contract_id,
                reason=f'Subscription {status.lower()}',
                immediate=True
            )
            return jsonify({
                'success': True,
                'member_id': member.id,
                'member_number': member.member_number,
                'old_status': old_status,
                'new_status': status.lower(),
                'tier_removed': result.get('success', False)
            })

        elif status == 'PAUSED':
            # Update subscription status but keep tier for grace period
            member.subscription_status = 'paused'
            db.session.commit()
            current_app.logger.info(f'Subscription paused for {member.member_number}')
            return jsonify({
                'success': True,
                'member_id': member.id,
                'new_status': 'paused',
                'tier_retained': True
            })

        elif status == 'ACTIVE':
            # Reactivate
            member.subscription_status = 'active'
            db.session.commit()
            if old_status == 'paused':
                current_app.logger.info(f'Subscription reactivated for {member.member_number}')
            return jsonify({
                'success': True,
                'member_id': member.id,
                'new_status': 'active'
            })

        # Default: just update status
        member.subscription_status = status.lower()
        db.session.commit()

        return jsonify({
            'success': True,
            'member_id': member.id,
            'old_status': old_status,
            'new_status': status.lower()
        })

    except Exception as e:
        current_app.logger.error(f'Error processing subscription update webhook: {str(e)}')
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@subscription_lifecycle_bp.route('/subscription_billing_attempts/success', methods=['POST'])
def handle_billing_success():
    """
    Handle SUBSCRIPTION_BILLING_ATTEMPTS_SUCCESS webhook.

    Payment succeeded - ensure tier benefits are active and log the event.
    """
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')
    tenant = get_tenant_from_domain(shop_domain)

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    try:
        payload = request.json
        contract_id = payload.get('subscription_contract_id')

        if not contract_id:
            return jsonify({'success': True})

        member = Member.query.filter_by(
            tenant_id=tenant.id,
            shopify_subscription_contract_id=contract_id
        ).first()

        if member:
            old_status = member.subscription_status
            member.subscription_status = 'active'
            db.session.commit()

            # Log billing success for audit trail (especially if recovering from past_due)
            if old_status == 'past_due':
                tier_service = TierService(tenant.id)
                from ..models.tier_history import TierChangeLog
                log = TierChangeLog(
                    tenant_id=tenant.id,
                    member_id=member.id,
                    previous_tier_id=member.tier_id,
                    new_tier_id=member.tier_id,
                    previous_tier_name=member.tier.name if member.tier else None,
                    new_tier_name=member.tier.name if member.tier else None,
                    change_type='billing_recovered',
                    source_type='subscription',
                    source_reference=contract_id,
                    reason='Subscription billing succeeded after past_due',
                    created_by='system:billing_webhook'
                )
                db.session.add(log)
                db.session.commit()
                current_app.logger.info(f'Billing recovered for {member.member_number}')
            else:
                current_app.logger.info(f'Billing success for {member.member_number}')

        return jsonify({
            'success': True,
            'member_id': member.id if member else None,
            'status': 'active' if member else None
        })

    except Exception as e:
        current_app.logger.error(f'Error processing billing success: {str(e)}')
        return jsonify({'error': str(e)}), 500


@subscription_lifecycle_bp.route('/subscription_billing_attempts/failure', methods=['POST'])
def handle_billing_failure():
    """
    Handle SUBSCRIPTION_BILLING_ATTEMPTS_FAILURE webhook.

    Payment failed - logs the failure and could pause benefits based on retry count.
    Uses TierService for proper auditing.
    """
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')
    tenant = get_tenant_from_domain(shop_domain)

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    try:
        payload = request.json
        contract_id = payload.get('subscription_contract_id')
        error_message = payload.get('error_message', 'Unknown')
        # Shopify may include retry/attempt info in different webhook versions
        attempt_count = payload.get('attempt_count', 1)

        if not contract_id:
            return jsonify({'success': True})

        member = Member.query.filter_by(
            tenant_id=tenant.id,
            shopify_subscription_contract_id=contract_id
        ).first()

        if member:
            tier_service = TierService(tenant.id)
            result = tier_service.process_subscription_billing_failed(
                member_id=member.id,
                contract_id=contract_id,
                attempt_count=attempt_count
            )

            current_app.logger.warning(
                f'Billing failed for {member.member_number}: {error_message} (attempt {attempt_count})'
            )

            return jsonify({
                'success': True,
                'member_id': member.id,
                'member_number': member.member_number,
                'status': result.get('status', 'past_due'),
                'attempt_count': attempt_count
            })

        return jsonify({
            'success': True,
            'message': 'No member found for subscription'
        })

    except Exception as e:
        current_app.logger.error(f'Error processing billing failure: {str(e)}')
        return jsonify({'error': str(e)}), 500
