"""
Pending Distribution API endpoints.

Handles the approval workflow for monthly credit distributions:
- List pending distributions
- View pending distribution details
- Approve/reject distributions
- Manage auto-approve settings
"""

from flask import Blueprint, request, jsonify, g
from ..middleware.shopify_auth import require_shopify_auth
from ..services.pending_distribution_service import pending_distribution_service

pending_distributions_bp = Blueprint('pending_distributions', __name__)


# ==================== LIST & GET ====================

@pending_distributions_bp.route('', methods=['GET'])
@require_shopify_auth
def list_pending_distributions():
    """
    List pending distributions for the current tenant.

    Query params:
        status: Filter by status ('pending', 'approved', 'rejected', 'expired')
        include_all: Include expired items (default: false)
    """
    tenant_id = g.tenant_id
    status = request.args.get('status')
    include_all = request.args.get('include_all', 'false').lower() == 'true'

    distributions = pending_distribution_service.get_pending_distributions(
        tenant_id=tenant_id,
        status=status,
        include_expired=include_all
    )

    return jsonify({
        'distributions': [d.to_dict() for d in distributions],
        'pending_count': pending_distribution_service.get_pending_count(tenant_id)
    })


@pending_distributions_bp.route('/<int:pending_id>', methods=['GET'])
@require_shopify_auth
def get_pending_distribution(pending_id: int):
    """
    Get a specific pending distribution with full details.

    Query params:
        include_members: Include full member list (default: false)
    """
    tenant_id = g.tenant_id
    include_members = request.args.get('include_members', 'false').lower() == 'true'

    pending = pending_distribution_service.get_pending_by_id(pending_id, tenant_id)

    if not pending:
        return jsonify({'error': 'Pending distribution not found'}), 404

    return jsonify(pending.to_dict(include_members=include_members))


@pending_distributions_bp.route('/count', methods=['GET'])
@require_shopify_auth
def get_pending_count():
    """Get count of pending distributions awaiting approval."""
    tenant_id = g.tenant_id
    count = pending_distribution_service.get_pending_count(tenant_id)

    return jsonify({'pending_count': count})


# ==================== CREATE ====================

@pending_distributions_bp.route('/create-monthly', methods=['POST'])
@require_shopify_auth
def create_monthly_pending():
    """
    Create a pending distribution for monthly credits.

    This is called by the scheduler or manually by admin.
    Generates preview data and creates a pending record.
    """
    tenant_id = g.tenant_id

    try:
        pending = pending_distribution_service.create_monthly_credit_pending(tenant_id)

        # Send notification
        pending_distribution_service.send_approval_notification(pending)

        return jsonify({
            'success': True,
            'message': f"Pending distribution created for {pending.display_name}",
            'distribution': pending.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create pending distribution: {str(e)}'}), 500


# ==================== APPROVE / REJECT ====================

@pending_distributions_bp.route('/<int:pending_id>/approve', methods=['POST'])
@require_shopify_auth
def approve_distribution(pending_id: int):
    """
    Approve and execute a pending distribution.

    Request body:
        enable_auto_approve: Optional boolean to enable auto-approve for future
    """
    tenant_id = g.tenant_id
    data = request.get_json() or {}

    enable_auto_approve = data.get('enable_auto_approve', False)

    # Get approver email from session or use a default
    approved_by = g.get('user_email') or g.get('shop_domain') or 'admin'

    try:
        result = pending_distribution_service.approve_distribution(
            pending_id=pending_id,
            tenant_id=tenant_id,
            approved_by=approved_by,
            enable_auto_approve=enable_auto_approve
        )

        execution = result.get('execution_result', {})

        return jsonify({
            'success': True,
            'message': f"Successfully distributed ${execution.get('total_amount', 0):,.2f} to {execution.get('credited', 0)} members",
            'result': result
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to approve distribution: {str(e)}'}), 500


@pending_distributions_bp.route('/<int:pending_id>/reject', methods=['POST'])
@require_shopify_auth
def reject_distribution(pending_id: int):
    """
    Reject a pending distribution.

    Request body:
        reason: Optional string explaining why it was rejected
    """
    tenant_id = g.tenant_id
    data = request.get_json() or {}

    reason = data.get('reason')
    rejected_by = g.get('user_email') or g.get('shop_domain') or 'admin'

    try:
        result = pending_distribution_service.reject_distribution(
            pending_id=pending_id,
            tenant_id=tenant_id,
            rejected_by=rejected_by,
            reason=reason
        )

        return jsonify({
            'success': True,
            'message': 'Distribution rejected',
            'result': result
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to reject distribution: {str(e)}'}), 500


# ==================== SETTINGS ====================

@pending_distributions_bp.route('/settings', methods=['GET'])
@require_shopify_auth
def get_settings():
    """Get auto-approve settings for the tenant."""
    tenant_id = g.tenant_id

    settings = pending_distribution_service.get_auto_approve_settings(tenant_id)

    return jsonify(settings)


@pending_distributions_bp.route('/settings', methods=['PUT'])
@require_shopify_auth
def update_settings():
    """
    Update auto-approve settings.

    Request body:
        enabled: Boolean to enable/disable auto-approve
        notification_emails: Array of emails to notify
        threshold: Optional max amount to auto-approve
    """
    tenant_id = g.tenant_id
    data = request.get_json() or {}

    try:
        settings = pending_distribution_service.update_auto_approve_settings(
            tenant_id=tenant_id,
            enabled=data.get('enabled'),
            notification_emails=data.get('notification_emails'),
            threshold=data.get('threshold')
        )

        return jsonify({
            'success': True,
            'settings': settings
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to update settings: {str(e)}'}), 500
