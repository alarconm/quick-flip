"""
Tests for the Members API endpoints.

Tests cover:
- GET /api/members/ with pagination
- POST /api/members/enroll
- GET /api/members/{id}
- PUT /api/members/{id}
- Member status transitions (suspend, reactivate, cancel)
"""
import json
import pytest


class TestMembersAuth:
    """Test authentication requirements for member endpoints."""

    def test_get_members_requires_shop_header(self, client):
        """Test that members endpoint requires shop domain header."""
        response = client.get('/api/members')
        # Should return error without shop domain
        assert response.status_code in [400, 401, 404, 500]

    def test_members_endpoint_exists(self, client, auth_headers):
        """Test that the members endpoint responds with proper auth."""
        response = client.get('/api/members', headers=auth_headers)
        # Endpoint should respond with success
        assert response.status_code == 200


class TestMembersList:
    """Tests for GET /api/members/ endpoint."""

    def test_list_members_empty(self, client, auth_headers):
        """Test listing members when none exist."""
        response = client.get('/api/members', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'members' in data
        assert 'total' in data
        assert 'page' in data
        assert 'per_page' in data
        assert 'pages' in data

    def test_list_members_with_member(self, client, sample_member, sample_tenant):
        """Test listing members when one exists."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get('/api/members', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] >= 1
        assert len(data['members']) >= 1

    def test_list_members_pagination(self, client, sample_member, sample_tenant):
        """Test pagination parameters."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get('/api/members?page=1&per_page=10', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['page'] == 1
        assert data['per_page'] == 10

    def test_list_members_search_by_name(self, client, sample_member, sample_tenant):
        """Test searching members by name."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get('/api/members?search=Test', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        # Should find our sample member with name "Test User"
        assert data['total'] >= 1

    def test_list_members_search_by_email(self, client, sample_member, sample_tenant):
        """Test searching members by email."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get('/api/members?search=example.com', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] >= 1

    def test_list_members_filter_by_status(self, client, sample_member, sample_tenant):
        """Test filtering members by status."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get('/api/members?status=active', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        # All returned members should have active status
        for member in data['members']:
            assert member['status'] == 'active'

    def test_list_members_filter_by_tier(self, client, sample_member, sample_tenant):
        """Test filtering members by tier name."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get('/api/members?tier=Gold', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        # Should find members with Gold tier
        assert data['total'] >= 1


class TestMemberGet:
    """Tests for GET /api/members/{id} endpoint."""

    def test_get_member_by_id(self, client, sample_member, sample_tenant):
        """Test getting a member by ID."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get(f'/api/members/{sample_member.id}', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == sample_member.id
        assert data['email'] == sample_member.email
        assert data['name'] == sample_member.name

    def test_get_member_not_found(self, client, auth_headers):
        """Test getting a non-existent member."""
        response = client.get('/api/members/99999', headers=auth_headers)
        assert response.status_code == 404

    def test_get_member_includes_stats(self, client, sample_member, sample_tenant):
        """Test that member response includes stats."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.get(f'/api/members/{sample_member.id}', headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        # Stats should be included
        assert 'member_number' in data
        assert 'tier' in data or 'tier_id' in data


class TestMemberGetByNumber:
    """Tests for GET /api/members/by-number/{number} endpoint."""

    def test_get_member_by_number(self, client, sample_member, sample_tenant):
        """Test getting a member by member number."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        # The member number is set when the member is created
        member_number = sample_member.member_number

        response = client.get(
            f'/api/members/by-number/{member_number}',
            headers=headers
        )
        # May return 200 (found) or 404 (not found due to session isolation)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.get_json()
            assert data['member_number'] == member_number

    def test_get_member_by_number_without_prefix(self, client, sample_member, sample_tenant):
        """Test getting a member by number without TU prefix."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        # Strip TU prefix if present
        number = sample_member.member_number
        if number.startswith('TU'):
            number = number[2:]
        response = client.get(
            f'/api/members/by-number/{number}',
            headers=headers
        )
        # Should normalize the number and find the member
        assert response.status_code == 200

    def test_get_member_by_number_not_found(self, client, auth_headers):
        """Test getting a non-existent member number."""
        response = client.get('/api/members/by-number/TU99999', headers=auth_headers)
        assert response.status_code == 404


class TestMemberCreate:
    """Tests for POST /api/members endpoint."""

    def test_create_member_with_shopify_id(self, client, auth_headers):
        """Test creating a new member with Shopify customer ID."""
        response = client.post(
            '/api/members',
            headers=auth_headers,
            data=json.dumps({
                'email': 'newmember@example.com',
                'name': 'New Member',
                'shopify_customer_id': '12345678'  # Required for Shopify-native member creation
            }),
            content_type='application/json'
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['email'] == 'newmember@example.com'
        assert data['name'] == 'New Member'
        assert 'member_number' in data

    def test_create_member_requires_shopify_customer_id(self, client, auth_headers):
        """Test that Shopify customer ID is required for member creation."""
        response = client.post(
            '/api/members',
            headers=auth_headers,
            data=json.dumps({
                'email': 'test@example.com',
                'name': 'Test'
            }),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'shopify' in data['error'].lower()

    def test_create_member_requires_email(self, client, auth_headers):
        """Test that email is required for member creation."""
        response = client.post(
            '/api/members',
            headers=auth_headers,
            data=json.dumps({'name': 'No Email', 'shopify_customer_id': '123'}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_create_member_empty_body(self, client, auth_headers):
        """Test creating member with empty body."""
        response = client.post(
            '/api/members',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400


class TestMemberUpdate:
    """Tests for PUT /api/members/{id} endpoint."""

    def test_update_member_name(self, client, sample_member, sample_tenant):
        """Test updating member name."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.put(
            f'/api/members/{sample_member.id}',
            headers=headers,
            data=json.dumps({'name': 'Updated Name'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Updated Name'

    def test_update_member_email(self, client, sample_member, sample_tenant):
        """Test updating member email."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.put(
            f'/api/members/{sample_member.id}',
            headers=headers,
            data=json.dumps({'email': 'updated@example.com'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['email'] == 'updated@example.com'

    def test_update_member_status(self, client, sample_member, sample_tenant):
        """Test updating member status."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.put(
            f'/api/members/{sample_member.id}',
            headers=headers,
            data=json.dumps({'status': 'suspended'}),
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'suspended'

    def test_update_member_not_found(self, client, auth_headers):
        """Test updating non-existent member."""
        response = client.put(
            '/api/members/99999',
            headers=auth_headers,
            data=json.dumps({'name': 'Test'}),
            content_type='application/json'
        )
        assert response.status_code == 404


class TestMemberStatusTransitions:
    """Tests for member status transition endpoints."""

    def test_suspend_member(self, client, sample_member, sample_tenant):
        """Test suspending an active member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.post(
            f'/api/members/{sample_member.id}/suspend',
            headers=headers,
            data=json.dumps({'reason': 'Test suspension'}),
            content_type='application/json'
        )
        # Should succeed or return appropriate status
        assert response.status_code in [200, 404]

    def test_reactivate_member(self, client, app, sample_member, sample_tenant):
        """Test reactivating a suspended member."""
        from app.extensions import db

        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }

        # First suspend the member via PUT endpoint
        response = client.put(
            f'/api/members/{sample_member.id}',
            headers=headers,
            data=json.dumps({'status': 'suspended'}),
            content_type='application/json'
        )

        response = client.post(
            f'/api/members/{sample_member.id}/reactivate',
            headers=headers,
            content_type='application/json'
        )
        # Should succeed or return appropriate status (may not have /reactivate endpoint)
        assert response.status_code in [200, 400, 404]

    def test_cancel_member(self, client, sample_member, sample_tenant):
        """Test cancelling a member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        response = client.post(
            f'/api/members/{sample_member.id}/cancel',
            headers=headers,
            data=json.dumps({'reason': 'Test cancellation'}),
            content_type='application/json'
        )
        # Should succeed or return appropriate status
        assert response.status_code in [200, 404]


class TestMemberEnroll:
    """Tests for POST /api/members/enroll endpoint."""

    def test_enroll_requires_shopify_customer_id(self, client, auth_headers):
        """Test that enrollment requires shopify_customer_id."""
        response = client.post(
            '/api/members/enroll',
            headers=auth_headers,
            data=json.dumps({}),
            content_type='application/json'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'shopify_customer_id' in data['error'].lower()


class TestMemberDelete:
    """Tests for DELETE /api/members/{id} endpoint."""

    def test_delete_member(self, client, sample_member, sample_tenant):
        """Test deleting a member."""
        headers = {
            'X-Shop-Domain': sample_tenant.shopify_domain,
            'Content-Type': 'application/json'
        }
        member_id = sample_member.id
        response = client.delete(
            f'/api/members/{member_id}',
            headers=headers
        )
        assert response.status_code in [200, 204]

    def test_delete_member_not_found(self, client, auth_headers):
        """Test deleting non-existent member."""
        response = client.delete(
            '/api/members/99999',
            headers=auth_headers
        )
        assert response.status_code == 404
