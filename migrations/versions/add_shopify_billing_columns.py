"""Add Shopify billing columns to tenants

Revision ID: a3b4c5d6e7f8
Revises: 21551ec8c0f5
Create Date: 2026-01-04 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3b4c5d6e7f8'
down_revision = '21551ec8c0f5'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing Shopify billing columns to tenants table
    with op.batch_alter_table('tenants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('shopify_subscription_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('subscription_plan', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('subscription_active', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('current_period_end', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('max_members', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('max_tiers', sa.Integer(), nullable=True))

    # Set default values for existing rows
    op.execute("UPDATE tenants SET subscription_plan = 'starter' WHERE subscription_plan IS NULL")
    op.execute("UPDATE tenants SET subscription_active = false WHERE subscription_active IS NULL")
    op.execute("UPDATE tenants SET max_members = 100 WHERE max_members IS NULL")
    op.execute("UPDATE tenants SET max_tiers = 3 WHERE max_tiers IS NULL")


def downgrade():
    with op.batch_alter_table('tenants', schema=None) as batch_op:
        batch_op.drop_column('max_tiers')
        batch_op.drop_column('max_members')
        batch_op.drop_column('current_period_end')
        batch_op.drop_column('subscription_active')
        batch_op.drop_column('subscription_plan')
        batch_op.drop_column('shopify_subscription_id')
