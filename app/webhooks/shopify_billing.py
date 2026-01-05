"""
Shopify Billing webhook endpoint.
Handles subscription and purchase events from Shopify.
"""
import os
import hmac
import hashlib
import base64
from flask import Blueprint, request, jsonify
from ..services.shopify_billing import ShopifyBillingWebhookHandler

shopify_billing_webhook_bp = Blueprint('shopify_billing_webhook', __name__)


def verify_shopify_webhook(data: bytes, hmac_header: str) -> bool:
    """
    Verify that webhook request came from Shopify.

    Args:
        data: Raw request body
        hmac_header: X-Shopify-Hmac-SHA256 header value

    Returns:
        True if signature is valid
    """
    secret = os.getenv('SHOPIFY_WEBHOOK_SECRET', '')
    if not secret:
        # In development, skip verification
        return os.getenv('FLASK_ENV') == 'development'

    digest = hmac.new(
        secret.encode('utf-8'),
        data,
        hashlib.sha256
    ).digest()

    computed_hmac = base64.b64encode(digest).decode()
    return hmac.compare_digest(computed_hmac, hmac_header)


@shopify_billing_webhook_bp.route('/subscriptions', methods=['POST'])
def handle_subscription_webhook():
    """
    Handle APP_SUBSCRIPTIONS_UPDATE webhook.

    Triggered when:
    - Subscription is activated (merchant approves)
    - Subscription is cancelled
    - Subscription expires
    - Subscription is declined
    """
    # Verify webhook signature
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256', '')
    if not verify_shopify_webhook(request.get_data(), hmac_header):
        return jsonify({'error': 'Invalid signature'}), 401

    payload = request.get_json()

    # Get shop domain from headers
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')

    # Find tenant by shop domain
    from ..models import Tenant
    tenant = Tenant.query.filter_by(shopify_domain=shop_domain).first()

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    # Process webhook
    handler = ShopifyBillingWebhookHandler(tenant.id)
    result = handler.handle_subscription_update(payload)

    print(f"[Shopify Billing] Subscription update for {shop_domain}: {result}")

    return jsonify(result)


@shopify_billing_webhook_bp.route('/purchases', methods=['POST'])
def handle_purchase_webhook():
    """
    Handle APP_PURCHASES_ONE_TIME_UPDATE webhook.

    Triggered when one-time purchase status changes.
    """
    # Verify webhook signature
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256', '')
    if not verify_shopify_webhook(request.get_data(), hmac_header):
        return jsonify({'error': 'Invalid signature'}), 401

    payload = request.get_json()
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')

    from ..models import Tenant
    tenant = Tenant.query.filter_by(shopify_domain=shop_domain).first()

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    handler = ShopifyBillingWebhookHandler(tenant.id)
    result = handler.handle_one_time_purchase_update(payload)

    print(f"[Shopify Billing] Purchase update for {shop_domain}: {result}")

    return jsonify(result)


@shopify_billing_webhook_bp.route('/usage-alert', methods=['POST'])
def handle_usage_alert_webhook():
    """
    Handle APP_SUBSCRIPTIONS_APPROACHING_CAPPED_AMOUNT webhook.

    Triggered when usage-based billing reaches 90% of cap.
    """
    # Verify webhook signature
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256', '')
    if not verify_shopify_webhook(request.get_data(), hmac_header):
        return jsonify({'error': 'Invalid signature'}), 401

    payload = request.get_json()
    shop_domain = request.headers.get('X-Shopify-Shop-Domain', '')

    from ..models import Tenant
    tenant = Tenant.query.filter_by(shopify_domain=shop_domain).first()

    if not tenant:
        return jsonify({'error': 'Unknown shop'}), 404

    handler = ShopifyBillingWebhookHandler(tenant.id)
    result = handler.handle_approaching_capped_amount(payload)

    print(f"[Shopify Billing] Usage alert for {shop_domain}: {result}")

    return jsonify(result)


@shopify_billing_webhook_bp.route('/test', methods=['GET'])
def test_webhook():
    """Test endpoint to verify webhook route is accessible."""
    return jsonify({
        'status': 'ok',
        'message': 'Shopify billing webhook endpoint is accessible',
        'webhook_secret_configured': bool(os.getenv('SHOPIFY_WEBHOOK_SECRET'))
    })
