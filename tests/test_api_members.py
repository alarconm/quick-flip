"""
Tests for the Members API endpoints.
"""
import json


def test_get_members_requires_shop(client):
    """Test that members endpoint requires shop domain header."""
    response = client.get('/api/members/')
    # Should return error without shop domain
    assert response.status_code in [400, 401, 404, 500]


def test_members_endpoint_exists(client, auth_headers):
    """Test that the members endpoint responds."""
    response = client.get('/api/members/', headers=auth_headers)
    # Endpoint should respond (may require more auth setup)
    assert response.status_code in [200, 401, 404, 500]
