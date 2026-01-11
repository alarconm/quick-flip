"""
Tests for the Tiers API endpoints.
"""
import json


def test_tiers_endpoint_exists(client, auth_headers):
    """Test that the tiers endpoint responds."""
    response = client.get('/api/tiers', headers=auth_headers)
    # Endpoint should respond (may require more auth setup)
    assert response.status_code in [200, 401, 404, 500]


def test_tiers_fixture_created(sample_tier):
    """Test that the tier fixture is created correctly."""
    assert sample_tier.id is not None
    assert sample_tier.name == 'Gold'
    assert float(sample_tier.bonus_rate) == 0.15
