"""Add Stripe columns to membership_tiers and members

Revision ID: add_stripe_cols
Revises: 17862a79a853
Create Date: 2026-01-04 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_stripe_cols'
down_revision = '17862a79a853'
branch_labels = None
depends_on = None


def upgrade():
    # Add Stripe columns to membership_tiers
    op.add_column('membership_tiers', sa.Column('stripe_product_id', sa.String(length=50), nullable=True))
    op.add_column('membership_tiers', sa.Column('stripe_price_id', sa.String(length=50), nullable=True))

    # Add Stripe and auth columns to members
    op.add_column('members', sa.Column('stripe_customer_id', sa.String(length=50), nullable=True))
    op.add_column('members', sa.Column('stripe_subscription_id', sa.String(length=50), nullable=True))
    op.add_column('members', sa.Column('payment_status', sa.String(length=20), nullable=True, server_default='pending'))
    op.add_column('members', sa.Column('current_period_start', sa.DateTime(), nullable=True))
    op.add_column('members', sa.Column('current_period_end', sa.DateTime(), nullable=True))
    op.add_column('members', sa.Column('cancel_at_period_end', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('members', sa.Column('password_hash', sa.String(length=255), nullable=True))
    op.add_column('members', sa.Column('email_verified', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('members', sa.Column('email_verification_token', sa.String(length=100), nullable=True))


def downgrade():
    # Remove columns from members
    op.drop_column('members', 'email_verification_token')
    op.drop_column('members', 'email_verified')
    op.drop_column('members', 'password_hash')
    op.drop_column('members', 'cancel_at_period_end')
    op.drop_column('members', 'current_period_end')
    op.drop_column('members', 'current_period_start')
    op.drop_column('members', 'payment_status')
    op.drop_column('members', 'stripe_subscription_id')
    op.drop_column('members', 'stripe_customer_id')

    # Remove columns from membership_tiers
    op.drop_column('membership_tiers', 'stripe_price_id')
    op.drop_column('membership_tiers', 'stripe_product_id')
