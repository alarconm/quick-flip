"""Add batch completion and bonus fields

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-01-06 12:00:00.000000

This migration adds completion and bonus tracking fields to trade_in_batches:
- completed_at: When the batch was completed
- completed_by: Who completed it (staff email or system)
- bonus_amount: Tier bonus credit issued on completion
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade():
    # Add completion and bonus fields to trade_in_batches
    with op.batch_alter_table('trade_in_batches', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('completed_at', sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('completed_by', sa.String(length=100), nullable=True)
        )
        batch_op.add_column(
            sa.Column('bonus_amount', sa.Numeric(precision=10, scale=2),
                      nullable=True, server_default='0')
        )

    # Add index for finding completed batches
    op.create_index(
        'ix_trade_in_batches_completed',
        'trade_in_batches',
        ['completed_at'],
        postgresql_where=sa.text('completed_at IS NOT NULL')
    )


def downgrade():
    op.drop_index('ix_trade_in_batches_completed', table_name='trade_in_batches')

    with op.batch_alter_table('trade_in_batches', schema=None) as batch_op:
        batch_op.drop_column('bonus_amount')
        batch_op.drop_column('completed_by')
        batch_op.drop_column('completed_at')
