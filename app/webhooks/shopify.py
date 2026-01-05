"""
Shopify Webhook Handler for TradeUp.

Handles:
1. order/created - Membership purchases and cashback processing
2. customer/updated - Sync customer info to member records

NOTE: This is a stub. Full implementation pending integration with
ShopifyClient methods (verify_webhook, add_customer_tags, etc.)
"""

from flask import Blueprint, jsonify, current_app


webhooks_bp = Blueprint('shopify_webhook', __name__)


@webhooks_bp.route('/order-created', methods=['POST'])
def handle_order_created():
    """
    Handle Shopify order/created webhook.

    TODO: Implement:
    - Membership product detection and member creation
    - Cashback processing for existing members
    """
    current_app.logger.info("Order webhook received - handler not yet implemented")
    return jsonify({'status': 'received', 'message': 'Handler pending implementation'}), 200


@webhooks_bp.route('/customer-updated', methods=['POST'])
def handle_customer_updated():
    """
    Handle Shopify customer update webhook.

    TODO: Implement customer sync to member records.
    """
    current_app.logger.info("Customer update webhook received - handler not yet implemented")
    return jsonify({'status': 'received', 'message': 'Handler pending implementation'}), 200
