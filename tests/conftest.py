"""
Pytest fixtures for TradeUp tests.
"""
import os
import pytest
import uuid
from app import create_app
from app.extensions import db


@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    # Set testing environment variables
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['SECRET_KEY'] = 'test-secret-key'
    # Enable dev auth mode for testing (allows X-Shop-Domain header)
    os.environ['SHOPIFY_AUTH_DEV_MODE'] = 'true'

    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """Create database session for tests."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()

        # Bind scoped session to connection
        db.session.bind = connection

        yield db.session

        transaction.rollback()
        connection.close()


@pytest.fixture
def sample_tenant(app):
    """Create a sample tenant for testing."""
    from app.models import Tenant

    with app.app_context():
        unique_id = str(uuid.uuid4())[:8]
        tenant = Tenant(
            shopify_domain=f'test-shop-{unique_id}.myshopify.com',
            shop_name='Test Shop',
            shop_slug=f'test-shop-{unique_id}',
            is_active=True
        )
        tenant.shopify_access_token = 'shpat_test_token_12345'
        db.session.add(tenant)
        db.session.commit()

        # Reload to ensure it's attached to session
        tenant_id = tenant.id
        tenant = Tenant.query.get(tenant_id)
        yield tenant

        # Cleanup
        db.session.delete(tenant)
        db.session.commit()


@pytest.fixture
def sample_tier(app, sample_tenant):
    """Create a sample tier for testing."""
    from app.models import MembershipTier

    with app.app_context():
        tier = MembershipTier(
            tenant_id=sample_tenant.id,
            name='Gold',
            monthly_price=29.99,
            bonus_rate=0.15,  # 15% trade-in bonus
            is_active=True
        )
        db.session.add(tier)
        db.session.commit()

        tier_id = tier.id
        tier = MembershipTier.query.get(tier_id)
        yield tier

        # Cleanup
        db.session.delete(tier)
        db.session.commit()


@pytest.fixture
def sample_member(app, sample_tenant, sample_tier):
    """Create a sample member for testing."""
    from app.models import Member

    with app.app_context():
        unique_id = str(uuid.uuid4())[:8]
        member = Member(
            tenant_id=sample_tenant.id,
            tier_id=sample_tier.id,
            member_number=f'TU{unique_id}',
            email=f'test-{unique_id}@example.com',
            name='Test User',
            shopify_customer_id=f'cust_{unique_id}',
            status='active'
        )
        db.session.add(member)
        db.session.commit()

        member_id = member.id
        member = Member.query.get(member_id)
        yield member

        # Cleanup
        try:
            db.session.delete(member)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def auth_headers(sample_tenant):
    """
    Create auth headers for API requests.

    Uses X-Shop-Domain header which is accepted by the middleware
    when SHOPIFY_AUTH_DEV_MODE is enabled.
    """
    return {
        'X-Shop-Domain': sample_tenant.shopify_domain,
        'Content-Type': 'application/json'
    }


@pytest.fixture
def sample_trade_in_batch(app, sample_tenant, sample_member):
    """Create a sample trade-in batch for testing."""
    from app.models import TradeInBatch

    with app.app_context():
        batch = TradeInBatch(
            tenant_id=sample_tenant.id,
            member_id=sample_member.id,
            batch_number='TB-TEST-001',
            status='pending',
            total_items=0,
            total_value=0
        )
        db.session.add(batch)
        db.session.commit()

        batch_id = batch.id
        batch = TradeInBatch.query.get(batch_id)
        yield batch

        # Cleanup
        try:
            db.session.delete(batch)
            db.session.commit()
        except Exception:
            db.session.rollback()
