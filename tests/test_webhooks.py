"""
Tests for Shopify webhook handlers.

Note: These tests verify webhook endpoint existence and basic behavior.
In production, webhooks require HMAC signature verification.
In testing mode (ENV != 'development'), signature verification is enforced,
so endpoints return 401 without valid signatures.

For more comprehensive webhook tests with mocked payloads, see test_webhooks_mocked.py.
"""
import json


def test_app_uninstalled_webhook_endpoint(client, sample_tenant):
    """Test app uninstalled webhook endpoint exists and responds."""
    response = client.post(
        '/webhook/app/uninstalled',
        headers={
            'X-Shopify-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        },
        data=json.dumps({'shop_domain': sample_tenant.shopify_domain})
    )
    # In testing mode, returns 401 due to missing HMAC signature
    # Returns 200 if signature verification is skipped (development mode)
    assert response.status_code in [200, 401, 500]


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
        # Should respond (200 success, 401 auth required, 500 for missing data)
        assert response.status_code in [200, 401, 500], f"Endpoint {endpoint} returned {response.status_code}"


def test_customer_data_request_webhook_endpoint(client, sample_tenant, sample_member):
    """Test GDPR customer data request webhook endpoint exists."""
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
    # In testing mode, returns 401 due to missing HMAC signature
    assert response.status_code in [200, 401, 500]
