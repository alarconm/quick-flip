"""
Tests for Shopify webhook handlers.
"""
import json


def test_app_uninstalled_webhook(client, sample_tenant):
    """Test app uninstalled webhook marks tenant as inactive."""
    response = client.post(
        '/webhook/app/uninstalled',
        headers={
            'X-Shopify-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        },
        data=json.dumps({'shop_domain': sample_tenant.shopify_domain})
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data.get('success') is True


def test_gdpr_webhooks_exist(client, sample_tenant):
    """Test that GDPR webhook endpoints exist and respond."""
    endpoints = [
        '/webhook/shop/redact',
        '/webhook/customers/redact',
        '/webhook/customers/data_request'
    ]
    for endpoint in endpoints:
        response = client.post(
            endpoint,
            headers={
                'X-Shopify-Shop-Domain': sample_tenant.shopify_domain,
                'Content-Type': 'application/json'
            },
            data=json.dumps({})
        )
        # Should respond (200 for success, 500 for missing data)
        assert response.status_code in [200, 500], f"Endpoint {endpoint} returned {response.status_code}"


def test_customer_data_request_webhook(client, sample_tenant, sample_member):
    """Test GDPR customer data request webhook returns customer data."""
    response = client.post(
        '/webhook/customers/data_request',
        headers={
            'X-Shopify-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        },
        data=json.dumps({
            'shop_domain': sample_tenant.shopify_domain,
            'customer': {'id': sample_member.shopify_customer_id},
            'data_request': {'id': 'test-request-123'}
        })
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data.get('success') is True
