"""
Bonuses API endpoints.

Provides access to pending and completed bonus credit transactions.
"""
from flask import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy import func
from ..extensions import db
from ..models import Member, StoreCreditLedger, BulkCreditOperation

bonuses_bp = Blueprint('bonuses', __name__)


@bonuses_bp.route('', methods=['GET'])
def list_bonuses():
    """
    List bonus credit transactions (pending and completed).

    Query params:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - status: Filter - 'pending', 'completed', or 'all'
        - event_type: Filter by event type (e.g., 'promotion', 'bulk', 'referral')
        - member_id: Filter by specific member
    """
    try:
        tenant_id = int(request.headers.get('X-Tenant-ID', 1))

        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status', 'all')
        event_type = request.args.get('event_type')
        member_id = request.args.get('member_id', type=int)

        # Query bonuses (positive credit amounts from promotional events)
        query = (
            StoreCreditLedger.query
            .join(Member, StoreCreditLedger.member_id == Member.id)
            .filter(
                Member.tenant_id == tenant_id,
                StoreCreditLedger.amount > 0  # Only credits (positive)
            )
        )

        # Filter by status - pending means not synced to Shopify yet
        if status == 'pending':
            query = query.filter(StoreCreditLedger.synced_to_shopify == False)
        elif status == 'completed':
            query = query.filter(StoreCreditLedger.synced_to_shopify == True)

        # Filter by event type
        if event_type:
            query = query.filter(StoreCreditLedger.event_type == event_type)

        # Filter by member
        if member_id:
            query = query.filter(StoreCreditLedger.member_id == member_id)

        # Get total count before pagination
        total = query.count()

        # Paginate
        pagination = query.order_by(
            StoreCreditLedger.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        # Build response with member info
        bonuses = []
        for entry in pagination.items:
            try:
                bonus_data = entry.to_dict()
                # Add member info
                if entry.member:
                    bonus_data['member'] = {
                        'id': entry.member.id,
                        'name': entry.member.name,
                        'email': entry.member.email,
                        'member_number': entry.member.member_number,
                        'tier': entry.member.tier.name if entry.member.tier else None
                    }
                bonuses.append(bonus_data)
            except Exception as e:
                # Fallback for serialization errors
                bonuses.append({
                    'id': entry.id,
                    'amount': float(entry.amount or 0),
                    'event_type': entry.event_type,
                    'created_at': entry.created_at.isoformat() if entry.created_at else None,
                    'error': str(e)
                })

        return jsonify({
            'bonuses': bonuses,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page if per_page > 0 else 0
        })

    except Exception as e:
        import traceback
        print(f"[Bonuses] Error listing bonuses: {e}")
        traceback.print_exc()
        return jsonify({
            'bonuses': [],
            'total': 0,
            'page': 1,
            'per_page': 20,
            'pages': 0,
            'error': str(e)
        }), 200


@bonuses_bp.route('/stats', methods=['GET'])
def get_bonus_stats():
    """Get bonus statistics overview."""
    try:
        tenant_id = int(request.headers.get('X-Tenant-ID', 1))

        # Total bonuses issued
        total_result = db.session.query(
            func.count(StoreCreditLedger.id).label('count'),
            func.coalesce(func.sum(StoreCreditLedger.amount), 0).label('total')
        ).join(Member).filter(
            Member.tenant_id == tenant_id,
            StoreCreditLedger.amount > 0
        ).first()

        # Pending (not synced to Shopify)
        pending_result = db.session.query(
            func.count(StoreCreditLedger.id).label('count'),
            func.coalesce(func.sum(StoreCreditLedger.amount), 0).label('total')
        ).join(Member).filter(
            Member.tenant_id == tenant_id,
            StoreCreditLedger.amount > 0,
            StoreCreditLedger.synced_to_shopify == False
        ).first()

        # By event type
        by_type = db.session.query(
            StoreCreditLedger.event_type,
            func.count(StoreCreditLedger.id).label('count'),
            func.coalesce(func.sum(StoreCreditLedger.amount), 0).label('total')
        ).join(Member).filter(
            Member.tenant_id == tenant_id,
            StoreCreditLedger.amount > 0
        ).group_by(StoreCreditLedger.event_type).all()

        return jsonify({
            'total': {
                'count': total_result.count if total_result else 0,
                'amount': float(total_result.total) if total_result else 0
            },
            'pending': {
                'count': pending_result.count if pending_result else 0,
                'amount': float(pending_result.total) if pending_result else 0
            },
            'by_type': {
                row.event_type: {
                    'count': row.count,
                    'amount': float(row.total)
                } for row in by_type
            }
        })

    except Exception as e:
        import traceback
        print(f"[Bonuses] Error getting stats: {e}")
        traceback.print_exc()
        return jsonify({
            'total': {'count': 0, 'amount': 0},
            'pending': {'count': 0, 'amount': 0},
            'by_type': {},
            'error': str(e)
        }), 200


@bonuses_bp.route('/<int:bonus_id>/sync', methods=['POST'])
def sync_bonus(bonus_id):
    """Mark a bonus as synced to Shopify."""
    try:
        tenant_id = int(request.headers.get('X-Tenant-ID', 1))

        # Get bonus and verify tenant
        bonus = (
            StoreCreditLedger.query
            .join(Member)
            .filter(
                StoreCreditLedger.id == bonus_id,
                Member.tenant_id == tenant_id
            )
            .first_or_404()
        )

        data = request.json or {}
        bonus.synced_to_shopify = True
        bonus.shopify_credit_id = data.get('shopify_credit_id')

        db.session.commit()

        return jsonify(bonus.to_dict())

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bonuses_bp.route('/bulk-operations', methods=['GET'])
def list_bulk_operations():
    """List bulk credit operations."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')

        query = BulkCreditOperation.query

        if status:
            query = query.filter(BulkCreditOperation.status == status)

        pagination = query.order_by(
            BulkCreditOperation.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'operations': [op.to_dict() for op in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page
        })

    except Exception as e:
        import traceback
        print(f"[Bonuses] Error listing bulk operations: {e}")
        traceback.print_exc()
        return jsonify({
            'operations': [],
            'total': 0,
            'page': 1,
            'per_page': 20,
            'error': str(e)
        }), 200
