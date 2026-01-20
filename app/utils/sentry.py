"""
Sentry Error Tracking Integration.

Captures exceptions and performance data for TradeUp.
"""
import os
import logging

logger = logging.getLogger(__name__)


def init_sentry(app=None):
    """
    Initialize Sentry error tracking.

    Sentry DSN should be set via SENTRY_DSN environment variable.
    If not set, Sentry will be disabled (development mode).

    Args:
        app: Optional Flask app for integrations
    """
    dsn = os.getenv('SENTRY_DSN')
    if not dsn:
        logger.info('Sentry DSN not configured, error tracking disabled')
        return None

    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        environment = os.getenv('FLASK_ENV', 'development')
        release = os.getenv('RAILWAY_GIT_COMMIT_SHA', 'unknown')[:7]

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            release=f"tradeup@{release}",
            integrations=[
                FlaskIntegration(transaction_style="url"),
                SqlalchemyIntegration(),
            ],
            # Performance monitoring
            traces_sample_rate=0.1,  # Sample 10% of transactions
            profiles_sample_rate=0.1,  # Profile 10% of sampled transactions

            # Filter out health check noise
            before_send=filter_events,

            # Don't send personal info
            send_default_pii=False,

            # Attach request data
            attach_stacktrace=True,
        )

        logger.info(f'Sentry initialized (env: {environment})')
        return sentry_sdk

    except ImportError:
        logger.info('sentry-sdk not installed, error tracking disabled')
        return None


def filter_events(event, hint):
    """
    Filter out noisy events before sending to Sentry.

    Returns None to drop the event, or the event to send it.
    """
    # Skip health check errors
    if 'request' in event:
        url = event['request'].get('url', '')
        if '/health' in url or url.endswith('/'):
            return None

    # Skip 404s
    if 'exception' in event:
        for exception in event['exception'].get('values', []):
            if exception.get('type') == 'NotFound':
                return None

    return event


def capture_exception(error, extra=None):
    """
    Capture an exception to Sentry.

    Args:
        error: The exception to capture
        extra: Optional dict of extra context
    """
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            if extra:
                for key, value in extra.items():
                    scope.set_extra(key, value)
            sentry_sdk.capture_exception(error)
    except ImportError:
        pass


def capture_message(message, level='info', extra=None):
    """
    Send a message to Sentry.

    Args:
        message: The message to send
        level: Log level (debug, info, warning, error, fatal)
        extra: Optional dict of extra context
    """
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            if extra:
                for key, value in extra.items():
                    scope.set_extra(key, value)
            sentry_sdk.capture_message(message, level=level)
    except ImportError:
        pass


def set_user(user_id=None, email=None, shop=None):
    """
    Set user context for Sentry events.

    Args:
        user_id: User/staff ID
        email: User email
        shop: Shopify shop domain
    """
    try:
        import sentry_sdk
        sentry_sdk.set_user({
            'id': user_id,
            'email': email,
            'shop': shop,
        })
    except ImportError:
        pass
