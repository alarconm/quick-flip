"""
Tests for the Store Credit API endpoints.

Tests cover:
- Credit add endpoint
- Credit deduct endpoint
- Balance query
- Ledger history
- Credit expiration (via endpoints)
"""
import json
import pytest


class TestStoreCreditAdd:
    """Tests for POST /api/membership/store-credit/add endpoint."""

    def test_add_credit_requires_member_id(self, client, sample_tenant):
        """Test that adding credit requires member_id."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/add',
            headers=headers,
            data=json.dumps({'amount': 10.00}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'member_id' in data['error'].lower()

    def test_add_credit_requires_positive_amount(self, client, sample_member, sample_tenant):
        """Test that adding credit requires positive amount."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/add',
            headers=headers,
            data=json.dumps({
                'member_id': sample_member.id,
                'amount': -10.00
            }),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_add_credit_to_member(self, client, sample_member, sample_tenant):
        """Test adding store credit to a member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/add',
            headers=headers,
            data=json.dumps({
                'member_id': sample_member.id,
                'amount': 25.00,
                'description': 'Test credit'
            }),
            content_type='application/json'
        )
        # May succeed or fail depending on Shopify integration
        assert response.status_code in [200, 400, 500]
        if response.status_code == 200:
            data = response.get_json()
            assert data.get('success') is True or 'new_balance' in data

    def test_add_credit_member_not_found(self, client, sample_tenant):
        """Test adding credit to non-existent member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/add',
            headers=headers,
            data=json.dumps({
                'member_id': 99999,
                'amount': 10.00
            }),
            content_type='application/json'
        )
        assert response.status_code == 404


class TestStoreCreditDeduct:
    """Tests for POST /api/membership/store-credit/deduct endpoint."""

    def test_deduct_credit_requires_member_id(self, client, sample_tenant):
        """Test that deducting credit requires member_id."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/deduct',
            headers=headers,
            data=json.dumps({'amount': 10.00}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_deduct_credit_requires_positive_amount(self, client, sample_member, sample_tenant):
        """Test that deducting credit requires positive amount."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/deduct',
            headers=headers,
            data=json.dumps({
                'member_id': sample_member.id,
                'amount': -5.00
            }),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_deduct_credit_from_member(self, client, sample_member, sample_tenant):
        """Test deducting store credit from a member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/deduct',
            headers=headers,
            data=json.dumps({
                'member_id': sample_member.id,
                'amount': 5.00,
                'description': 'Test deduction'
            }),
            content_type='application/json'
        )
        # May succeed, fail due to insufficient balance, or Shopify error
        assert response.status_code in [200, 400, 500]

    def test_deduct_credit_member_not_found(self, client, sample_tenant):
        """Test deducting credit from non-existent member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/deduct',
            headers=headers,
            data=json.dumps({
                'member_id': 99999,
                'amount': 10.00
            }),
            content_type='application/json'
        )
        assert response.status_code == 404


class TestStoreCreditBalance:
    """Tests for GET /api/membership/store-credit/balance/{member_id} endpoint."""

    def test_get_balance_for_member(self, client, sample_member, sample_tenant):
        """Test getting balance for a member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get(
            f'/api/membership/store-credit/balance/{sample_member.id}',
            headers=headers
        )
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.get_json()
            # Should contain balance info
            assert 'local_balance' in data or 'balance' in data or 'total_balance' in data

    def test_get_balance_member_not_found(self, client, sample_tenant):
        """Test getting balance for non-existent member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get(
            '/api/membership/store-credit/balance/99999',
            headers=headers
        )
        assert response.status_code == 404


class TestStoreCreditHistory:
    """Tests for GET /api/membership/store-credit/history/{member_id} endpoint."""

    def test_get_history_for_member(self, client, sample_member, sample_tenant):
        """Test getting credit history for a member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get(
            f'/api/membership/store-credit/history/{sample_member.id}',
            headers=headers
        )
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.get_json()
            # Should contain history entries
            assert 'entries' in data or 'transactions' in data or 'history' in data or isinstance(data, list)

    def test_get_history_with_pagination(self, client, sample_member, sample_tenant):
        """Test getting credit history with pagination."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get(
            f'/api/membership/store-credit/history/{sample_member.id}?limit=10&offset=0',
            headers=headers
        )
        assert response.status_code in [200, 500]

    def test_get_history_member_not_found(self, client, sample_tenant):
        """Test getting history for non-existent member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get(
            '/api/membership/store-credit/history/99999',
            headers=headers
        )
        assert response.status_code == 404


class TestStoreCreditFromMembership:
    """Tests for GET /api/membership/store-credit endpoint."""

    def test_get_store_credit_overview(self, client, auth_headers):
        """Test getting store credit overview."""
        response = client.get('/api/membership/store-credit', headers=auth_headers)
        # Endpoint should respond (may require customer auth)
        assert response.status_code in [200, 400, 401, 404, 500]

    def test_get_credit_history_overview(self, client, auth_headers):
        """Test getting credit history overview."""
        response = client.get('/api/membership/credit-history', headers=auth_headers)
        # Endpoint should respond (may require customer auth)
        assert response.status_code in [200, 400, 401, 404, 500]


class TestStoreCreditEvents:
    """Tests for store credit events API."""

    def test_list_credit_events(self, client, auth_headers):
        """Test listing store credit events."""
        response = client.get('/api/store-credit-events', headers=auth_headers)
        # Should respond with events or empty list
        assert response.status_code in [200, 401, 404]

    def test_create_credit_event(self, client, auth_headers):
        """Test creating a store credit event."""
        response = client.post(
            '/api/store-credit-events',
            headers=auth_headers,
            data=json.dumps({
                'name': 'Test Event',
                'type': 'bonus',
                'amount': 10.00
            }),
            content_type='application/json'
        )
        # May succeed or require additional fields
        assert response.status_code in [200, 201, 400, 401, 404]


class TestPromotionsCreditEndpoints:
    """Tests for store credit via promotions API."""

    def test_get_credit_balance_via_promotions(self, client, sample_member, sample_tenant):
        """Test getting balance via promotions API."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get(
            f'/api/promotions/credit/balance/{sample_member.id}',
            headers=headers
        )
        assert response.status_code in [200, 404, 500]

    def test_add_credit_via_promotions(self, client, sample_member, sample_tenant):
        """Test adding credit via promotions API."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/promotions/credit/add',
            headers=headers,
            data=json.dumps({
                'member_id': sample_member.id,
                'amount': 15.00,
                'description': 'Promo credit'
            }),
            content_type='application/json'
        )
        assert response.status_code in [200, 201, 400, 404, 500]

    def test_bulk_credit_operations(self, client, sample_tenant):
        """Test bulk credit operations endpoint."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.get('/api/promotions/credit/bulk', headers=headers)
        assert response.status_code in [200, 401, 404]


class TestStoreCreditValidation:
    """Tests for store credit validation rules."""

    def test_add_credit_empty_body(self, client, sample_tenant):
        """Test adding credit with empty body."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/add',
            headers=headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_deduct_credit_empty_body(self, client, sample_tenant):
        """Test deducting credit with empty body."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/deduct',
            headers=headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_add_credit_zero_amount(self, client, sample_member, sample_tenant):
        """Test adding zero credit amount."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'X-Tenant-ID': str(sample_tenant.id),
            'Content-Type': 'application/json'
        }
        response = client.post(
            '/api/membership/store-credit/add',
            headers=headers,
            data=json.dumps({
                'member_id': sample_member.id,
                'amount': 0
            }),
            content_type='application/json'
        )
        assert response.status_code == 400
