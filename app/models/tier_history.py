"""
Tier History and Audit Trail Models.

Tracks all tier changes for members with full audit capabilities.
Supports compliance, analytics, and debugging tier assignment issues.
"""
from datetime import datetime
from decimal import Decimal
from ..extensions import db


class TierChangeLog(db.Model):
    """
    Immutable audit log of all tier changes.

    Every tier assignment, upgrade, downgrade, or removal is logged here.
    This enables:
    - Full audit trail for compliance
    - Analytics on tier movement
    - Debugging tier assignment issues
    - Member tier history view
    """
    __tablename__ = 'tier_change_logs'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False)

    # What changed
    previous_tier_id = db.Column(db.Integer, db.ForeignKey('membership_tiers.id'))
    new_tier_id = db.Column(db.Integer, db.ForeignKey('membership_tiers.id'))
    previous_tier_name = db.Column(db.String(50))  # Denormalized for history
    new_tier_name = db.Column(db.String(50))  # Denormalized for history

    # Change type
    change_type = db.Column(db.String(30), nullable=False)
    # Values: 'assigned', 'upgraded', 'downgraded', 'removed', 'expired',
    #         'subscription_started', 'subscription_cancelled', 'subscription_paused',
    #         'purchase', 'refunded', 'earned', 'promo_applied', 'promo_expired'

    # Source tracking (who/what caused the change)
    source_type = db.Column(db.String(30), nullable=False)
    # Values: 'staff', 'purchase', 'subscription', 'earned', 'promo', 'system', 'api'

    source_reference = db.Column(db.String(255))
    # Examples: 'staff:mike@shop.com', 'order:12345', 'subscription:gid://...',
    #           'earned:spend_threshold', 'promo:summer_2025'

    # Additional context
    reason = db.Column(db.Text)  # Human-readable reason
    extra_data = db.Column(db.JSON, default=dict)  # Additional structured data

    # Expiration tracking
    expires_at = db.Column(db.DateTime)  # When this tier assignment expires

    # Audit fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(100))  # User or system that made change
    ip_address = db.Column(db.String(45))  # For security auditing

    # Relationships
    member = db.relationship('Member', backref=db.backref('tier_history', lazy='dynamic'))
    previous_tier = db.relationship('MembershipTier', foreign_keys=[previous_tier_id])
    new_tier = db.relationship('MembershipTier', foreign_keys=[new_tier_id])

    def __repr__(self):
        return f'<TierChangeLog {self.id}: {self.previous_tier_name} -> {self.new_tier_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'previous_tier': self.previous_tier_name,
            'new_tier': self.new_tier_name,
            'change_type': self.change_type,
            'source_type': self.source_type,
            'source_reference': self.source_reference,
            'reason': self.reason,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat(),
            'created_by': self.created_by
        }


class TierEligibilityRule(db.Model):
    """
    Configurable rules for automatic tier eligibility.

    Supports activity-based tier qualification like:
    - Spend $500 in 12 months → Gold
    - Complete 10 trade-ins → Platinum
    - Maintain $100/month average → Keep tier
    """
    __tablename__ = 'tier_eligibility_rules'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    tier_id = db.Column(db.Integer, db.ForeignKey('membership_tiers.id'), nullable=False)

    # Rule identification
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    rule_type = db.Column(db.String(30), nullable=False)
    # Values: 'qualification', 'maintenance', 'upgrade', 'downgrade'

    # Metric to evaluate
    metric = db.Column(db.String(50), nullable=False)
    # Values: 'total_spend', 'trade_in_count', 'trade_in_value', 'order_count',
    #         'points_earned', 'referrals', 'membership_duration'

    # Threshold
    threshold_value = db.Column(db.Numeric(12, 2), nullable=False)
    threshold_operator = db.Column(db.String(10), default='>=')
    # Values: '>=', '>', '<=', '<', '==', 'between'
    threshold_max = db.Column(db.Numeric(12, 2))  # For 'between' operator

    # Time window
    time_window_days = db.Column(db.Integer)  # NULL = all-time
    rolling_window = db.Column(db.Boolean, default=True)  # Rolling vs calendar period

    # Action when rule is met
    action = db.Column(db.String(30), default='upgrade')
    # Values: 'upgrade', 'downgrade', 'notify', 'maintain'

    # Priority (for conflicting rules)
    priority = db.Column(db.Integer, default=0)

    # Status
    is_active = db.Column(db.Boolean, default=True)

    # Audit
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tier = db.relationship('MembershipTier', backref='eligibility_rules')

    def __repr__(self):
        return f'<TierEligibilityRule {self.name}: {self.metric} {self.threshold_operator} {self.threshold_value}>'

    def to_dict(self):
        return {
            'id': self.id,
            'tier_id': self.tier_id,
            'name': self.name,
            'description': self.description,
            'rule_type': self.rule_type,
            'metric': self.metric,
            'threshold_value': float(self.threshold_value),
            'threshold_operator': self.threshold_operator,
            'time_window_days': self.time_window_days,
            'rolling_window': self.rolling_window,
            'action': self.action,
            'priority': self.priority,
            'is_active': self.is_active
        }


class TierPromotion(db.Model):
    """
    Promotional tier assignments.

    Time-limited tier upgrades for:
    - Marketing campaigns
    - Special events
    - Partner promotions
    - Seasonal offers
    """
    __tablename__ = 'tier_promotions'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    tier_id = db.Column(db.Integer, db.ForeignKey('membership_tiers.id'), nullable=False)

    # Promotion details
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50))  # Optional promo code
    description = db.Column(db.Text)

    # Duration
    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=False)

    # Tier grant duration (how long member keeps the tier)
    grant_duration_days = db.Column(db.Integer)  # NULL = until promo ends

    # Targeting
    target_type = db.Column(db.String(30), default='all')
    # Values: 'all', 'new_members', 'tier_specific', 'tagged', 'manual'
    target_tiers = db.Column(db.JSON)  # List of tier IDs that can use this
    target_tags = db.Column(db.JSON)  # Customer tags that qualify

    # Limits
    max_uses = db.Column(db.Integer)  # NULL = unlimited
    max_uses_per_member = db.Column(db.Integer, default=1)
    current_uses = db.Column(db.Integer, default=0)

    # Behavior
    stackable = db.Column(db.Boolean, default=False)  # Can stack with other promos
    upgrade_only = db.Column(db.Boolean, default=True)  # Only if better than current
    revert_on_expire = db.Column(db.Boolean, default=True)  # Revert to previous tier

    # Status
    is_active = db.Column(db.Boolean, default=True)

    # Audit
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))

    # Relationships
    tier = db.relationship('MembershipTier', backref='promotions')

    def __repr__(self):
        return f'<TierPromotion {self.name}>'

    @property
    def is_currently_active(self):
        """Check if promotion is currently running."""
        now = datetime.utcnow()
        return (
            self.is_active and
            self.starts_at <= now <= self.ends_at and
            (self.max_uses is None or self.current_uses < self.max_uses)
        )

    def to_dict(self):
        return {
            'id': self.id,
            'tier_id': self.tier_id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'starts_at': self.starts_at.isoformat(),
            'ends_at': self.ends_at.isoformat(),
            'grant_duration_days': self.grant_duration_days,
            'target_type': self.target_type,
            'max_uses': self.max_uses,
            'current_uses': self.current_uses,
            'is_active': self.is_active,
            'is_currently_active': self.is_currently_active
        }


class MemberPromoUsage(db.Model):
    """
    Tracks which promotions each member has used.
    """
    __tablename__ = 'member_promo_usages'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False)
    promotion_id = db.Column(db.Integer, db.ForeignKey('tier_promotions.id'), nullable=False)

    # When the promo was applied
    applied_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Previous tier (to revert to if needed)
    previous_tier_id = db.Column(db.Integer, db.ForeignKey('membership_tiers.id'))

    # When the promo tier expires for this member
    expires_at = db.Column(db.DateTime)

    # Status
    status = db.Column(db.String(20), default='active')
    # Values: 'active', 'expired', 'reverted', 'upgraded'

    reverted_at = db.Column(db.DateTime)

    # Relationships
    member = db.relationship('Member', backref=db.backref('promo_usages', lazy='dynamic'))
    promotion = db.relationship('TierPromotion', backref='usages')
    previous_tier = db.relationship('MembershipTier')

    __table_args__ = (
        db.UniqueConstraint('member_id', 'promotion_id', name='uq_member_promotion'),
    )
