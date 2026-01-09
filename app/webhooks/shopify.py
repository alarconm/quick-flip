"""
Shopify Webhook Handler - Legacy/Deprecated.

NOTE: This blueprint is kept for backwards compatibility only.
Actual webhook handlers are in:
- order_lifecycle.py - /webhook/orders/*
- customer_lifecycle.py - /webhook/customers/*
- app_lifecycle.py - /webhook/shop/*, /webhook/customers/redact, etc.
- subscription_lifecycle.py - /webhook/subscription/*

Do NOT add new routes here. Use the appropriate lifecycle module instead.
"""

from flask import Blueprint


webhooks_bp = Blueprint('shopify_webhook', __name__)


# No routes defined - all actual webhook handlers are in lifecycle modules.
# This blueprint is registered for backwards compatibility but serves no purpose.
# It can be removed in a future version once we verify no webhooks point to it.
