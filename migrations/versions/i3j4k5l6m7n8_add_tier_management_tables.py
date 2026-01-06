"""Add tier management tables

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-01-05 12:00:00.000000

This migration adds:
1. tier_change_logs - Full audit trail of tier changes
2. tier_eligibility_rules - Activity-based tier qualification rules
3. tier_promotions - Time-limited promotional tier offers
4. member_promo_usages - Track which members used which promos
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'i3j4k5l6m7n8'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade():
    # Tier Change Logs - Audit trail
    op.create_table(
        'tier_change_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('members.id'), nullable=False),
        sa.Column('previous_tier_id', sa.Integer(), sa.ForeignKey('membership_tiers.id')),
        sa.Column('new_tier_id', sa.Integer(), sa.ForeignKey('membership_tiers.id')),
        sa.Column('previous_tier_name', sa.String(50)),
        sa.Column('new_tier_name', sa.String(50)),
        sa.Column('change_type', sa.String(30), nullable=False),
        sa.Column('source_type', sa.String(30), nullable=False),
        sa.Column('source_reference', sa.String(255)),
        sa.Column('reason', sa.Text()),
        sa.Column('extra_data', sa.JSON(), default={}),
        sa.Column('expires_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.String(100)),
        sa.Column('ip_address', sa.String(45)),
    )
    op.create_index('ix_tier_change_logs_member', 'tier_change_logs', ['member_id'])
    op.create_index('ix_tier_change_logs_tenant', 'tier_change_logs', ['tenant_id'])
    op.create_index('ix_tier_change_logs_created', 'tier_change_logs', ['created_at'])

    # Tier Eligibility Rules - Activity-based qualification
    op.create_table(
        'tier_eligibility_rules',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('tier_id', sa.Integer(), sa.ForeignKey('membership_tiers.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('rule_type', sa.String(30), nullable=False),
        sa.Column('metric', sa.String(50), nullable=False),
        sa.Column('threshold_value', sa.Numeric(12, 2), nullable=False),
        sa.Column('threshold_operator', sa.String(10), default='>='),
        sa.Column('threshold_max', sa.Numeric(12, 2)),
        sa.Column('time_window_days', sa.Integer()),
        sa.Column('rolling_window', sa.Boolean(), default=True),
        sa.Column('action', sa.String(30), default='upgrade'),
        sa.Column('priority', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_tier_eligibility_rules_tenant', 'tier_eligibility_rules', ['tenant_id'])
    op.create_index('ix_tier_eligibility_rules_active', 'tier_eligibility_rules', ['tenant_id', 'is_active'])

    # Tier Promotions - Time-limited offers
    op.create_table(
        'tier_promotions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('tier_id', sa.Integer(), sa.ForeignKey('membership_tiers.id'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(50)),
        sa.Column('description', sa.Text()),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('ends_at', sa.DateTime(), nullable=False),
        sa.Column('grant_duration_days', sa.Integer()),
        sa.Column('target_type', sa.String(30), default='all'),
        sa.Column('target_tiers', sa.JSON()),
        sa.Column('target_tags', sa.JSON()),
        sa.Column('max_uses', sa.Integer()),
        sa.Column('max_uses_per_member', sa.Integer(), default=1),
        sa.Column('current_uses', sa.Integer(), default=0),
        sa.Column('stackable', sa.Boolean(), default=False),
        sa.Column('upgrade_only', sa.Boolean(), default=True),
        sa.Column('revert_on_expire', sa.Boolean(), default=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('created_by', sa.String(100)),
    )
    op.create_index('ix_tier_promotions_tenant', 'tier_promotions', ['tenant_id'])
    op.create_index('ix_tier_promotions_code', 'tier_promotions', ['tenant_id', 'code'])
    op.create_index('ix_tier_promotions_active', 'tier_promotions', ['tenant_id', 'is_active', 'starts_at', 'ends_at'])

    # Member Promo Usages - Track usage per member
    op.create_table(
        'member_promo_usages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tenant_id', sa.Integer(), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('members.id'), nullable=False),
        sa.Column('promotion_id', sa.Integer(), sa.ForeignKey('tier_promotions.id'), nullable=False),
        sa.Column('applied_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('previous_tier_id', sa.Integer(), sa.ForeignKey('membership_tiers.id')),
        sa.Column('expires_at', sa.DateTime()),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('reverted_at', sa.DateTime()),
    )
    op.create_index('ix_member_promo_usages_member', 'member_promo_usages', ['member_id'])
    op.create_unique_constraint('uq_member_promotion', 'member_promo_usages', ['member_id', 'promotion_id'])


def downgrade():
    op.drop_table('member_promo_usages')
    op.drop_table('tier_promotions')
    op.drop_table('tier_eligibility_rules')
    op.drop_table('tier_change_logs')
