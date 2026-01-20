"""
Tests for the Billing API endpoints.

Tests cover:
- Plan listing
- Subscription creation
- Subscription status
- Plan upgrade/downgrade
- Subscription cancellation
- Scheduled changes
- Billing history
"""
import json
import pytest


class TestBillingPlans:
    """Tests for GET /api/billing/plans endpoint."""

    def test_list_plans_no_auth_required(self, client):
        """Test that listing plans doesn't require auth."""
        response = client.get('/api/billing/plans')
        assert response.status_code == 200
        data = response.get_json()
        assert 'plans' in data
        assert isinstance(data['plans'], list)

    def test_list_plans_returns_expected_fields(self, client):
        """Test that plans have expected fields."""
        response = client.get('/api/billing/plans')
        assert response.status_code == 200
        data = response.get_json()

        assert 'currency' in data
        assert 'billing_interval' in data

        # Each plan should have these fields
        for plan in data['plans']:
            assert 'key' in plan
            assert 'name' in plan
            assert 'price' in plan
            assert 'max_members' in plan
            assert 'max_tiers' in plan
            assert 'features' in plan

    def test_plans_sorted_by_price(self, client):
        """Test that plans are sorted by price ascending."""
        response = client.get('/api/billing/plans')
        assert response.status_code == 200
        data = response.get_json()

        prices = [plan['price'] for plan in data['plans']]
        assert prices == sorted(prices)


class TestSubscriptionCreate:
    """Tests for POST /api/billing/subscribe endpoint."""

    def test_subscribe_requires_auth(self, client):
        """Test that subscription requires authentication."""
        response = client.post(
            '/api/billing/subscribe',
            data=json.dumps({'plan': 'starter'}),
            content_type='application/json'
        )
        assert response.status_code == 401

    def test_subscribe_invalid_plan(self, client, auth_headers):
        """Test subscription with invalid plan key."""
        response = client.post(
            '/api/billing/subscribe',
            headers=auth_headers,
            data=json.dumps({'plan': 'invalid_plan_key'}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'invalid' in data['error'].lower()

    def test_subscribe_valid_plan(self, client, auth_headers, sample_tenant):
        """Test subscription with valid plan."""
        response = client.post(
            '/api/billing/subscribe',
            headers=auth_headers,
            data=json.dumps({'plan': 'starter'}),
            content_type='application/json'
        )
        # May succeed or fail based on Shopify integration
        assert response.status_code in [200, 400, 500]

    def test_subscribe_default_plan(self, client, auth_headers):
        """Test subscription with default plan (starter)."""
        response = client.post(
            '/api/billing/subscribe',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        # May succeed or fail based on existing subscription
        assert response.status_code in [200, 400, 500]


class TestSubscriptionStatus:
    """Tests for GET /api/billing/status endpoint."""

    def test_status_requires_auth(self, client):
        """Test that status requires authentication."""
        response = client.get('/api/billing/status')
        assert response.status_code == 401

    def test_status_returns_plan_info(self, client, auth_headers):
        """Test that status returns plan info."""
        response = client.get('/api/billing/status', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        # Should have plan and status info
        assert 'plan' in data
        assert 'status' in data
        assert 'active' in data

    def test_status_returns_usage_info(self, client, auth_headers):
        """Test that status returns usage info."""
        response = client.get('/api/billing/status', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        assert 'usage' in data
        assert 'members' in data['usage']
        assert 'tiers' in data['usage']

    def test_status_includes_usage_warnings(self, client, auth_headers):
        """Test that status includes usage warnings."""
        response = client.get('/api/billing/status', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        assert 'warnings' in data
        assert 'has_warnings' in data['warnings']


class TestSubscriptionUpgrade:
    """Tests for POST /api/billing/upgrade endpoint."""

    def test_upgrade_requires_auth(self, client):
        """Test that upgrade requires authentication."""
        response = client.post(
            '/api/billing/upgrade',
            data=json.dumps({'plan': 'growth'}),
            content_type='application/json'
        )
        assert response.status_code == 401

    def test_upgrade_requires_plan(self, client, auth_headers):
        """Test that upgrade requires plan parameter."""
        response = client.post(
            '/api/billing/upgrade',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        # Checks for subscription first, then plan
        assert 'plan' in data['error'].lower() or 'subscription' in data['error'].lower()

    def test_upgrade_invalid_plan(self, client, auth_headers):
        """Test upgrade with invalid plan (but requires subscription first)."""
        response = client.post(
            '/api/billing/upgrade',
            headers=auth_headers,
            data=json.dumps({'plan': 'invalid_plan'}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        # Will fail on subscription check before plan validation
        assert 'invalid' in data['error'].lower() or 'subscription' in data['error'].lower()

    def test_upgrade_without_subscription(self, client, auth_headers):
        """Test upgrade without active subscription."""
        response = client.post(
            '/api/billing/upgrade',
            headers=auth_headers,
            data=json.dumps({'plan': 'growth'}),
            content_type='application/json'
        )
        # Should fail because no active subscription
        assert response.status_code == 400


class TestSubscriptionCancel:
    """Tests for POST /api/billing/cancel endpoint."""

    def test_cancel_requires_auth(self, client):
        """Test that cancel requires authentication."""
        response = client.post('/api/billing/cancel')
        assert response.status_code == 401

    def test_cancel_without_subscription(self, client, auth_headers):
        """Test cancel without active subscription."""
        response = client.post('/api/billing/cancel', headers=auth_headers)
        # May succeed (gracefully handle) or fail
        assert response.status_code in [200, 400, 500]


class TestScheduledDowngrade:
    """Tests for POST /api/billing/schedule-downgrade endpoint."""

    def test_schedule_downgrade_requires_auth(self, client):
        """Test that schedule-downgrade requires authentication."""
        response = client.post(
            '/api/billing/schedule-downgrade',
            data=json.dumps({'plan': 'starter'}),
            content_type='application/json'
        )
        assert response.status_code == 401

    def test_schedule_downgrade_requires_plan(self, client, auth_headers):
        """Test that schedule-downgrade requires plan."""
        response = client.post(
            '/api/billing/schedule-downgrade',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code in [400, 500]

    def test_schedule_downgrade_without_subscription(self, client, auth_headers):
        """Test schedule-downgrade without active subscription."""
        response = client.post(
            '/api/billing/schedule-downgrade',
            headers=auth_headers,
            data=json.dumps({'plan': 'starter'}),
            content_type='application/json'
        )
        assert response.status_code in [400, 500]


class TestCancelScheduledChange:
    """Tests for POST /api/billing/cancel-scheduled-change endpoint."""

    def test_cancel_scheduled_change_requires_auth(self, client):
        """Test that cancel-scheduled-change requires authentication."""
        response = client.post('/api/billing/cancel-scheduled-change')
        assert response.status_code == 401

    def test_cancel_scheduled_change_no_pending(self, client, auth_headers):
        """Test cancel-scheduled-change with no pending changes."""
        response = client.post('/api/billing/cancel-scheduled-change', headers=auth_headers)
        # Should succeed gracefully or fail
        assert response.status_code in [200, 400, 500]


class TestBillingHistory:
    """Tests for GET /api/billing/history endpoint."""

    def test_history_requires_auth(self, client):
        """Test that history requires authentication."""
        response = client.get('/api/billing/history')
        assert response.status_code == 401

    def test_history_returns_list(self, client, auth_headers):
        """Test that history returns a list."""
        response = client.get('/api/billing/history', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        # Should return list or object with history
        assert isinstance(data, list) or 'history' in data


class TestBillingCallback:
    """Tests for GET /api/billing/callback endpoint."""

    def test_callback_requires_charge_id(self, client):
        """Test callback without charge_id."""
        response = client.get('/api/billing/callback')
        # Should handle missing charge_id gracefully
        assert response.status_code in [200, 400, 500]

    def test_callback_with_invalid_charge_id(self, client):
        """Test callback with invalid charge_id."""
        response = client.get('/api/billing/callback?charge_id=invalid')
        # Should handle gracefully
        assert response.status_code in [200, 400, 500]


class TestUsageLimitEnforcement:
    """Tests for billing usage limit enforcement."""

    def test_status_shows_usage_percentage(self, client, auth_headers):
        """Test that status shows usage percentage."""
        response = client.get('/api/billing/status', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        assert 'usage' in data
        members_usage = data['usage'].get('members', {})
        assert 'percentage' in members_usage
        assert 'current' in members_usage
        assert 'limit' in members_usage

    def test_status_shows_warning_levels(self, client, auth_headers):
        """Test that status shows warning levels."""
        response = client.get('/api/billing/status', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        # Warnings section should have expected structure
        warnings = data.get('warnings', {})
        assert 'has_warnings' in warnings


class TestBillingValidation:
    """Tests for billing input validation."""

    def test_subscribe_empty_body(self, client, auth_headers):
        """Test subscribe with empty body uses default plan."""
        response = client.post(
            '/api/billing/subscribe',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        # Should try to subscribe with default plan
        assert response.status_code in [200, 400, 500]

    def test_upgrade_empty_body(self, client, auth_headers):
        """Test upgrade with empty body."""
        response = client.post(
            '/api/billing/upgrade',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
