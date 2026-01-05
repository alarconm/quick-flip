"""
Shopify Webhook Handler for TradeUp.

Handles:
1. order/created - Membership purchases and cashback processing
2. customer/updated - Sync customer info to member records

Membership Flow:
1. Customer purchases membership product at POS (pays first month)
2. Shopify sends order/created webhook
3. We detect membership SKU (QFMEM-SILVER, QFMEM-GOLD, QFMEM-PLATINUM)
4. Create member record
5. Create Stripe customer + subscription with trial until 1st of next month
6. Tag Shopify customer with membership tier
7. Send welcome email with card setup link

Cashback Flow:
1. Member makes a purchase
2. Shopify sends order/created webhook
3. We check if customer is a member
4. Calculate tier-based cashback + any active promotions
5. Issue store credit
"""

import json
from datetime import datetime
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app

from app import db
from app.models.member import Member
from app.services.stripe_service import stripe_service
from app.services.email_service import email_service
from app.services.shopify_client import shopify_client
from app.services.store_credit_service import store_credit_service


shopify_webhook_bp = Blueprint('shopify_webhook', __name__)

# Membership product SKUs
MEMBERSHIP_SKUS = {
    'QFMEM-SILVER': 'SILVER',
    'QFMEM-GOLD': 'GOLD',
    'QFMEM-PLATINUM': 'PLATINUM'
}


@shopify_webhook_bp.route('/order-created', methods=['POST'])
def handle_order_created():
    """
    Handle Shopify order/created webhook.

    1. Detects membership product purchases and creates member records
    2. Processes cashback for existing member purchases
    """
    # Verify webhook signature
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256', '')
    if not shopify_client.verify_webhook(request.data, hmac_header):
        current_app.logger.warning("Invalid webhook signature")
        return jsonify({'error': 'Invalid signature'}), 401

    try:
        order_data = request.get_json()
        order_name = order_data.get('name', 'unknown')
        order_id = str(order_data.get('id'))
        current_app.logger.info(f"Received order webhook: {order_name}")

        result = {
            'order': order_name,
            'membership_processed': False,
            'cashback_processed': False,
        }

        # 1. Check for membership products first
        membership_items = find_membership_items(order_data)

        if membership_items:
            # Process each membership purchase
            for item in membership_items:
                membership_result = process_membership_purchase(order_data, item)
                if membership_result.get('error'):
                    current_app.logger.error(f"Error processing membership: {membership_result['error']}")
                else:
                    result['membership_processed'] = True
                    result['member_id'] = membership_result.get('member_id')

        # 2. Process cashback for member purchases (excluding membership products)
        cashback_result = process_purchase_cashback(order_data, membership_items)
        if cashback_result:
            result['cashback_processed'] = True
            result['cashback_amount'] = cashback_result.get('amount')

        if not result['membership_processed'] and not result['cashback_processed']:
            return jsonify({'status': 'skipped', 'reason': 'no_member_or_membership'}), 200

        return jsonify({'status': 'processed', **result}), 200

    except Exception as e:
        current_app.logger.exception(f"Error processing order webhook: {e}")
        return jsonify({'error': str(e)}), 500


def process_purchase_cashback(order_data: dict, membership_items: list) -> dict:
    """
    Process cashback for a member's purchase.

    Args:
        order_data: Shopify order webhook payload
        membership_items: List of membership items (excluded from cashback)

    Returns:
        Result dict with cashback details or None
    """
    # Get customer info
    customer = order_data.get('customer', {})
    if not customer:
        return None

    shopify_customer_id = str(customer.get('id'))

    # Check if customer is a member
    member = Member.query.filter_by(
        shopify_customer_id=shopify_customer_id,
        status='active'
    ).first()

    if not member:
        current_app.logger.debug(f"Customer {shopify_customer_id} is not an active member")
        return None

    # Calculate order total excluding membership products
    order_total = calculate_cashback_eligible_total(order_data, membership_items)

    if order_total <= 0:
        current_app.logger.debug(f"No cashback-eligible items in order")
        return None

    order_id = str(order_data.get('id'))
    order_name = order_data.get('name', f'#{order_id}')

    # Determine channel (POS = in_store, web = online)
    source_name = order_data.get('source_name', '')
    channel = 'in_store' if source_name in ['pos', 'shopify_pos'] else 'online'

    try:
        # Process cashback through store credit service
        entry = store_credit_service.process_purchase_cashback(
            member_id=member.id,
            order_total=Decimal(str(order_total)),
            order_id=order_id,
            order_name=order_name,
            channel=channel,
        )

        if entry:
            current_app.logger.info(
                f"Processed ${float(entry.amount):.2f} cashback for member {member.id} "
                f"on order {order_name} (total: ${order_total:.2f})"
            )
            return {
                'member_id': member.id,
                'amount': float(entry.amount),
                'ledger_id': entry.id,
            }

        return None

    except Exception as e:
        current_app.logger.error(f"Error processing cashback: {e}")
        return None


def calculate_cashback_eligible_total(order_data: dict, membership_items: list) -> float:
    """
    Calculate the order total eligible for cashback.

    Excludes:
    - Membership products
    - Shipping
    - Gift cards (Shopify already excludes these from discounts)

    Args:
        order_data: Shopify order webhook payload
        membership_items: List of membership line items to exclude

    Returns:
        Cashback-eligible total
    """
    membership_skus = {item['sku'] for item in membership_items}

    eligible_total = 0.0

    for item in order_data.get('line_items', []):
        sku = item.get('sku', '').upper()

        # Skip membership products
        if sku in membership_skus or sku in MEMBERSHIP_SKUS:
            continue

        # Skip gift cards
        if item.get('gift_card', False):
            continue

        # Add line item price * quantity (after line discounts)
        price = float(item.get('price', 0))
        quantity = int(item.get('quantity', 1))
        total_discount = sum(
            float(d.get('amount', 0))
            for d in item.get('discount_allocations', [])
        )

        line_total = (price * quantity) - total_discount
        eligible_total += max(0, line_total)

    return eligible_total


def find_membership_items(order_data: dict) -> list:
    """
    Find membership products in order line items.

    Args:
        order_data: Shopify order webhook payload

    Returns:
        List of membership line items with tier info
    """
    membership_items = []

    for item in order_data.get('line_items', []):
        sku = item.get('sku', '').upper()

        # Check if SKU matches a membership product
        if sku in MEMBERSHIP_SKUS:
            membership_items.append({
                'sku': sku,
                'tier': MEMBERSHIP_SKUS[sku],
                'title': item.get('title'),
                'quantity': item.get('quantity', 1),
                'price': item.get('price')
            })
            continue

        # Also check variant SKU
        variant_sku = item.get('variant_title', '').upper()
        if variant_sku in MEMBERSHIP_SKUS:
            membership_items.append({
                'sku': variant_sku,
                'tier': MEMBERSHIP_SKUS[variant_sku],
                'title': item.get('title'),
                'quantity': item.get('quantity', 1),
                'price': item.get('price')
            })
            continue

        # Check product tags for membership indicator
        properties = item.get('properties', [])
        for prop in properties:
            if prop.get('name', '').lower() == 'membership_tier':
                tier = prop.get('value', '').upper()
                if tier in ['SILVER', 'GOLD', 'PLATINUM']:
                    membership_items.append({
                        'sku': f'QFMEM-{tier}',
                        'tier': tier,
                        'title': item.get('title'),
                        'quantity': item.get('quantity', 1),
                        'price': item.get('price')
                    })

    return membership_items


def process_membership_purchase(order_data: dict, membership_item: dict) -> dict:
    """
    Process a membership purchase.

    Creates member record, Stripe subscription, and sends welcome email.

    Args:
        order_data: Shopify order webhook payload
        membership_item: Membership line item info

    Returns:
        Result dict with member_id or error
    """
    tier = membership_item['tier']
    shopify_order_id = str(order_data.get('id'))

    # Get customer info
    customer = order_data.get('customer', {})
    shopify_customer_id = str(customer.get('id'))
    email = customer.get('email') or order_data.get('email')
    first_name = customer.get('first_name', '')
    last_name = customer.get('last_name', '')
    phone = customer.get('phone', '')

    if not email:
        return {'error': 'No email address found on order'}

    current_app.logger.info(
        f"Processing {tier} membership for {email} "
        f"(Shopify customer: {shopify_customer_id})"
    )

    # Check if member already exists
    existing = Member.query.filter_by(shopify_customer_id=shopify_customer_id).first()
    if existing:
        current_app.logger.info(f"Member already exists, updating tier to {tier}")
        return handle_existing_member(existing, tier, shopify_order_id)

    try:
        # 1. Create Stripe customer
        stripe_customer = stripe_service.create_customer(
            email=email,
            name=f"{first_name} {last_name}".strip() or email,
            phone=phone,
            shopify_customer_id=shopify_customer_id
        )
        current_app.logger.info(f"Created Stripe customer: {stripe_customer.id}")

        # 2. Create subscription with trial until 1st of next month
        # Customer already paid first month via Shopify POS
        subscription = stripe_service.create_subscription_with_trial(
            customer_id=stripe_customer.id,
            tier=tier
        )
        current_app.logger.info(
            f"Created Stripe subscription: {subscription.id} "
            f"(trial ends: {datetime.fromtimestamp(subscription.trial_end)})"
        )

        # 3. Create member record
        member = Member(
            shopify_customer_id=shopify_customer_id,
            shopify_order_id=shopify_order_id,
            stripe_customer_id=stripe_customer.id,
            stripe_subscription_id=subscription.id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            tier=tier,
            status='active',
            joined_at=datetime.utcnow(),
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.fromtimestamp(subscription.trial_end)
        )
        db.session.add(member)
        db.session.commit()
        current_app.logger.info(f"Created member record: {member.id}")

        # 4. Tag Shopify customer
        tag_customer_with_membership(shopify_customer_id, tier)

        # 5. Send welcome email with card setup link
        card_setup_url = stripe_service.get_setup_intent_url(
            customer_id=stripe_customer.id,
            return_url='https://orbsportscards.com/quick-flip/welcome'
        )

        email_sent = email_service.send_welcome_email(
            to_email=email,
            first_name=first_name or email.split('@')[0],
            tier=tier,
            card_setup_url=card_setup_url
        )

        if email_sent:
            member.card_setup_sent_at = datetime.utcnow()
            db.session.commit()

        current_app.logger.info(
            f"Membership setup complete for {email} - "
            f"Member ID: {member.id}, Tier: {tier}"
        )

        return {
            'member_id': member.id,
            'stripe_customer_id': stripe_customer.id,
            'stripe_subscription_id': subscription.id,
            'email_sent': email_sent
        }

    except Exception as e:
        current_app.logger.exception(f"Error creating membership: {e}")
        db.session.rollback()
        return {'error': str(e)}


def handle_existing_member(member: Member, new_tier: str, order_id: str) -> dict:
    """
    Handle membership purchase for existing member (upgrade/reactivation).

    Args:
        member: Existing Member record
        new_tier: New membership tier
        order_id: Shopify order ID

    Returns:
        Result dict
    """
    try:
        old_tier = member.tier

        # If cancelled, reactivate
        if member.status == 'cancelled':
            # Create new subscription
            subscription = stripe_service.create_subscription_with_trial(
                customer_id=member.stripe_customer_id,
                tier=new_tier
            )
            member.stripe_subscription_id = subscription.id
            member.status = 'active'
            member.cancelled_at = None
            current_app.logger.info(f"Reactivated member {member.id} with new subscription")

        # If different tier, upgrade/downgrade
        elif member.tier != new_tier and member.stripe_subscription_id:
            stripe_service.change_tier(
                subscription_id=member.stripe_subscription_id,
                new_tier=new_tier,
                prorate=True
            )
            current_app.logger.info(f"Changed member {member.id} tier: {old_tier} -> {new_tier}")

        member.tier = new_tier
        member.shopify_order_id = order_id
        db.session.commit()

        # Update Shopify customer tags
        tag_customer_with_membership(member.shopify_customer_id, new_tier, old_tier)

        return {
            'member_id': member.id,
            'action': 'upgraded' if new_tier != old_tier else 'renewed',
            'old_tier': old_tier,
            'new_tier': new_tier
        }

    except Exception as e:
        current_app.logger.exception(f"Error updating existing member: {e}")
        db.session.rollback()
        return {'error': str(e)}


def tag_customer_with_membership(customer_id: str, tier: str, old_tier: str = None):
    """
    Update Shopify customer tags for membership.

    Args:
        customer_id: Shopify customer ID
        tier: New membership tier
        old_tier: Previous tier to remove (optional)
    """
    try:
        # Add new tier tags
        new_tags = [
            'quick-flip-member',
            f'qf-{tier.lower()}',
            f'qf-discount-{get_tier_discount(tier)}pct'
        ]
        shopify_client.add_customer_tags(customer_id, new_tags)

        # Remove old tier tags if upgrading/downgrading
        if old_tier and old_tier != tier:
            old_tags = [
                f'qf-{old_tier.lower()}',
                f'qf-discount-{get_tier_discount(old_tier)}pct'
            ]
            shopify_client.remove_customer_tags(customer_id, old_tags)

        current_app.logger.info(f"Updated customer {customer_id} tags for {tier} membership")

    except Exception as e:
        current_app.logger.error(f"Error updating customer tags: {e}")


def get_tier_discount(tier: str) -> int:
    """Get discount percentage for tier."""
    return {'SILVER': 10, 'GOLD': 15, 'PLATINUM': 20}.get(tier, 0)


@shopify_webhook_bp.route('/customer-updated', methods=['POST'])
def handle_customer_updated():
    """
    Handle Shopify customer update webhook.

    Syncs customer info changes to member record.
    """
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256', '')
    if not shopify_client.verify_webhook(request.data, hmac_header):
        return jsonify({'error': 'Invalid signature'}), 401

    try:
        customer_data = request.get_json()
        shopify_customer_id = str(customer_data.get('id'))

        member = Member.query.filter_by(shopify_customer_id=shopify_customer_id).first()
        if not member:
            return jsonify({'status': 'skipped', 'reason': 'not_a_member'}), 200

        # Update member info
        member.email = customer_data.get('email', member.email)
        member.first_name = customer_data.get('first_name', member.first_name)
        member.last_name = customer_data.get('last_name', member.last_name)
        member.phone = customer_data.get('phone', member.phone)
        db.session.commit()

        return jsonify({'status': 'updated', 'member_id': member.id}), 200

    except Exception as e:
        current_app.logger.exception(f"Error processing customer update: {e}")
        return jsonify({'error': str(e)}), 500
