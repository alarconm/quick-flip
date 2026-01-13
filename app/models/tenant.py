"""
Tenant model for multi-tenant SaaS.
"""
from datetime import datetime
from ..extensions import db
from ..utils.encryption import encrypt_value, decrypt_value, is_encrypted


class Tenant(db.Model):
    """
    Card shop tenant using the TradeUp platform.
    Global table - shared across all tenants.
    """
    __tablename__ = 'tenants'

    id = db.Column(db.Integer, primary_key=True)
    shop_name = db.Column(db.String(255), nullable=False)
    shop_slug = db.Column(db.String(100), unique=True, nullable=False)

    # Shopify integration
    shopify_domain = db.Column(db.String(255))
    _shopify_access_token = db.Column('shopify_access_token', db.Text)  # Encrypted at rest
    webhook_secret = db.Column(db.String(100))

    @property
    def shopify_access_token(self) -> str:
        """Get decrypted access token."""
        if not self._shopify_access_token:
            return None
        # Handle legacy unencrypted values (starts with 'shpat_')
        if self._shopify_access_token.startswith('shpat_'):
            return self._shopify_access_token
        return decrypt_value(self._shopify_access_token)

    @shopify_access_token.setter
    def shopify_access_token(self, value: str):
        """Set and encrypt access token."""
        if value is None:
            self._shopify_access_token = None
        elif value.startswith('shpat_'):
            # Encrypt new tokens
            self._shopify_access_token = encrypt_value(value)
        elif is_encrypted(value):
            # Already encrypted, store as-is
            self._shopify_access_token = value
        else:
            # Encrypt any other value
            self._shopify_access_token = encrypt_value(value)

    # Shopify Billing (App Store)
    shopify_subscription_id = db.Column(db.String(255))  # gid://shopify/AppSubscription/...
    subscription_plan = db.Column(db.String(50), default='starter')  # starter, growth, pro
    subscription_status = db.Column(db.String(20), default='pending')  # pending, active, cancelled, expired
    subscription_active = db.Column(db.Boolean, default=False)
    trial_ends_at = db.Column(db.DateTime)
    current_period_end = db.Column(db.DateTime)
    monthly_price = db.Column(db.Numeric(10, 2))

    # Usage limits based on plan
    max_members = db.Column(db.Integer, default=100)
    max_tiers = db.Column(db.Integer, default=3)

    # Scheduled plan change (for downgrades at end of billing cycle)
    scheduled_plan_change = db.Column(db.String(50))  # Plan key to switch to
    scheduled_plan_change_date = db.Column(db.DateTime)  # When the change takes effect

    # Settings (JSON for flexibility)
    settings = db.Column(db.JSON, default=dict)

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    api_keys = db.relationship('APIKey', backref='tenant', lazy='dynamic')
    membership_tiers = db.relationship('MembershipTier', backref='tenant', lazy='dynamic')
    members = db.relationship('Member', backref='tenant', lazy='dynamic')

    def __repr__(self):
        return f'<Tenant {self.shop_slug}>'

    def to_dict(self):
        return {
            'id': self.id,
            'shop_name': self.shop_name,
            'shop_slug': self.shop_slug,
            'shopify_domain': self.shopify_domain,
            'subscription_plan': self.subscription_plan,
            'subscription_status': self.subscription_status,
            'subscription_active': self.subscription_active,
            'is_active': self.is_active
        }


class APIKey(db.Model):
    """
    API keys for tenant authentication.
    """
    __tablename__ = 'api_keys'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)

    key_hash = db.Column(db.String(255), nullable=False)  # bcrypt hash
    key_prefix = db.Column(db.String(10), nullable=False)  # First 8 chars for lookup
    name = db.Column(db.String(100))  # 'Employee Dashboard Key'

    permissions = db.Column(db.JSON, default=['read'])  # ['read', 'write', 'admin']

    last_used_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<APIKey {self.key_prefix}...>'

    def to_dict(self):
        return {
            'id': self.id,
            'key_prefix': self.key_prefix,
            'name': self.name,
            'permissions': self.permissions,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'is_active': self.is_active
        }


class BillingHistory(db.Model):
    """
    Billing history for tracking subscription changes, payments, and events.
    """
    __tablename__ = 'billing_history'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)

    event_type = db.Column(db.String(50), nullable=False)  # subscription_created, plan_changed, payment, cancelled
    event_description = db.Column(db.String(500))

    # Plan info
    plan_from = db.Column(db.String(50))
    plan_to = db.Column(db.String(50))
    amount = db.Column(db.Numeric(10, 2))
    currency = db.Column(db.String(3), default='USD')

    # Shopify reference
    shopify_charge_id = db.Column(db.String(255))
    shopify_subscription_id = db.Column(db.String(255))

    # Extra data
    extra_data = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    tenant = db.relationship('Tenant', backref=db.backref('billing_history', lazy='dynamic'))

    def __repr__(self):
        return f'<BillingHistory {self.event_type} for tenant {self.tenant_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'event_type': self.event_type,
            'event_description': self.event_description,
            'plan_from': self.plan_from,
            'plan_to': self.plan_to,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'extra_data': self.extra_data
        }
