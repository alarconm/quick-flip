"""
Store Credit Events API endpoints.
For running promotional store credit events like Trade Night.
"""
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from ..middleware.shopify_auth import require_shopify_auth
from ..services.store_credit_events import StoreCreditEventsService

store_credit_events_bp = Blueprint('store_credit_events', __name__)


def get_service_for_tenant():
    """Get store credit events service for the authenticated tenant."""
    tenant = getattr(g, 'tenant', None)
    if not tenant or not tenant.shopify_access_token:
        return None
    return StoreCreditEventsService(tenant.shopify_domain, tenant.shopify_access_token)


def validate_filter_lists(data: dict) -> tuple:
    """
    Validate collection_ids and product_tags filter parameters.

    Args:
        data: Request JSON data

    Returns:
        Tuple of (collection_ids, product_tags) or raises ValueError

    Raises:
        ValueError: If parameters are invalid
    """
    collection_ids = data.get('collection_ids')
    if collection_ids is not None:
        if not isinstance(collection_ids, list):
            raise ValueError('collection_ids must be a list')
        if not all(isinstance(cid, str) for cid in collection_ids):
            raise ValueError('collection_ids must contain only strings')
        # Validate Shopify GID format for collections
        for cid in collection_ids:
            if cid and not cid.startswith('gid://shopify/Collection/'):
                raise ValueError(f'Invalid collection ID format: {cid}')

    product_tags = data.get('product_tags')
    if product_tags is not None:
        if not isinstance(product_tags, list):
            raise ValueError('product_tags must be a list')
        if not all(isinstance(tag, str) for tag in product_tags):
            raise ValueError('product_tags must contain only strings')
        # Limit tag length to prevent abuse
        for tag in product_tags:
            if tag and len(tag) > 255:
                raise ValueError('product_tags values must be 255 characters or less')

    return collection_ids, product_tags


@store_credit_events_bp.route('/preview', methods=['POST'])
@require_shopify_auth
def preview_event():
    """
    Preview a store credit event.

    Request body:
        start_datetime: ISO datetime string (required)
        end_datetime: ISO datetime string (required)
        sources: List of sources like ['pos', 'web'] (required)
        credit_percent: Percentage to credit (default 10)
        include_authorized: Include authorized orders (default true)
        collection_ids: List of collection GIDs to filter by (optional)
        product_tags: List of product tags to filter by (optional)
        audience: 'all_customers' (default) or 'members_only' (optional)

    Returns:
        Preview with order counts, customer totals, top customers
    """
    service = get_service_for_tenant()
    if not service:
        return jsonify({'error': 'Shopify not configured for this shop'}), 500

    data = request.json
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    required = ['start_datetime', 'end_datetime']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    # Sources is optional - empty list means all sources
    sources = data.get('sources', [])

    # Validate filter parameters
    try:
        collection_ids, product_tags = validate_filter_lists(data)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # Validate audience parameter
    audience = data.get('audience', 'all_customers')
    if audience not in ('all_customers', 'members_only'):
        return jsonify({'error': 'audience must be "all_customers" or "members_only"'}), 400

    try:
        result = service.preview_event(
            start_datetime=data['start_datetime'],
            end_datetime=data['end_datetime'],
            sources=sources,
            credit_percent=data.get('credit_percent', 10),
            include_authorized=data.get('include_authorized', True),
            collection_ids=collection_ids,
            product_tags=product_tags,
            audience=audience
        )

        # Transform to frontend-expected format
        # Frontend expects: { summary: {...}, top_customers: [...], orders_by_source: {...} }
        response = {
            'summary': {
                'total_orders': result.get('total_orders', 0),
                'unique_customers': result.get('unique_customers', 0),
                'total_order_value': result.get('total_order_value', 0),
                'total_credit_to_issue': result.get('total_credit_amount', 0),
            },
            'top_customers': result.get('top_customers', []),
            'orders_by_source': result.get('by_source', {}),
        }
        return jsonify(response)

    except ValueError as e:
        # Datetime validation errors
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@store_credit_events_bp.route('/run', methods=['POST'])
@require_shopify_auth
def run_event():
    """
    Run a store credit event (apply credits).

    Request body:
        start_datetime: ISO datetime string (required)
        end_datetime: ISO datetime string (required)
        sources: List of sources like ['pos', 'web'] (required)
        credit_percent: Percentage to credit (default 10)
        include_authorized: Include authorized orders (default true)
        job_id: Unique job ID for idempotency (recommended)
        expires_at: Credit expiration datetime (optional)
        collection_ids: List of collection GIDs to filter by (optional)
        product_tags: List of product tags to filter by (optional)
        audience: 'all_customers' (default) or 'members_only' (optional)

    Returns:
        Event results with success/failure counts
    """
    service = get_service_for_tenant()
    if not service:
        return jsonify({'error': 'Shopify not configured for this shop'}), 500

    data = request.json
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    required = ['start_datetime', 'end_datetime', 'sources']
    for field in required:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    # Validate filter parameters
    try:
        collection_ids, product_tags = validate_filter_lists(data)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # Generate job_id if not provided
    job_id = data.get('job_id')
    if not job_id:
        job_id = f"event-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

    # Validate audience parameter
    audience = data.get('audience', 'all_customers')
    if audience not in ('all_customers', 'members_only'):
        return jsonify({'error': 'audience must be "all_customers" or "members_only"'}), 400

    try:
        result = service.run_event(
            start_datetime=data['start_datetime'],
            end_datetime=data['end_datetime'],
            sources=data['sources'],
            credit_percent=data.get('credit_percent', 10),
            include_authorized=data.get('include_authorized', True),
            job_id=job_id,
            expires_at=data.get('expires_at'),
            batch_size=data.get('batch_size', 5),
            delay_ms=data.get('delay_ms', 1000),
            collection_ids=collection_ids,
            product_tags=product_tags,
            audience=audience
        )

        # Transform to frontend-expected format
        # Frontend expects: { job_id, success_count, failure_count, total_credit_issued, errors, results }
        summary = result.get('summary', {})
        results_list = result.get('results', [])

        # Extract errors from failed results
        errors = [
            f"{r.get('customer_email', r.get('customer_id', 'Unknown'))}: {r.get('error', 'Unknown error')}"
            for r in results_list
            if not r.get('success') and not r.get('skipped')
        ]

        response = {
            'job_id': result.get('event', {}).get('job_id', job_id),
            'success_count': summary.get('successful', 0),
            'failure_count': summary.get('failed', 0),
            'skipped_count': summary.get('skipped', 0),
            'total_credit_issued': summary.get('total_credited', 0),
            'errors': errors,
            # Include full results list for detailed view
            'results': [
                {
                    'customer_id': r.get('customer_id', ''),
                    'customer_email': r.get('customer_email', ''),
                    'credit_amount': r.get('credit_amount', 0),
                    'success': r.get('success', False),
                    'skipped': r.get('skipped', False),
                    'error': r.get('error'),
                }
                for r in results_list
            ],
        }
        return jsonify(response)

    except ValueError as e:
        # Datetime validation errors
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@store_credit_events_bp.route('/sources', methods=['GET'])
@require_shopify_auth
def list_sources():
    """
    List available order sources for a date range.

    Query params:
        start_datetime: ISO datetime string (required)
        end_datetime: ISO datetime string (required)

    Returns:
        List of sources with order counts
    """
    import logging
    logger = logging.getLogger(__name__)

    service = get_service_for_tenant()
    if not service:
        return jsonify({'error': 'Shopify not configured for this shop'}), 500

    start = request.args.get('start_datetime')
    end = request.args.get('end_datetime')

    logger.info(f"[StoreCreditEvents] /sources called with start={start}, end={end}")

    if not start or not end:
        return jsonify({'error': 'start_datetime and end_datetime are required'}), 400

    try:
        # Fetch orders with no source filter to see all sources
        logger.info(f"[StoreCreditEvents] Fetching orders from {start} to {end}")
        orders = service.fetch_orders(start, end, [], include_authorized=True)
        logger.info(f"[StoreCreditEvents] Found {len(orders)} orders")

        # Count by source
        by_source = {}
        for order in orders:
            source = order.source_name or 'unknown'
            by_source[source] = by_source.get(source, 0) + 1

        return jsonify({
            'start_datetime': start,
            'end_datetime': end,
            'total_orders': len(orders),
            'sources': [
                {'name': name, 'count': count}
                for name, count in sorted(by_source.items(), key=lambda x: -x[1])
            ]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@store_credit_events_bp.route('/manual-run', methods=['POST'])
def manual_run_event():
    """
    Manual endpoint to run bulk store credit event.
    Protected by secret key instead of Shopify auth for emergency use.

    Query params:
        key: Secret key for authorization

    Body (JSON):
        shop_domain: Shopify shop domain
        start_datetime: ISO UTC datetime (e.g., 2026-01-25T01:00:00Z)
        end_datetime: ISO UTC datetime (e.g., 2026-01-25T04:00:00Z)
        credit_percent: Percentage to credit (default 10)
        sources: List of sources (default all)
        dry_run: If true, only preview (default true)
    """
    import logging
    from ..models import Tenant
    logger = logging.getLogger(__name__)

    # Simple key-based auth for emergency use
    key = request.args.get('key')
    if key != 'tradeup-manual-event-2026':
        return jsonify({'error': 'Invalid key'}), 403

    data = request.json or {}
    shop_domain = data.get('shop_domain')

    if not shop_domain:
        return jsonify({'error': 'shop_domain is required'}), 400

    # Get tenant credentials
    tenant = Tenant.query.filter_by(shopify_domain=shop_domain).first()
    if not tenant or not tenant.shopify_access_token:
        return jsonify({'error': f'No tenant found for {shop_domain}'}), 404

    from ..services.store_credit_events import StoreCreditEventsService
    service = StoreCreditEventsService(tenant.shopify_domain, tenant.shopify_access_token)

    start = data.get('start_datetime')
    end = data.get('end_datetime')
    credit_percent = data.get('credit_percent', 10)
    sources = data.get('sources', [])
    dry_run = data.get('dry_run', True)
    collection_ids = data.get('collection_ids')  # For testing collection filter
    product_tags = data.get('product_tags')  # For testing tag filter

    logger.info(f"[ManualRun] shop={shop_domain}, start={start}, end={end}, dry_run={dry_run}, collection_ids={collection_ids}")

    if not start or not end:
        return jsonify({'error': 'start_datetime and end_datetime are required'}), 400

    try:
        if dry_run:
            result = service.preview_event(
                start_datetime=start,
                end_datetime=end,
                sources=sources,
                credit_percent=credit_percent,
                include_authorized=True,
                audience='all_customers',
                collection_ids=collection_ids,
                product_tags=product_tags
            )
            result['dry_run'] = True
            result['filters_applied'] = {
                'collection_ids': collection_ids,
                'product_tags': product_tags
            }
            return jsonify(result)
        else:
            result = service.run_event(
                start_datetime=start,
                end_datetime=end,
                sources=sources,
                credit_percent=credit_percent,
                include_authorized=True,
                job_id=f"manual-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
                audience='all_customers'
            )
            return jsonify(result)

    except Exception as e:
        logger.error(f"[ManualRun] Error: {str(e)}")
        import traceback
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500


@store_credit_events_bp.route('/debug-orders', methods=['GET'])
@require_shopify_auth
def debug_orders():
    """
    Debug endpoint to test order fetching.
    Shows exactly what Shopify returns for a date range.
    """
    import logging
    logger = logging.getLogger(__name__)

    service = get_service_for_tenant()
    if not service:
        return jsonify({'error': 'Shopify not configured for this shop'}), 500

    start = request.args.get('start_datetime')
    end = request.args.get('end_datetime')

    logger.info(f"[DEBUG] Received start={start}, end={end}")

    if not start or not end:
        return jsonify({'error': 'start_datetime and end_datetime are required'}), 400

    try:
        orders = service.fetch_orders(start, end, [], include_authorized=True)

        return jsonify({
            'debug': True,
            'start_datetime_received': start,
            'end_datetime_received': end,
            'shop_domain': service.shop_domain,
            'total_orders': len(orders),
            'orders': [
                {
                    'id': o.id,
                    'order_number': o.order_number,
                    'created_at': o.created_at,
                    'source_name': o.source_name,
                    'total_price': float(o.total_price),
                    'customer_email': o.customer_email
                }
                for o in orders[:20]  # Limit to first 20 for debug
            ]
        })

    except Exception as e:
        logger.error(f"[DEBUG] Error: {str(e)}")
        return jsonify({'error': str(e), 'start': start, 'end': end}), 500


@store_credit_events_bp.route('/debug-collections', methods=['GET'])
def debug_collections():
    """
    Debug endpoint to list collections from a shop.
    Protected by secret key for testing.
    """
    import logging
    from ..models import Tenant
    logger = logging.getLogger(__name__)

    key = request.args.get('key')
    if key != 'tradeup-manual-event-2026':
        return jsonify({'error': 'Invalid key'}), 403

    shop_domain = request.args.get('shop_domain')
    if not shop_domain:
        return jsonify({'error': 'shop_domain is required'}), 400

    tenant = Tenant.query.filter_by(shopify_domain=shop_domain).first()
    if not tenant or not tenant.shopify_access_token:
        return jsonify({'error': f'No tenant found for {shop_domain}'}), 404

    from ..services.store_credit_events import StoreCreditEventsService
    service = StoreCreditEventsService(tenant.shopify_domain, tenant.shopify_access_token)

    try:
        # Fetch collections using Shopify GraphQL
        query = """
        query {
            collections(first: 50) {
                edges {
                    node {
                        id
                        title
                        handle
                        productsCount {
                            count
                        }
                    }
                }
            }
        }
        """
        response = service._graphql_request(query)
        collections = []
        for edge in response.get('data', {}).get('collections', {}).get('edges', []):
            node = edge.get('node', {})
            collections.append({
                'id': node.get('id'),
                'title': node.get('title'),
                'handle': node.get('handle'),
                'products_count': node.get('productsCount', {}).get('count', 0)
            })

        return jsonify({
            'shop_domain': shop_domain,
            'collection_count': len(collections),
            'collections': collections
        })

    except Exception as e:
        logger.error(f"[DEBUG Collections] Error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@store_credit_events_bp.route('/history', methods=['GET'])
@require_shopify_auth
def list_event_history():
    """
    List past store credit events for history/ledger view.

    Query params:
        page: Page number (default 1)
        limit: Items per page (default 15, max 100)
        status: Filter by status (optional)

    Returns:
        Paginated list of past events with summary stats
    """
    from flask import g
    from ..models.promotions import StoreCreditEvent
    from ..models import Tenant

    tenant = getattr(g, 'tenant', None)
    if not tenant:
        return jsonify({'error': 'No tenant found'}), 500

    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 15, type=int), 100)
    status = request.args.get('status')

    query = StoreCreditEvent.query.filter_by(tenant_id=tenant.id)

    if status:
        query = query.filter(StoreCreditEvent.status == status)

    # Sort by created_at descending (newest first)
    query = query.order_by(StoreCreditEvent.created_at.desc())

    # Paginate
    pagination = query.paginate(page=page, per_page=limit, error_out=False)

    events = []
    for event in pagination.items:
        events.append({
            'id': event.id,
            'event_uuid': event.event_uuid,
            'name': event.name,
            'description': event.description,
            'credit_percent': float(event.credit_percent) if event.credit_percent else None,
            'date_range_start': event.date_range_start.isoformat() if event.date_range_start else None,
            'date_range_end': event.date_range_end.isoformat() if event.date_range_end else None,
            'status': event.status,
            'customers_targeted': event.customers_targeted,
            'customers_processed': event.customers_processed,
            'customers_skipped': event.customers_skipped,
            'customers_failed': event.customers_failed,
            'total_credit_amount': float(event.total_credit_amount) if event.total_credit_amount else 0,
            'created_at': event.created_at.isoformat() if event.created_at else None,
            'executed_at': event.executed_at.isoformat() if event.executed_at else None,
            'completed_at': event.completed_at.isoformat() if event.completed_at else None,
        })

    return jsonify({
        'events': events,
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages if pagination.pages > 0 else 1,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })


@store_credit_events_bp.route('/history/<int:event_id>', methods=['GET'])
@require_shopify_auth
def get_event_details(event_id: int):
    """
    Get detailed results for a specific store credit event.

    Returns:
        Full event details including individual customer results
    """
    import json
    from flask import g
    from ..models.promotions import StoreCreditEvent

    tenant = getattr(g, 'tenant', None)
    if not tenant:
        return jsonify({'error': 'No tenant found'}), 500

    event = StoreCreditEvent.query.filter_by(
        id=event_id,
        tenant_id=tenant.id
    ).first()

    if not event:
        return jsonify({'error': 'Event not found'}), 404

    # Parse execution results
    results = []
    if event.execution_results:
        try:
            results = json.loads(event.execution_results)
        except (json.JSONDecodeError, TypeError):
            pass

    # Parse filters
    filters = {}
    if event.filters:
        try:
            filters = json.loads(event.filters)
        except (json.JSONDecodeError, TypeError):
            pass

    return jsonify({
        'id': event.id,
        'event_uuid': event.event_uuid,
        'name': event.name,
        'description': event.description,
        'credit_percent': float(event.credit_percent) if event.credit_percent else None,
        'credit_amount': float(event.credit_amount) if event.credit_amount else 0,
        'filters': filters,
        'date_range_start': event.date_range_start.isoformat() if event.date_range_start else None,
        'date_range_end': event.date_range_end.isoformat() if event.date_range_end else None,
        'status': event.status,
        'customers_targeted': event.customers_targeted,
        'customers_processed': event.customers_processed,
        'customers_skipped': event.customers_skipped,
        'customers_failed': event.customers_failed,
        'total_credit_amount': float(event.total_credit_amount) if event.total_credit_amount else 0,
        'idempotency_tag': event.idempotency_tag,
        'credit_expires_at': event.credit_expires_at.isoformat() if event.credit_expires_at else None,
        'created_by': event.created_by,
        'created_at': event.created_at.isoformat() if event.created_at else None,
        'executed_at': event.executed_at.isoformat() if event.executed_at else None,
        'completed_at': event.completed_at.isoformat() if event.completed_at else None,
        'error_message': event.error_message,
        'results': results
    })


@store_credit_events_bp.route('/templates', methods=['GET'])
def list_templates():
    """
    List available event templates.

    Returns:
        Predefined event templates like Trade Night
    """
    templates = [
        {
            'id': 'trade-night',
            'name': 'Trade Night',
            'description': '10% store credit on all purchases during Trade Night hours',
            'default_sources': ['pos', 'web', 'shop'],
            'default_credit_percent': 10,
            'duration_hours': 3
        },
        {
            'id': 'grand-opening',
            'name': 'Grand Opening',
            'description': '15% store credit on opening day purchases',
            'default_sources': ['pos', 'web', 'shop'],
            'default_credit_percent': 15,
            'duration_hours': 24
        },
        {
            'id': 'holiday-promo',
            'name': 'Holiday Promotion',
            'description': '5% store credit on holiday purchases',
            'default_sources': ['pos', 'web', 'shop'],
            'default_credit_percent': 5,
            'duration_hours': 72
        }
    ]

    return jsonify({'templates': templates})
