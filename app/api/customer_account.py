"""
Customer Account API endpoints.

Public endpoints for customer-facing features like:
- Viewing tier status and benefits
- Trade-in history
- Store credit balance
- Rewards activity

These endpoints are authenticated via Shopify customer token,
not the admin API token.
"""
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from decimal import Decimal
from ..extensions import db
from ..models import Member, TradeInBatch, MembershipTier, StoreCreditLedger

customer_account_bp = Blueprint('customer_account', __name__)


def get_member_from_customer_token() -> tuple:
    """
    Get member from Shopify customer token in Authorization header.

    Returns:
        Tuple of (member, error_response, status_code)
    """
    auth_header = request.headers.get('Authorization', '')
    shop_domain = request.headers.get('X-Shop-Domain', '')

    if not auth_header.startswith('Bearer '):
        return None, {'error': 'Missing authorization'}, 401

    # For now, we'll accept the Shopify customer ID directly
    # In production, this would validate a customer access token
    customer_id = request.headers.get('X-Customer-ID')

    if not customer_id:
        return None, {'error': 'Missing customer ID'}, 401

    # Find member by Shopify customer ID
    member = Member.query.filter_by(
        shopify_customer_id=customer_id
    ).first()

    if not member:
        return None, {'error': 'Not a member'}, 404

    return member, None, None


@customer_account_bp.route('/status', methods=['GET'])
def get_customer_status():
    """
    Get customer's membership status.

    Returns:
        Member tier, balance, and basic stats
    """
    member, error, status = get_member_from_customer_token()
    if error:
        return jsonify(error), status

    tier = member.tier
    tier_info = None
    if tier:
        tier_info = {
            'id': tier.id,
            'name': tier.name,
            'bonus_rate': float(tier.bonus_rate),
            'bonus_percent': float(tier.bonus_rate * 100),
            'benefits': tier.benefits or {}
        }

    # Calculate store credit balance from ledger
    store_credit_balance = db.session.query(
        db.func.sum(StoreCreditLedger.amount)
    ).filter(
        StoreCreditLedger.member_id == member.id
    ).scalar() or Decimal('0')

    return jsonify({
        'member': {
            'member_number': member.member_number,
            'name': member.name,
            'email': member.email,
            'status': member.status,
            'tier': tier_info,
            'member_since': member.membership_start_date.isoformat() if member.membership_start_date else None,
        },
        'stats': {
            'total_trade_ins': member.total_trade_ins or 0,
            'total_trade_value': float(member.total_trade_value or 0),
            'total_bonus_earned': float(member.total_bonus_earned or 0),
        },
        'store_credit': {
            'balance': float(store_credit_balance),
            'currency': 'USD'
        }
    })


@customer_account_bp.route('/tiers', methods=['GET'])
def get_available_tiers():
    """
    Get all available membership tiers.

    Returns:
        List of tiers with benefits
    """
    member, error, status = get_member_from_customer_token()
    if error:
        return jsonify(error), status

    tiers = MembershipTier.query.filter_by(
        tenant_id=member.tenant_id,
        is_active=True
    ).order_by(MembershipTier.display_order).all()

    current_tier_id = member.tier_id

    return jsonify({
        'tiers': [{
            'id': tier.id,
            'name': tier.name,
            'bonus_rate': float(tier.bonus_rate),
            'bonus_percent': float(tier.bonus_rate * 100),
            'benefits': tier.benefits or {},
            'is_current': tier.id == current_tier_id
        } for tier in tiers],
        'current_tier_id': current_tier_id
    })


@customer_account_bp.route('/trade-ins', methods=['GET'])
def get_trade_in_history():
    """
    Get customer's trade-in history.

    Query params:
        limit: Number of records (default 10, max 50)
        offset: Pagination offset

    Returns:
        List of trade-in batches with summary
    """
    member, error, status = get_member_from_customer_token()
    if error:
        return jsonify(error), status

    limit = min(request.args.get('limit', 10, type=int), 50)
    offset = request.args.get('offset', 0, type=int)

    batches = TradeInBatch.query.filter_by(
        member_id=member.id
    ).order_by(
        TradeInBatch.created_at.desc()
    ).offset(offset).limit(limit).all()

    total = TradeInBatch.query.filter_by(member_id=member.id).count()

    return jsonify({
        'trade_ins': [{
            'id': batch.id,
            'batch_reference': batch.batch_reference,
            'status': batch.status,
            'category': batch.category,
            'total_items': batch.total_items,
            'trade_value': float(batch.total_trade_value or 0),
            'bonus_amount': float(batch.bonus_amount or 0),
            'created_at': batch.created_at.isoformat() if batch.created_at else None,
            'completed_at': batch.completed_at.isoformat() if batch.completed_at else None
        } for batch in batches],
        'pagination': {
            'total': total,
            'limit': limit,
            'offset': offset,
            'has_more': offset + limit < total
        }
    })


@customer_account_bp.route('/trade-ins/<batch_reference>', methods=['GET'])
def get_trade_in_detail(batch_reference):
    """
    Get details of a specific trade-in batch.

    Returns:
        Batch details with items
    """
    member, error, status = get_member_from_customer_token()
    if error:
        return jsonify(error), status

    batch = TradeInBatch.query.filter_by(
        member_id=member.id,
        batch_reference=batch_reference
    ).first()

    if not batch:
        return jsonify({'error': 'Trade-in not found'}), 404

    items = [{
        'id': item.id,
        'product_title': item.product_title,
        'product_sku': item.product_sku,
        'trade_value': float(item.trade_value or 0),
        'market_value': float(item.market_value) if item.market_value else None,
        'listed_date': item.listed_date.isoformat() if item.listed_date else None,
        'sold_date': item.sold_date.isoformat() if item.sold_date else None
    } for item in batch.items]

    return jsonify({
        'batch': {
            'id': batch.id,
            'batch_reference': batch.batch_reference,
            'status': batch.status,
            'category': batch.category,
            'total_items': batch.total_items,
            'trade_value': float(batch.total_trade_value or 0),
            'bonus_amount': float(batch.bonus_amount or 0),
            'created_at': batch.created_at.isoformat() if batch.created_at else None,
            'completed_at': batch.completed_at.isoformat() if batch.completed_at else None,
            'notes': batch.notes
        },
        'items': items
    })


@customer_account_bp.route('/activity', methods=['GET'])
def get_activity_feed():
    """
    Get recent activity (trade-ins, credits, tier changes).

    Query params:
        limit: Number of records (default 20, max 100)

    Returns:
        Combined activity feed
    """
    member, error, status = get_member_from_customer_token()
    if error:
        return jsonify(error), status

    limit = min(request.args.get('limit', 20, type=int), 100)

    # Get recent trade-ins
    trade_ins = TradeInBatch.query.filter_by(
        member_id=member.id
    ).order_by(
        TradeInBatch.created_at.desc()
    ).limit(limit).all()

    # Build activity feed
    activities = []

    for batch in trade_ins:
        # Trade-in created
        activities.append({
            'type': 'trade_in_created',
            'date': batch.created_at.isoformat() if batch.created_at else None,
            'data': {
                'batch_reference': batch.batch_reference,
                'item_count': batch.total_items,
                'trade_value': float(batch.total_trade_value or 0),
                'category': batch.category
            }
        })

        # Trade-in completed
        if batch.status == 'completed' and batch.completed_at:
            activities.append({
                'type': 'trade_in_completed',
                'date': batch.completed_at.isoformat(),
                'data': {
                    'batch_reference': batch.batch_reference,
                    'trade_value': float(batch.total_trade_value or 0),
                    'bonus_amount': float(batch.bonus_amount or 0)
                }
            })

    # Sort by date descending
    activities.sort(key=lambda x: x['date'] or '', reverse=True)

    return jsonify({
        'activities': activities[:limit]
    })


# ==================== Proxy Endpoint for Customer Account Extension ====================
# This endpoint is called by the Shopify Customer Account Extension

@customer_account_bp.route('/extension/data', methods=['POST'])
def get_extension_data():
    """
    Get all data needed for the Customer Account Extension in one call.

    Request body:
        customer_id: Shopify customer ID
        shop: Shop domain

    Returns:
        Combined data for the extension UI
    """
    data = request.json or {}
    customer_id = data.get('customer_id')
    shop = data.get('shop')

    if not customer_id:
        return jsonify({'error': 'Missing customer_id'}), 400

    # Find member
    member = Member.query.filter_by(
        shopify_customer_id=str(customer_id)
    ).first()

    if not member:
        return jsonify({
            'is_member': False,
            'message': 'Not enrolled in rewards program'
        })

    # Get tier info
    tier = member.tier
    tier_info = None
    if tier:
        tier_info = {
            'name': tier.name,
            'bonus_percent': float(tier.bonus_rate * 100),
            'benefits': tier.benefits or {}
        }

    # Get recent trade-ins
    recent_trade_ins = TradeInBatch.query.filter_by(
        member_id=member.id
    ).order_by(
        TradeInBatch.created_at.desc()
    ).limit(5).all()

    # Calculate store credit balance from ledger
    store_credit_balance = db.session.query(
        db.func.sum(StoreCreditLedger.amount)
    ).filter(
        StoreCreditLedger.member_id == member.id
    ).scalar() or Decimal('0')

    return jsonify({
        'is_member': True,
        'member': {
            'member_number': member.member_number,
            'name': member.name,
            'tier': tier_info,
            'member_since': member.membership_start_date.isoformat() if member.membership_start_date else None,
        },
        'stats': {
            'total_trade_ins': member.total_trade_ins or 0,
            'total_trade_value': float(member.total_trade_value or 0),
            'total_bonus_earned': float(member.total_bonus_earned or 0),
            'store_credit_balance': float(store_credit_balance)
        },
        'recent_trade_ins': [{
            'batch_reference': batch.batch_reference,
            'status': batch.status,
            'trade_value': float(batch.total_trade_value or 0),
            'bonus_amount': float(batch.bonus_amount or 0),
            'created_at': batch.created_at.isoformat() if batch.created_at else None
        } for batch in recent_trade_ins]
    })
