"""
Shopify Admin API client.
Handles store credit operations and customer management.
"""
import httpx
from typing import Optional, Dict, Any, List


class ShopifyClient:
    """
    Client for Shopify Admin GraphQL API.

    Supports:
    - Store credit operations (add/get balance)
    - Customer tagging
    - Product operations
    - Collections and tags
    """

    def __init__(self, tenant_id_or_domain, access_token: str = None, api_version: str = '2026-01'):
        """
        Initialize Shopify client.

        Can be initialized either with:
        - tenant_id (int): Will fetch credentials from database
        - shop_domain + access_token: Direct initialization
        """
        if isinstance(tenant_id_or_domain, int):
            # Initialize from tenant ID
            from ..models.tenant import Tenant
            tenant = Tenant.query.get(tenant_id_or_domain)
            if not tenant:
                raise ValueError(f"Tenant {tenant_id_or_domain} not found")
            if not tenant.shopify_domain or not tenant.shopify_access_token:
                raise ValueError(f"Tenant {tenant_id_or_domain} missing Shopify credentials")

            self.shop_domain = tenant.shopify_domain.replace('https://', '').replace('http://', '').rstrip('/')
            self.access_token = tenant.shopify_access_token
        else:
            # Direct initialization
            self.shop_domain = tenant_id_or_domain.replace('https://', '').replace('http://', '').rstrip('/')
            self.access_token = access_token

        self.api_version = api_version
        self.graphql_url = f'https://{self.shop_domain}/admin/api/{api_version}/graphql.json'

    def _execute_query(self, query: str, variables: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute a GraphQL query."""
        headers = {
            'X-Shopify-Access-Token': self.access_token,
            'Content-Type': 'application/json'
        }

        payload = {'query': query}
        if variables:
            payload['variables'] = variables

        with httpx.Client() as client:
            response = client.post(
                self.graphql_url,
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()

            if 'errors' in result:
                raise Exception(f"GraphQL errors: {result['errors']}")

            return result.get('data', {})

    def add_store_credit(
        self,
        customer_id: str,
        amount: float,
        note: str = 'Quick Flip Bonus'
    ) -> Dict[str, Any]:
        """
        Add store credit to a customer account.

        Args:
            customer_id: Shopify customer ID (numeric or GID)
            amount: Amount to credit
            note: Transaction note

        Returns:
            Dict with transaction details
        """
        # Ensure customer_id is in GID format
        if not customer_id.startswith('gid://'):
            customer_id = f'gid://shopify/Customer/{customer_id}'

        query = """
        mutation storeCreditAccountCredit($id: ID!, $creditInput: StoreCreditAccountCreditInput!) {
            storeCreditAccountCredit(id: $id, creditInput: $creditInput) {
                storeCreditAccountTransaction {
                    id
                    amount {
                        amount
                        currencyCode
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        variables = {
            'id': customer_id,
            'creditInput': {
                'creditAmount': {
                    'amount': str(amount),
                    'currencyCode': 'USD'
                },
                'note': note
            }
        }

        result = self._execute_query(query, variables)

        mutation_result = result.get('storeCreditAccountCredit', {})
        user_errors = mutation_result.get('userErrors', [])

        if user_errors:
            raise Exception(f"Shopify errors: {user_errors}")

        transaction = mutation_result.get('storeCreditAccountTransaction', {})

        return {
            'success': True,
            'transaction_id': transaction.get('id'),
            'amount': transaction.get('amount', {}).get('amount'),
            'currency': transaction.get('amount', {}).get('currencyCode')
        }

    def get_store_credit_balance(self, customer_id: str) -> Dict[str, Any]:
        """
        Get customer's store credit balance.

        Args:
            customer_id: Shopify customer ID

        Returns:
            Dict with balance information
        """
        if not customer_id.startswith('gid://'):
            customer_id = f'gid://shopify/Customer/{customer_id}'

        query = """
        query getCustomerStoreCredit($customerId: ID!) {
            customer(id: $customerId) {
                id
                email
                storeCreditAccounts(first: 1) {
                    edges {
                        node {
                            id
                            balance {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
        """

        result = self._execute_query(query, {'customerId': customer_id})

        customer = result.get('customer', {})
        accounts = customer.get('storeCreditAccounts', {}).get('edges', [])

        if not accounts:
            return {
                'customer_id': customer_id,
                'balance': 0,
                'currency': 'USD'
            }

        account = accounts[0].get('node', {})
        balance_data = account.get('balance', {})

        return {
            'customer_id': customer_id,
            'account_id': account.get('id'),
            'balance': float(balance_data.get('amount', 0)),
            'currency': balance_data.get('currencyCode', 'USD')
        }

    def add_customer_tag(self, customer_id: str, tag: str) -> Dict[str, Any]:
        """
        Add a tag to a customer.

        Args:
            customer_id: Shopify customer ID
            tag: Tag to add

        Returns:
            Dict with result
        """
        if not customer_id.startswith('gid://'):
            customer_id = f'gid://shopify/Customer/{customer_id}'

        query = """
        mutation customerUpdate($input: CustomerInput!) {
            customerUpdate(input: $input) {
                customer {
                    id
                    tags
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        # First get existing tags
        get_tags_query = """
        query getCustomer($id: ID!) {
            customer(id: $id) {
                tags
            }
        }
        """

        existing = self._execute_query(get_tags_query, {'id': customer_id})
        existing_tags = existing.get('customer', {}).get('tags', [])

        # Add new tag if not present
        if tag not in existing_tags:
            existing_tags.append(tag)

        variables = {
            'input': {
                'id': customer_id,
                'tags': existing_tags
            }
        }

        result = self._execute_query(query, variables)

        mutation_result = result.get('customerUpdate', {})
        user_errors = mutation_result.get('userErrors', [])

        if user_errors:
            raise Exception(f"Shopify errors: {user_errors}")

        return {
            'success': True,
            'customer_id': customer_id,
            'tags': mutation_result.get('customer', {}).get('tags', [])
        }

    def get_customer_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Find a customer by email.

        Args:
            email: Customer email

        Returns:
            Customer data or None
        """
        query = """
        query findCustomer($query: String!) {
            customers(first: 1, query: $query) {
                edges {
                    node {
                        id
                        email
                        firstName
                        lastName
                        phone
                        tags
                        numberOfOrders
                        amountSpent {
                            amount
                            currencyCode
                        }
                        createdAt
                    }
                }
            }
        }
        """

        result = self._execute_query(query, {'query': f'email:{email}'})

        customers = result.get('customers', {}).get('edges', [])
        if not customers:
            return None

        customer = customers[0].get('node', {})
        return {
            'id': customer.get('id'),
            'email': customer.get('email'),
            'firstName': customer.get('firstName'),
            'lastName': customer.get('lastName'),
            'phone': customer.get('phone'),
            'tags': customer.get('tags', []),
            'numberOfOrders': customer.get('numberOfOrders', 0),
            'amountSpent': customer.get('amountSpent', {}),
            'createdAt': customer.get('createdAt')
        }

    def get_collections(self) -> List[Dict[str, Any]]:
        """
        Get all collections from Shopify.

        Returns:
            List of collection dicts with id, title, handle, productsCount
        """
        query = """
        query getCollections($first: Int!, $after: String) {
            collections(first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                edges {
                    node {
                        id
                        title
                        handle
                        productsCount
                    }
                }
            }
        }
        """

        all_collections = []
        has_next_page = True
        cursor = None

        while has_next_page:
            variables = {'first': 100}
            if cursor:
                variables['after'] = cursor

            result = self._execute_query(query, variables)
            collections_data = result.get('collections', {})

            edges = collections_data.get('edges', [])
            for edge in edges:
                node = edge.get('node', {})
                all_collections.append({
                    'id': node.get('id'),
                    'title': node.get('title'),
                    'handle': node.get('handle'),
                    'productsCount': node.get('productsCount', 0)
                })

            page_info = collections_data.get('pageInfo', {})
            has_next_page = page_info.get('hasNextPage', False)
            cursor = page_info.get('endCursor')

        return all_collections

    def get_product_tags(self) -> List[str]:
        """
        Get all unique product tags from Shopify.

        Returns:
            List of unique tag strings
        """
        query = """
        query getProductTags($first: Int!, $after: String) {
            products(first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                edges {
                    node {
                        tags
                    }
                }
            }
        }
        """

        all_tags = set()
        has_next_page = True
        cursor = None

        # Limit to 500 products for performance
        max_pages = 5

        while has_next_page and max_pages > 0:
            variables = {'first': 100}
            if cursor:
                variables['after'] = cursor

            result = self._execute_query(query, variables)
            products_data = result.get('products', {})

            edges = products_data.get('edges', [])
            for edge in edges:
                node = edge.get('node', {})
                tags = node.get('tags', [])
                all_tags.update(tags)

            page_info = products_data.get('pageInfo', {})
            has_next_page = page_info.get('hasNextPage', False)
            cursor = page_info.get('endCursor')
            max_pages -= 1

        return sorted(list(all_tags))

    def get_customer_tags(self) -> List[str]:
        """
        Get all unique customer tags from Shopify.

        Returns:
            List of unique tag strings
        """
        query = """
        query getCustomerTags($first: Int!, $after: String) {
            customers(first: $first, after: $after) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                edges {
                    node {
                        tags
                    }
                }
            }
        }
        """

        all_tags = set()
        has_next_page = True
        cursor = None

        # Limit to 500 customers for performance
        max_pages = 5

        while has_next_page and max_pages > 0:
            variables = {'first': 100}
            if cursor:
                variables['after'] = cursor

            result = self._execute_query(query, variables)
            customers_data = result.get('customers', {})

            edges = customers_data.get('edges', [])
            for edge in edges:
                node = edge.get('node', {})
                tags = node.get('tags', [])
                all_tags.update(tags)

            page_info = customers_data.get('pageInfo', {})
            has_next_page = page_info.get('hasNextPage', False)
            cursor = page_info.get('endCursor')
            max_pages -= 1

        return sorted(list(all_tags))
