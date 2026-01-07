"""
Shopify Flow API Routes.

Handles Flow action requests from Shopify Flow workflows.
Flow actions allow merchants to automate loyalty operations.

Available actions:
- POST /flow/actions/add-credit - Add store credit to a customer
- POST /flow/actions/change-tier - Change a member's tier
- POST /flow/actions/get-member - Get member information
"""
from flask import Blueprint, request, jsonify, g
from functools import wraps
import hmac
import hashlib
import base64

from ..middleware.shopify_auth import require_shopify_auth, get_shop_from_request
from ..models import Tenant

flow_bp = Blueprint('flow', __name__)


def require_flow_auth(f):
    """
    Authenticate Shopify Flow requests.

    Flow requests include HMAC signature for verification.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get shop from request
        shop = get_shop_from_request()
        if not shop:
            # Try to get from request body
            data = request.get_json(silent=True) or {}
            shop = data.get('shop_domain') or data.get('shopDomain')

        if not shop:
            return jsonify({'error': 'Shop domain required'}), 400

        tenant = Tenant.query.filter_by(shopify_domain=shop).first()
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404

        g.tenant_id = tenant.id
        g.tenant = tenant
        g.shop = shop

        # Verify HMAC if present
        hmac_header = request.headers.get('X-Shopify-Hmac-Sha256')
        if hmac_header and tenant.shopify_secret:
            body = request.get_data()
            computed = base64.b64encode(
                hmac.new(
                    tenant.shopify_secret.encode('utf-8'),
                    body,
                    hashlib.sha256
                ).digest()
            ).decode('utf-8')

            if not hmac.compare_digest(computed, hmac_header):
                return jsonify({'error': 'Invalid signature'}), 401

        return f(*args, **kwargs)

    return decorated_function


# ==================== Flow Actions ====================

@flow_bp.route('/actions/add-credit', methods=['POST'])
@require_flow_auth
def action_add_credit():
    """
    Flow Action: Add store credit to a customer.

    Request body:
        customer_email: Email of the customer
        amount: Credit amount to add
        reason: Optional reason/description

    Returns:
        success: Whether credit was added
        new_balance: Updated credit balance
    """
    data = request.get_json()

    customer_email = data.get('customer_email') or data.get('customerEmail')
    amount = data.get('amount')
    reason = data.get('reason', 'Shopify Flow automation')

    if not customer_email:
        return jsonify({
            'success': False,
            'error': 'customer_email is required'
        }), 400

    if not amount or float(amount) <= 0:
        return jsonify({
            'success': False,
            'error': 'Valid amount is required'
        }), 400

    try:
        from ..services.flow_service import FlowService
        from ..services.shopify_client import ShopifyClient

        client = ShopifyClient(g.tenant_id)
        flow_svc = FlowService(g.tenant_id, client)

        result = flow_svc.action_add_credit(
            customer_email=customer_email,
            amount=float(amount),
            reason=reason
        )

        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@flow_bp.route('/actions/change-tier', methods=['POST'])
@require_flow_auth
def action_change_tier():
    """
    Flow Action: Change a member's tier.

    Request body:
        customer_email: Email of the customer
        new_tier: Name of the new tier (Bronze, Silver, Gold)
        reason: Optional reason for the change

    Returns:
        success: Whether tier was changed
        old_tier: Previous tier name
        new_tier: New tier name
    """
    data = request.get_json()

    customer_email = data.get('customer_email') or data.get('customerEmail')
    new_tier = data.get('new_tier') or data.get('newTier') or data.get('tier')
    reason = data.get('reason', 'Shopify Flow automation')

    if not customer_email:
        return jsonify({
            'success': False,
            'error': 'customer_email is required'
        }), 400

    if not new_tier:
        return jsonify({
            'success': False,
            'error': 'new_tier is required'
        }), 400

    try:
        from ..services.flow_service import FlowService
        from ..services.shopify_client import ShopifyClient

        client = ShopifyClient(g.tenant_id)
        flow_svc = FlowService(g.tenant_id, client)

        result = flow_svc.action_change_tier(
            customer_email=customer_email,
            new_tier_name=new_tier,
            reason=reason
        )

        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@flow_bp.route('/actions/get-member', methods=['POST'])
@require_flow_auth
def action_get_member():
    """
    Flow Action: Get member information.

    Request body:
        customer_email: Email of the customer

    Returns:
        is_member: Whether customer is a member
        member: Member details (if found)
    """
    data = request.get_json()

    customer_email = data.get('customer_email') or data.get('customerEmail')

    if not customer_email:
        return jsonify({
            'success': False,
            'error': 'customer_email is required'
        }), 400

    try:
        from ..services.flow_service import FlowService

        flow_svc = FlowService(g.tenant_id)
        result = flow_svc.action_get_member(customer_email=customer_email)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== Flow Trigger Endpoints ====================
# These are called by Shopify to get trigger schema/configuration

@flow_bp.route('/triggers/member-enrolled', methods=['GET'])
def trigger_member_enrolled_schema():
    """Return schema for member enrolled trigger."""
    return jsonify({
        'name': 'TradeUp: Member Enrolled',
        'description': 'Triggered when a new member enrolls in the loyalty program',
        'properties': [
            {'name': 'member_id', 'type': 'number', 'description': 'Internal member ID'},
            {'name': 'member_number', 'type': 'string', 'description': 'Member number (e.g., TU1001)'},
            {'name': 'email', 'type': 'string', 'description': 'Member email address'},
            {'name': 'tier_name', 'type': 'string', 'description': 'Initial tier name'},
            {'name': 'shopify_customer_id', 'type': 'string', 'description': 'Shopify customer GID'}
        ]
    })


@flow_bp.route('/triggers/tier-changed', methods=['GET'])
def trigger_tier_changed_schema():
    """Return schema for tier changed trigger."""
    return jsonify({
        'name': 'TradeUp: Tier Changed',
        'description': 'Triggered when a member\'s tier is upgraded or downgraded',
        'properties': [
            {'name': 'member_id', 'type': 'number', 'description': 'Internal member ID'},
            {'name': 'member_number', 'type': 'string', 'description': 'Member number'},
            {'name': 'email', 'type': 'string', 'description': 'Member email address'},
            {'name': 'old_tier', 'type': 'string', 'description': 'Previous tier name'},
            {'name': 'new_tier', 'type': 'string', 'description': 'New tier name'},
            {'name': 'change_type', 'type': 'string', 'description': 'upgrade or downgrade'},
            {'name': 'source', 'type': 'string', 'description': 'What triggered the change'},
            {'name': 'shopify_customer_id', 'type': 'string', 'description': 'Shopify customer GID'}
        ]
    })


@flow_bp.route('/triggers/trade-in-completed', methods=['GET'])
def trigger_trade_in_completed_schema():
    """Return schema for trade-in completed trigger."""
    return jsonify({
        'name': 'TradeUp: Trade-In Completed',
        'description': 'Triggered when a trade-in batch is completed',
        'properties': [
            {'name': 'member_id', 'type': 'number', 'description': 'Internal member ID'},
            {'name': 'member_number', 'type': 'string', 'description': 'Member number'},
            {'name': 'email', 'type': 'string', 'description': 'Member email address'},
            {'name': 'batch_reference', 'type': 'string', 'description': 'Trade-in batch reference'},
            {'name': 'trade_value', 'type': 'number', 'description': 'Base trade value'},
            {'name': 'bonus_amount', 'type': 'number', 'description': 'Tier bonus amount'},
            {'name': 'total_credit', 'type': 'number', 'description': 'Total credit issued'},
            {'name': 'item_count', 'type': 'number', 'description': 'Number of items'},
            {'name': 'category', 'type': 'string', 'description': 'Trade-in category'},
            {'name': 'shopify_customer_id', 'type': 'string', 'description': 'Shopify customer GID'}
        ]
    })


@flow_bp.route('/triggers/credit-issued', methods=['GET'])
def trigger_credit_issued_schema():
    """Return schema for credit issued trigger."""
    return jsonify({
        'name': 'TradeUp: Store Credit Issued',
        'description': 'Triggered when store credit is added to a member\'s account',
        'properties': [
            {'name': 'member_id', 'type': 'number', 'description': 'Internal member ID'},
            {'name': 'member_number', 'type': 'string', 'description': 'Member number'},
            {'name': 'email', 'type': 'string', 'description': 'Member email address'},
            {'name': 'amount', 'type': 'number', 'description': 'Credit amount added'},
            {'name': 'event_type', 'type': 'string', 'description': 'Type of credit event'},
            {'name': 'description', 'type': 'string', 'description': 'Credit description'},
            {'name': 'new_balance', 'type': 'number', 'description': 'New credit balance'},
            {'name': 'shopify_customer_id', 'type': 'string', 'description': 'Shopify customer GID'}
        ]
    })
