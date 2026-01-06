"""
API Rate Limiting Middleware.

Protects TradeUp API endpoints from abuse using Flask-Limiter.
Rate limits are shop-based for authenticated requests.
"""
import os
from flask import request, g, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def get_rate_limit_key():
    """
    Generate rate limit key based on shop domain or IP.

    For authenticated requests: Uses shop domain for per-shop limits
    For unauthenticated: Uses IP address
    """
    # Check for shop in request context (set by shopify_auth middleware)
    shop = getattr(g, 'shop', None)
    if shop:
        return f"shop:{shop}"

    # Check for shop in query params
    shop = request.args.get('shop')
    if shop:
        return f"shop:{shop}"

    # Check for shop in headers
    shop = request.headers.get('X-Shop-Domain')
    if shop:
        return f"shop:{shop}"

    # Fall back to IP address
    return f"ip:{get_remote_address()}"


def get_limiter_storage():
    """
    Get rate limiter storage backend.

    Uses Redis if available, otherwise memory.
    """
    redis_url = os.getenv('REDIS_URL')
    if redis_url:
        return f"redis://{redis_url}"

    # In-memory storage for development/small deployments
    return "memory://"


# Initialize limiter
limiter = Limiter(
    key_func=get_rate_limit_key,
    storage_uri=get_limiter_storage(),
    default_limits=["200 per minute", "5000 per hour"],  # Default limits
    strategy="fixed-window",
)


# Custom rate limit decorators for different endpoint types
def ratelimit_standard(f):
    """Standard rate limit: 60 requests per minute."""
    return limiter.limit("60 per minute")(f)


def ratelimit_strict(f):
    """Strict rate limit: 10 requests per minute (for sensitive operations)."""
    return limiter.limit("10 per minute")(f)


def ratelimit_relaxed(f):
    """Relaxed rate limit: 200 requests per minute (for read-heavy endpoints)."""
    return limiter.limit("200 per minute")(f)


def ratelimit_webhook(f):
    """Webhook rate limit: 100 per minute per shop."""
    return limiter.limit("100 per minute")(f)


# Error handler for rate limit exceeded
def ratelimit_error_handler(e):
    """Custom error response for rate limit exceeded."""
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': 'Too many requests. Please try again later.',
        'code': 'RATE_LIMIT_EXCEEDED',
        'retry_after': e.description,
    }), 429


def init_rate_limiter(app):
    """
    Initialize rate limiter with Flask app.

    Call this in the app factory after creating the Flask app.
    """
    limiter.init_app(app)

    # Register custom error handler
    app.register_error_handler(429, ratelimit_error_handler)

    # Exempt health check endpoints
    limiter.exempt(lambda: request.path in ['/health', '/', '/api/promotions/health'])

    return limiter
