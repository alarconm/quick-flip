#!/usr/bin/env python3
"""
Test Store Credit Events feature with real Shopify data.
"""
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.services.store_credit_events import StoreCreditEventsService

def main():
    print("=" * 60)
    print("Store Credit Events Test")
    print("=" * 60)

    try:
        service = StoreCreditEventsService.from_env()
        print(f"Connected to Shopify: {service.shop_domain}")
    except Exception as e:
        print(f"ERROR: {e}")
        return

    # Test with a recent time window (last 24 hours)
    end_dt = datetime.utcnow()
    start_dt = end_dt - timedelta(days=7)  # Last 7 days for more data

    start_iso = start_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    end_iso = end_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

    print(f"\nDate Range: {start_iso} to {end_iso}")
    print("-" * 60)

    # 1. Fetch orders to see what sources exist
    print("\n1. Fetching orders (all sources)...")
    try:
        orders = service.fetch_orders(start_iso, end_iso, [], include_authorized=True)
        print(f"   Found {len(orders)} orders")

        # Count by source
        by_source = {}
        for order in orders:
            source = order.source_name or 'unknown'
            by_source[source] = by_source.get(source, 0) + 1

        print("\n   Orders by source:")
        for source, count in sorted(by_source.items(), key=lambda x: -x[1]):
            print(f"   - {source}: {count}")

    except Exception as e:
        print(f"   ERROR: {e}")
        return

    # 2. Preview an event
    print("\n2. Previewing event (POS + Web, 10% credit)...")
    try:
        preview = service.preview_event(
            start_datetime=start_iso,
            end_datetime=end_iso,
            sources=['pos', 'web', 'shop'],
            credit_percent=10
        )

        print(f"   Total orders: {preview['total_orders']}")
        print(f"   Orders with customer: {preview['orders_with_customer']}")
        print(f"   Unique customers: {preview['unique_customers']}")
        print(f"   Total credit amount: ${preview['total_credit_amount']:.2f}")

        print("\n   Top 5 customers:")
        for i, c in enumerate(preview['top_customers'][:5], 1):
            email = c['email'] or '(no email)'
            print(f"   {i}. {email}: ${c['credit_amount']:.2f} (spent ${c['total_spent']:.2f})")

    except Exception as e:
        print(f"   ERROR: {e}")
        return

    print("\n" + "=" * 60)
    print("Test completed successfully!")
    print("=" * 60)
    print("\nNote: This was a PREVIEW only - no credits were applied.")
    print("To run an actual event, use the /api/store-credit-events/run endpoint.")


if __name__ == "__main__":
    main()
