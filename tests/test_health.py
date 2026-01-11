"""
Basic health check and app initialization tests.
"""


def test_health_check(client):
    """Test the health check endpoint returns 200."""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
    assert data['service'] == 'tradeup'


def test_root_endpoint(client):
    """Test the root endpoint returns service info."""
    response = client.get('/')
    assert response.status_code == 200
    data = response.get_json()
    assert 'service' in data
    assert data['status'] == 'running'
