"""Add performance indexes for common queries

Revision ID: v0w1x2y3z4a5
Revises: u9v0w1x2y3z4
Create Date: 2026-01-20

Indexes added:
- members.tenant_id - filter by tenant
- members.status - filter by active/suspended status
- members.tier_id - join with tiers
- members.shopify_customer_id - lookup by Shopify customer
- members.email - search/lookup by email
- trade_in_batches.tenant_id - filter by tenant
- trade_in_batches.status - filter by pending/approved
- trade_in_batches.member_id - lookup by member
- store_credit_ledger.member_id - lookup credit history
- store_credit_ledger.created_at - time-based queries
- points_transactions.member_id - lookup points history
- membership_tiers.tenant_id - filter by tenant
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'v0w1x2y3z4a5'
down_revision = 'u9v0w1x2y3z4'
branch_labels = None
depends_on = None


def upgrade():
    # Members table indexes
    op.create_index(
        'ix_members_tenant_id',
        'members',
        ['tenant_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_members_status',
        'members',
        ['status'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_members_tier_id',
        'members',
        ['tier_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_members_shopify_customer_id',
        'members',
        ['shopify_customer_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_members_email',
        'members',
        ['email'],
        unique=False,
        if_not_exists=True
    )
    # Composite index for common filter pattern
    op.create_index(
        'ix_members_tenant_status',
        'members',
        ['tenant_id', 'status'],
        unique=False,
        if_not_exists=True
    )

    # Trade-in batches indexes
    op.create_index(
        'ix_trade_in_batches_tenant_id',
        'trade_in_batches',
        ['tenant_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_trade_in_batches_status',
        'trade_in_batches',
        ['status'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_trade_in_batches_member_id',
        'trade_in_batches',
        ['member_id'],
        unique=False,
        if_not_exists=True
    )
    # Composite index for common filter pattern
    op.create_index(
        'ix_trade_in_batches_tenant_status',
        'trade_in_batches',
        ['tenant_id', 'status'],
        unique=False,
        if_not_exists=True
    )

    # Store credit ledger indexes
    op.create_index(
        'ix_store_credit_ledger_member_id',
        'store_credit_ledger',
        ['member_id'],
        unique=False,
        if_not_exists=True
    )
    op.create_index(
        'ix_store_credit_ledger_created_at',
        'store_credit_ledger',
        ['created_at'],
        unique=False,
        if_not_exists=True
    )

    # Points transactions indexes (if table exists)
    try:
        op.create_index(
            'ix_points_transactions_member_id',
            'points_transactions',
            ['member_id'],
            unique=False,
            if_not_exists=True
        )
    except Exception:
        pass  # Table may not exist in all environments

    # Membership tiers index
    op.create_index(
        'ix_membership_tiers_tenant_id',
        'membership_tiers',
        ['tenant_id'],
        unique=False,
        if_not_exists=True
    )


def downgrade():
    # Drop indexes in reverse order
    op.drop_index('ix_membership_tiers_tenant_id', table_name='membership_tiers', if_exists=True)

    try:
        op.drop_index('ix_points_transactions_member_id', table_name='points_transactions', if_exists=True)
    except Exception:
        pass

    op.drop_index('ix_store_credit_ledger_created_at', table_name='store_credit_ledger', if_exists=True)
    op.drop_index('ix_store_credit_ledger_member_id', table_name='store_credit_ledger', if_exists=True)

    op.drop_index('ix_trade_in_batches_tenant_status', table_name='trade_in_batches', if_exists=True)
    op.drop_index('ix_trade_in_batches_member_id', table_name='trade_in_batches', if_exists=True)
    op.drop_index('ix_trade_in_batches_status', table_name='trade_in_batches', if_exists=True)
    op.drop_index('ix_trade_in_batches_tenant_id', table_name='trade_in_batches', if_exists=True)

    op.drop_index('ix_members_tenant_status', table_name='members', if_exists=True)
    op.drop_index('ix_members_email', table_name='members', if_exists=True)
    op.drop_index('ix_members_shopify_customer_id', table_name='members', if_exists=True)
    op.drop_index('ix_members_tier_id', table_name='members', if_exists=True)
    op.drop_index('ix_members_status', table_name='members', if_exists=True)
    op.drop_index('ix_members_tenant_id', table_name='members', if_exists=True)
