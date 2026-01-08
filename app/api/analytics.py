"""
Analytics API endpoints for TradeUp.

Provides comprehensive analytics and reporting data for the dashboard.
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from sqlalchemy import func, and_, extract
from ..extensions import db
from ..models.member import Member, MembershipTier
from ..models.trade_in import TradeInBatch, TradeInItem
from ..models.promotions import StoreCreditLedger
from ..models.tenant import Tenant
from ..middleware.shopify_auth import require_shopify_auth

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
@require_shopify_auth
def get_dashboard_analytics():
    """
    Get comprehensive analytics for the dashboard.

    Query params:
        period: '7', '30', '90', '365', 'all' (default: '30')
    """
    tenant_id = g.tenant_id
    period = request.args.get('period', '30')

    # Calculate date range
    end_date = datetime.utcnow()
    if period == 'all':
        start_date = datetime(2000, 1, 1)
    else:
        days = int(period)
        start_date = end_date - timedelta(days=days)

    # Previous period for comparison
    previous_start = start_date - timedelta(days=(end_date - start_date).days)

    try:
        # Get member statistics
        total_members = db.session.query(func.count(Member.id)).filter(
            Member.tenant_id == tenant_id
        ).scalar() or 0

        active_members = db.session.query(func.count(Member.id)).filter(
            Member.tenant_id == tenant_id,
            Member.status == 'active'
        ).scalar() or 0

        new_members_this_period = db.session.query(func.count(Member.id)).filter(
            Member.tenant_id == tenant_id,
            Member.created_at >= start_date
        ).scalar() or 0

        new_members_previous = db.session.query(func.count(Member.id)).filter(
            Member.tenant_id == tenant_id,
            Member.created_at >= previous_start,
            Member.created_at < start_date
        ).scalar() or 0

        # Calculate growth percentage
        if new_members_previous > 0:
            member_growth_pct = ((new_members_this_period - new_members_previous) / new_members_previous) * 100
        else:
            member_growth_pct = 100 if new_members_this_period > 0 else 0

        # Get trade-in statistics
        total_trade_ins = db.session.query(func.count(TradeInBatch.id)).filter(
            TradeInBatch.tenant_id == tenant_id
        ).scalar() or 0

        trade_ins_this_period = db.session.query(func.count(TradeInBatch.id)).filter(
            TradeInBatch.tenant_id == tenant_id,
            TradeInBatch.created_at >= start_date
        ).scalar() or 0

        trade_in_value_this_period = db.session.query(
            func.coalesce(func.sum(TradeInBatch.total_credit_amount), 0)
        ).filter(
            TradeInBatch.tenant_id == tenant_id,
            TradeInBatch.created_at >= start_date
        ).scalar() or 0

        # Get store credit statistics
        total_credit_issued = db.session.query(
            func.coalesce(func.sum(StoreCreditLedger.amount), 0)
        ).filter(
            StoreCreditLedger.tenant_id == tenant_id,
            StoreCreditLedger.amount > 0
        ).scalar() or 0

        credit_this_period = db.session.query(
            func.coalesce(func.sum(StoreCreditLedger.amount), 0)
        ).filter(
            StoreCreditLedger.tenant_id == tenant_id,
            StoreCreditLedger.amount > 0,
            StoreCreditLedger.created_at >= start_date
        ).scalar() or 0

        # Get referral statistics
        total_referrals = db.session.query(func.count(Member.id)).filter(
            Member.tenant_id == tenant_id,
            Member.referred_by_id.isnot(None)
        ).scalar() or 0

        referrals_this_period = db.session.query(func.count(Member.id)).filter(
            Member.tenant_id == tenant_id,
            Member.referred_by_id.isnot(None),
            Member.created_at >= start_date
        ).scalar() or 0

        # Get tier distribution
        tier_distribution = []
        tiers_with_counts = db.session.query(
            MembershipTier.name,
            func.count(Member.id).label('count')
        ).outerjoin(
            Member, and_(
                Member.tier_id == MembershipTier.id,
                Member.tenant_id == tenant_id
            )
        ).filter(
            MembershipTier.tenant_id == tenant_id,
            MembershipTier.is_active == True
        ).group_by(MembershipTier.id, MembershipTier.name).all()

        for tier_name, count in tiers_with_counts:
            percentage = (count / total_members * 100) if total_members > 0 else 0
            tier_distribution.append({
                'tier_name': tier_name,
                'member_count': count,
                'percentage': round(percentage, 1),
                'color': '#5C6AC4'  # Shopify purple
            })

        # Get top members by trade-in activity
        top_members = db.session.query(
            Member.id,
            Member.member_number,
            func.coalesce(Member.first_name, '').label('first_name'),
            func.coalesce(Member.last_name, '').label('last_name'),
            func.count(TradeInBatch.id).label('trade_in_count'),
            func.coalesce(func.sum(TradeInBatch.total_credit_amount), 0).label('total_credit')
        ).outerjoin(
            TradeInBatch, TradeInBatch.member_id == Member.id
        ).filter(
            Member.tenant_id == tenant_id
        ).group_by(
            Member.id, Member.member_number, Member.first_name, Member.last_name
        ).order_by(
            func.count(TradeInBatch.id).desc()
        ).limit(10).all()

        top_members_list = []
        for m in top_members:
            # Count referrals for this member
            referral_count = db.session.query(func.count(Member.id)).filter(
                Member.referred_by_id == m.id
            ).scalar() or 0

            name = f"{m.first_name} {m.last_name}".strip() or m.member_number
            top_members_list.append({
                'id': m.id,
                'member_number': m.member_number,
                'name': name,
                'total_trade_ins': m.trade_in_count,
                'total_credit_earned': float(m.total_credit),
                'referral_count': referral_count
            })

        # Get category performance (top categories by trade-in count)
        category_performance = db.session.query(
            TradeInItem.category,
            func.count(TradeInItem.id).label('item_count'),
            func.coalesce(func.sum(TradeInItem.credit_amount), 0).label('total_value')
        ).join(
            TradeInBatch, TradeInBatch.id == TradeInItem.batch_id
        ).filter(
            TradeInBatch.tenant_id == tenant_id,
            TradeInItem.category.isnot(None)
        ).group_by(
            TradeInItem.category
        ).order_by(
            func.count(TradeInItem.id).desc()
        ).limit(5).all()

        category_list = []
        for cat in category_performance:
            avg_value = float(cat.total_value) / cat.item_count if cat.item_count > 0 else 0
            category_list.append({
                'category_name': cat.category or 'Uncategorized',
                'trade_in_count': cat.item_count,
                'total_value': float(cat.total_value),
                'avg_value': avg_value
            })

        return jsonify({
            'overview': {
                'total_members': total_members,
                'active_members': active_members,
                'new_members_this_month': new_members_this_period,
                'member_growth_pct': round(member_growth_pct, 1),
                'total_trade_ins': total_trade_ins,
                'trade_ins_this_month': trade_ins_this_period,
                'trade_in_value_this_month': float(trade_in_value_this_period),
                'total_store_credit_issued': float(total_credit_issued),
                'store_credit_this_month': float(credit_this_period),
                'total_referrals': total_referrals,
                'referrals_this_month': referrals_this_period
            },
            'tier_distribution': tier_distribution,
            'top_members': top_members_list,
            'category_performance': category_list,
            'monthly_trends': []  # TODO: Implement monthly trends
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analytics_bp.route('/export', methods=['GET'])
@require_shopify_auth
def export_analytics():
    """
    Export analytics data as CSV.

    Query params:
        type: 'members', 'trade_ins', 'credits', 'summary'
        period: '7', '30', '90', '365', 'all'
    """
    tenant_id = g.tenant_id
    export_type = request.args.get('type', 'summary')
    period = request.args.get('period', '30')

    # Calculate date range
    end_date = datetime.utcnow()
    if period == 'all':
        start_date = datetime(2000, 1, 1)
    else:
        days = int(period)
        start_date = end_date - timedelta(days=days)

    # TODO: Implement CSV export
    return jsonify({
        'message': 'Export functionality coming soon',
        'type': export_type,
        'period': period
    })
