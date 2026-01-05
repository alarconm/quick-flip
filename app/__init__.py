"""
TradeUp - Store Credit & Rewards Platform
Flask application for managing membership, trade-ins, store credit, and rewards.
White-label SaaS for Shopify stores.
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app(config_name=None):
    """Application factory pattern."""
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        'sqlite:///quick_flip.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Shopify configuration
    app.config['SHOPIFY_STORE_DOMAIN'] = os.environ.get('SHOPIFY_STORE_DOMAIN')
    app.config['SHOPIFY_ACCESS_TOKEN'] = os.environ.get('SHOPIFY_ACCESS_TOKEN')
    app.config['SHOPIFY_WEBHOOK_SECRET'] = os.environ.get('SHOPIFY_WEBHOOK_SECRET')

    # Stripe configuration
    app.config['STRIPE_SECRET_KEY'] = os.environ.get('STRIPE_SECRET_KEY')
    app.config['STRIPE_PUBLISHABLE_KEY'] = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    app.config['STRIPE_WEBHOOK_SECRET'] = os.environ.get('STRIPE_WEBHOOK_SECRET')

    # Email configuration
    app.config['SENDGRID_API_KEY'] = os.environ.get('SENDGRID_API_KEY')
    app.config['FROM_EMAIL'] = os.environ.get('FROM_EMAIL', 'membership@orbsportscards.com')

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=['http://localhost:3000', 'https://orbsportscards.com'])

    # Register blueprints
    from app.api.membership import membership_bp
    from app.api.admin import admin_bp
    from app.api.tradein import tradein_bp
    from app.api.promotions import promotions_bp
    from app.webhooks.shopify import shopify_webhook_bp
    from app.webhooks.stripe import stripe_webhook_bp

    app.register_blueprint(membership_bp, url_prefix='/api/membership')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(tradein_bp, url_prefix='/api/tradein')
    app.register_blueprint(promotions_bp, url_prefix='/api/promotions')
    app.register_blueprint(shopify_webhook_bp, url_prefix='/webhooks/shopify')
    app.register_blueprint(stripe_webhook_bp, url_prefix='/webhooks/stripe')

    # Create tables and seed data
    with app.app_context():
        db.create_all()

        # Seed default trade-in categories
        from app.models.tradein import seed_default_categories
        seed_default_categories()

        # Seed default tier configurations
        from app.models.promotions import seed_tier_configurations
        seed_tier_configurations()

    return app
