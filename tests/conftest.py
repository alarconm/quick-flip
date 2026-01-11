"""
Pytest fixtures for TradeUp tests.
"""
import os
import pytest
from app import create_app
from app.extensions import db


@pytest.fixture(scope='session')
def app():
    """Create application for testing."""
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['SECRET_KEY'] = 'test-secret-key'

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
        yield db.session
        db.session.rollback()


@pytest.fixture
def sample_tenant(db_session):
    """Create a sample tenant for testing."""
    import uuid
    from app.models import Tenant

    unique_id = str(uuid.uuid4())[:8]
    tenant = Tenant(
        shopify_domain=f'test-shop-{unique_id}.myshopify.com',
        shop_name='Test Shop',
        shop_slug=f'test-shop-{unique_id}',
        is_active=True
    )
    tenant.shopify_access_token = 'shpat_test_token_12345'
    db_session.add(tenant)
    db_session.commit()
    return tenant


@pytest.fixture
def sample_tier(db_session, sample_tenant):
    """Create a sample tier for testing."""
    from app.models import MembershipTier

    tier = MembershipTier(
        tenant_id=sample_tenant.id,
        name='Gold',
        monthly_price=29.99,
        bonus_rate=0.15,  # 15% trade-in bonus
        is_active=True
    )
    db_session.add(tier)
    db_session.commit()
    return tier


@pytest.fixture
def sample_member(db_session, sample_tenant, sample_tier):
    """Create a sample member for testing."""
    import uuid
    from app.models import Member

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
    db_session.add(member)
    db_session.commit()
    return member


@pytest.fixture
def auth_headers(sample_tenant):
    """Create auth headers for API requests."""
    return {
        'X-Shopify-Shop-Domain': sample_tenant.shopify_domain,
        'Content-Type': 'application/json'
    }
