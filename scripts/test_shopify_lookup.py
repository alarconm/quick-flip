#!/usr/bin/env python3
"""
Test Shopify customer lookup and store credit operations.
Uses michael.alarconii@gmail.com as the test account.
"""
import os
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.services.shopify_client import ShopifyClient

def main():
    shop_domain = os.getenv('SHOPIFY_DOMAIN')
    access_token = os.getenv('SHOPIFY_ACCESS_TOKEN')

    if not shop_domain or not access_token:
        print("ERROR: Missing SHOPIFY_DOMAIN or SHOPIFY_ACCESS_TOKEN")
        return

    print(f"Connecting to Shopify: {shop_domain}")
    print("-" * 50)

    client = ShopifyClient(shop_domain, access_token)

    # Test customer lookup
    test_email = "michael.alarconii@gmail.com"
    print(f"\n1. Looking up customer: {test_email}")

    try:
        customer = client.get_customer_by_email(test_email)

        if customer:
            print(f"   FOUND!")
            print(f"   - ID: {customer['id']}")
            print(f"   - Name: {customer.get('first_name', '')} {customer.get('last_name', '')}")
            print(f"   - Tags: {customer.get('tags', [])}")

            # Get store credit balance
            print(f"\n2. Fetching store credit balance...")
            balance = client.get_store_credit_balance(customer['id'])
            print(f"   Balance: ${balance['balance']:.2f} {balance['currency']}")

            return customer
        else:
            print(f"   NOT FOUND - Customer does not exist in Shopify")
            return None

    except Exception as e:
        print(f"   ERROR: {e}")
        return None

if __name__ == "__main__":
    main()
