"""Add store_credit_events table

Revision ID: h2a3b4c5d6e7
Revises: g1a2b3c4d5e6
Create Date: 2026-01-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h2a3b4c5d6e7'
down_revision = 'g1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    # Create store_credit_events table
    op.create_table('store_credit_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('event_uuid', sa.String(36), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('credit_amount', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('credit_percent', sa.Numeric(5, 2), nullable=True),
        sa.Column('filters', sa.Text(), nullable=True),
        sa.Column('date_range_start', sa.DateTime(), nullable=True),
        sa.Column('date_range_end', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('customers_targeted', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('customers_processed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('customers_skipped', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('customers_failed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_credit_amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('execution_results', sa.Text(), nullable=True),
        sa.Column('idempotency_tag', sa.String(100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('credit_expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_store_credit_events_tenant_id', 'store_credit_events', ['tenant_id'])
    op.create_index('ix_store_credit_events_event_uuid', 'store_credit_events', ['event_uuid'], unique=True)
    op.create_index('ix_store_credit_events_status', 'store_credit_events', ['status'])
    op.create_index('ix_store_credit_events_created_at', 'store_credit_events', ['created_at'])


def downgrade():
    op.drop_index('ix_store_credit_events_created_at', table_name='store_credit_events')
    op.drop_index('ix_store_credit_events_status', table_name='store_credit_events')
    op.drop_index('ix_store_credit_events_event_uuid', table_name='store_credit_events')
    op.drop_index('ix_store_credit_events_tenant_id', table_name='store_credit_events')
    op.drop_table('store_credit_events')
