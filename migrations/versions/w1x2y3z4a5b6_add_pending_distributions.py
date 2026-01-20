"""Add pending distributions table for merchant approval workflow.

Revision ID: w1x2y3z4a5b6
Revises: v0w1x2y3z4a5
Create Date: 2026-01-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'w1x2y3z4a5b6'
down_revision = 'v0w1x2y3z4a5'
branch_labels = None
depends_on = None


def upgrade():
    # Create pending_distributions table
    op.create_table('pending_distributions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('distribution_type', sa.String(50), nullable=False),
        sa.Column('reference_key', sa.String(100), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('preview_data', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.String(100), nullable=True),
        sa.Column('rejected_at', sa.DateTime(), nullable=True),
        sa.Column('rejected_by', sa.String(100), nullable=True),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('execution_result', sa.JSON(), nullable=True),
        sa.Column('notification_sent_at', sa.DateTime(), nullable=True),
        sa.Column('reminder_sent_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reference_key')
    )

    # Create indexes for common queries
    op.create_index('ix_pending_distributions_tenant_id', 'pending_distributions', ['tenant_id'])
    op.create_index('ix_pending_distributions_status', 'pending_distributions', ['status'])
    op.create_index('ix_pending_distributions_created_at', 'pending_distributions', ['created_at'])
    op.create_index('ix_pending_dist_tenant_status', 'pending_distributions', ['tenant_id', 'status'])


def downgrade():
    op.drop_index('ix_pending_dist_tenant_status', table_name='pending_distributions')
    op.drop_index('ix_pending_distributions_created_at', table_name='pending_distributions')
    op.drop_index('ix_pending_distributions_status', table_name='pending_distributions')
    op.drop_index('ix_pending_distributions_tenant_id', table_name='pending_distributions')
    op.drop_table('pending_distributions')
