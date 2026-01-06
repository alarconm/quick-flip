"""Add yearly_price to tier_configurations table.

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa
from decimal import Decimal


# revision identifiers, used by Alembic.
revision = 'l6m7n8o9p0q1'
down_revision = 'k5l6m7n8o9p0'
branch_labels = None
depends_on = None


def upgrade():
    # Add yearly_price column to tier_configurations
    with op.batch_alter_table('tier_configurations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('yearly_price', sa.Numeric(6, 2), nullable=True))

    # Seed default yearly prices (~17% discount for annual)
    # If tier_configurations already have data, update them
    connection = op.get_bind()

    # Update existing tiers with yearly prices
    connection.execute(sa.text("""
        UPDATE tier_configurations
        SET yearly_price = CASE
            WHEN tier_name = 'SILVER' THEN 99.99
            WHEN tier_name = 'GOLD' THEN 199.99
            WHEN tier_name = 'PLATINUM' THEN 299.99
            ELSE monthly_price * 10  -- Default: 2 months free
        END
        WHERE yearly_price IS NULL
    """))


def downgrade():
    with op.batch_alter_table('tier_configurations', schema=None) as batch_op:
        batch_op.drop_column('yearly_price')
