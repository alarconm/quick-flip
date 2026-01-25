#!/usr/bin/env python3
"""
Emergency script to run Trade Night store credit event.
Bypasses frontend/deployment issues by connecting directly to Shopify.

Usage:
    python scripts/run_trade_night_credits.py --preview
    python scripts/run_trade_night_credits.py --run

Set environment variables:
    SHOPIFY_DOMAIN=uy288y-nx.myshopify.com
    SHOPIFY_ACCESS_TOKEN=your_access_token
"""
import os
import sys
import argparse
from datetime import datetime
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.store_credit_events import StoreCreditEventsService


def main():
    parser = argparse.ArgumentParser(description='Run Trade Night store credit event')
    parser.add_argument('--preview', action='store_true', help='Preview only, do not apply credits')
    parser.add_argument('--run', action='store_true', help='Actually apply the credits')
    parser.add_argument('--start', default='2026-01-25T01:00:00Z', help='Start datetime UTC (default: 5pm PST Jan 24)')
    parser.add_argument('--end', default='2026-01-25T04:00:00Z', help='End datetime UTC (default: 8pm PST Jan 24)')
    parser.add_argument('--percent', type=float, default=10.0, help='Credit percentage (default: 10)')
    args = parser.parse_args()

    if not args.preview and not args.run:
        print("Please specify --preview or --run")
        parser.print_help()
        sys.exit(1)

    # Get credentials from environment
    shop_domain = os.getenv('SHOPIFY_DOMAIN', 'uy288y-nx.myshopify.com')
    access_token = os.getenv('SHOPIFY_ACCESS_TOKEN')

    if not access_token:
        print("ERROR: SHOPIFY_ACCESS_TOKEN environment variable is required")
        print("\nTo get the access token:")
        print("1. Check Railway environment variables, or")
        print("2. Get from Shopify Partner Dashboard > Apps > TradeUp > API credentials")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Trade Night Store Credit Event")
    print(f"{'='*60}")
    print(f"Shop: {shop_domain}")
    print(f"Date range (UTC): {args.start} to {args.end}")
    print(f"Credit percentage: {args.percent}%")
    print(f"Mode: {'PREVIEW (dry run)' if args.preview else 'LIVE RUN'}")
    print(f"{'='*60}\n")

    # Create service
    service = StoreCreditEventsService(shop_domain, access_token)

    if args.preview:
        print("Fetching orders and calculating credits...")
        result = service.preview_event(
            start_datetime=args.start,
            end_datetime=args.end,
            sources=[],  # All sources
            credit_percent=args.percent,
            include_authorized=True,
            audience='all_customers'
        )

        print(f"\n{'='*60}")
        print(f"PREVIEW RESULTS")
        print(f"{'='*60}")
        print(f"Total orders found: {result['total_orders']}")
        print(f"Orders with customer: {result['orders_with_customer']}")
        print(f"Orders without customer: {result['orders_without_customer']}")
        print(f"Unique customers: {result['unique_customers']}")
        print(f"Total credit to issue: ${result['total_credit_amount']:.2f}")
        print(f"\nOrders by source:")
        for source, count in result['by_source'].items():
            print(f"  {source}: {count}")

        if result['top_customers']:
            print(f"\nTop customers:")
            for i, c in enumerate(result['top_customers'][:10], 1):
                print(f"  {i}. {c['name'] or c['email'] or 'Unknown'}")
                print(f"     Orders: {c['order_count']}, Spent: ${c['total_spent']:.2f}, Credit: ${c['credit_amount']:.2f}")

        print(f"\n{'='*60}")
        print("This was a PREVIEW. To apply credits, run with --run flag")
        print(f"{'='*60}\n")

    else:  # --run
        print("Fetching orders and calculating credits...")
        preview = service.preview_event(
            start_datetime=args.start,
            end_datetime=args.end,
            sources=[],
            credit_percent=args.percent,
            include_authorized=True,
            audience='all_customers'
        )

        print(f"\nFound {preview['unique_customers']} customers to credit")
        print(f"Total credit amount: ${preview['total_credit_amount']:.2f}")

        confirm = input("\nAre you sure you want to apply these credits? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)

        print("\nApplying credits...")
        job_id = f"trade-night-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

        result = service.run_event(
            start_datetime=args.start,
            end_datetime=args.end,
            sources=[],
            credit_percent=args.percent,
            include_authorized=True,
            job_id=job_id,
            audience='all_customers'
        )

        print(f"\n{'='*60}")
        print(f"EVENT COMPLETED")
        print(f"{'='*60}")
        print(f"Job ID: {result['event']['job_id']}")
        print(f"Total customers: {result['summary']['total_customers']}")
        print(f"Successful: {result['summary']['successful']}")
        print(f"Skipped (already received): {result['summary']['skipped']}")
        print(f"Failed: {result['summary']['failed']}")
        print(f"Total credited: ${result['summary']['total_credited']:.2f}")
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
