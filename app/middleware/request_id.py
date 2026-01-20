"""
Request ID Tracking Middleware for TradeUp.

Generates unique request IDs for tracing requests through the system:
- Adds X-Request-ID to response headers
- Makes request ID available via g.request_id
- Integrates with logging for correlation
- Accepts existing X-Request-ID from upstream (load balancer, etc.)
"""
import uuid
import logging
from flask import g, request


class RequestIdFilter(logging.Filter):
    """
    Logging filter that adds request_id to log records.

    This allows log formatters to include %(request_id)s in their format string.
    """

    def filter(self, record):
        record.request_id = getattr(g, 'request_id', '-')
        return True


def generate_request_id():
    """Generate a short, unique request ID."""
    # Use first 8 chars of UUID4 for brevity while maintaining uniqueness
    return uuid.uuid4().hex[:8]


def get_request_id():
    """
    Get the current request ID.

    Returns:
        str: The current request ID or '-' if not in a request context
    """
    return getattr(g, 'request_id', '-')


def init_request_id_tracking(app):
    """
    Initialize request ID tracking middleware.

    Adds request ID generation and propagation to every request.

    Args:
        app: Flask application instance
    """
    logger = logging.getLogger(__name__)
    logger.info('[RequestID] Request ID tracking enabled')

    # Add request ID filter to root logger
    request_id_filter = RequestIdFilter()
    for handler in logging.getLogger().handlers:
        handler.addFilter(request_id_filter)

    @app.before_request
    def set_request_id():
        """Generate or accept request ID at the start of each request."""
        # Check for existing request ID from upstream
        request_id = request.headers.get('X-Request-ID')

        if not request_id:
            # Generate new request ID
            request_id = generate_request_id()

        g.request_id = request_id

    @app.after_request
    def add_request_id_header(response):
        """Add request ID to response headers."""
        request_id = getattr(g, 'request_id', None)
        if request_id:
            response.headers['X-Request-ID'] = request_id
        return response

    return True
