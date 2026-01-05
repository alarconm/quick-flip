"""Add category to trade_in_batches

Revision ID: c7d8e9f0a1b2
Revises: b5c6d7e8f9a0
Create Date: 2026-01-05 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c7d8e9f0a1b2'
down_revision = 'b5c6d7e8f9a0'
branch_labels = None
depends_on = None


def upgrade():
    # Add category column to trade_in_batches table
    with op.batch_alter_table('trade_in_batches', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category', sa.String(length=50), nullable=True, server_default='other'))


def downgrade():
    with op.batch_alter_table('trade_in_batches', schema=None) as batch_op:
        batch_op.drop_column('category')
