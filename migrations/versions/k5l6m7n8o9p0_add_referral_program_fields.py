"""Add referral program fields to members table.

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'k5l6m7n8o9p0'
down_revision = 'j4k5l6m7n8o9'
branch_labels = None
depends_on = None


def upgrade():
    # Add referral program columns to members table
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.add_column(sa.Column('referral_code', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('referred_by_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('referral_count', sa.Integer(), nullable=True, default=0))
        batch_op.add_column(sa.Column('referral_earnings', sa.Numeric(12, 2), nullable=True, default=0))
        batch_op.create_unique_constraint('uq_member_referral_code', ['referral_code'])
        batch_op.create_foreign_key(
            'fk_member_referred_by',
            'members',
            ['referred_by_id'],
            ['id']
        )


def downgrade():
    with op.batch_alter_table('members', schema=None) as batch_op:
        batch_op.drop_constraint('fk_member_referred_by', type_='foreignkey')
        batch_op.drop_constraint('uq_member_referral_code', type_='unique')
        batch_op.drop_column('referral_earnings')
        batch_op.drop_column('referral_count')
        batch_op.drop_column('referred_by_id')
        batch_op.drop_column('referral_code')
