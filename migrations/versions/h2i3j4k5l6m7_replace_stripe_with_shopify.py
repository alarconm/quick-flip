"""Replace Stripe with Shopify subscription fields

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-01-05 11:00:00.000000

This migration:
1. Removes Stripe-specific columns from members and membership_tiers
2. Adds Shopify subscription tracking columns to members
3. Adds Shopify selling plan ID to membership_tiers
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade():
    # Add new Shopify subscription columns to members
    with op.batch_alter_table('members', schema=None) as batch_op:
        # Add new Shopify columns
        batch_op.add_column(sa.Column('shopify_subscription_contract_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('subscription_status', sa.String(length=20), server_default='none', nullable=True))
        batch_op.add_column(sa.Column('tier_assigned_by', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('tier_assigned_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('tier_expires_at', sa.DateTime(), nullable=True))

        # Remove Stripe columns (keep password_hash, email_verified, email_verification_token for auth)
        batch_op.drop_column('stripe_customer_id')
        batch_op.drop_column('stripe_subscription_id')
        batch_op.drop_column('payment_status')
        batch_op.drop_column('current_period_start')
        batch_op.drop_column('current_period_end')
        batch_op.drop_column('cancel_at_period_end')

    # Update membership_tiers: remove Stripe, add Shopify
    with op.batch_alter_table('membership_tiers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('shopify_selling_plan_id', sa.String(length=100), nullable=True))
        batch_op.drop_column('stripe_product_id')
        batch_op.drop_column('stripe_price_id')


def downgrade():
    # Restore Stripe columns to membership_tiers
    with op.batch_alter_table('membership_tiers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('stripe_product_id', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('stripe_price_id', sa.String(length=50), nullable=True))
        batch_op.drop_column('shopify_selling_plan_id')

    # Restore Stripe columns to members
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.add_column(sa.Column('stripe_customer_id', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('stripe_subscription_id', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('payment_status', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('current_period_start', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('current_period_end', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('cancel_at_period_end', sa.Boolean(), nullable=True))

        # Remove Shopify columns
        batch_op.drop_column('tier_expires_at')
        batch_op.drop_column('tier_assigned_at')
        batch_op.drop_column('tier_assigned_by')
        batch_op.drop_column('subscription_status')
        batch_op.drop_column('shopify_subscription_contract_id')
