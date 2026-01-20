"""
Cached tenant settings service.

Provides cached access to tenant settings with automatic invalidation on updates.
Uses 5-minute TTL to balance freshness with performance.

Usage:
    from app.services.tenant_settings_service import get_cached_tenant_settings, invalidate_tenant_settings

    # Get settings (cached)
    settings = get_cached_tenant_settings(tenant_id)

    # After updating settings, invalidate cache
    invalidate_tenant_settings(tenant_id)
"""
import logging
from typing import Optional, Dict, Any
from flask import current_app

from ..models import Tenant
from ..utils.settings_defaults import DEFAULT_SETTINGS, get_settings_with_defaults

logger = logging.getLogger(__name__)

# Cache TTL: 5 minutes
SETTINGS_CACHE_TTL = 300


def _get_cache():
    """Get cache instance, returns None if unavailable."""
    try:
        from ..utils.cache import cache
        return cache
    except ImportError:
        return None


def _make_cache_key(tenant_id: int) -> str:
    """Generate cache key for tenant settings."""
    return f'tenant_settings:{tenant_id}'


def get_cached_tenant_settings(tenant_id: int) -> Dict[str, Any]:
    """
    Get tenant settings with caching.

    Checks cache first, falls back to database query.
    Returns settings merged with defaults.

    Args:
        tenant_id: Tenant ID to fetch settings for

    Returns:
        Dict of settings merged with DEFAULT_SETTINGS
    """
    cache = _get_cache()
    cache_key = _make_cache_key(tenant_id)

    # Try cache first
    if cache:
        cached = cache.get(cache_key)
        if cached is not None:
            logger.debug('Cache HIT for tenant settings: %d', tenant_id)
            return cached

    # Cache miss - fetch from database
    logger.debug('Cache MISS for tenant settings: %d', tenant_id)

    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        # Return defaults if tenant not found
        return get_settings_with_defaults({})

    settings = get_settings_with_defaults(tenant.settings or {})

    # Cache the result
    if cache:
        cache.set(cache_key, settings, timeout=SETTINGS_CACHE_TTL)
        logger.debug('Cached tenant settings: %d (TTL=%d)', tenant_id, SETTINGS_CACHE_TTL)

    return settings


def invalidate_tenant_settings(tenant_id: int) -> bool:
    """
    Invalidate cached tenant settings.

    Call this after updating tenant settings to ensure fresh data.

    Args:
        tenant_id: Tenant ID whose settings cache should be cleared

    Returns:
        True if cache was invalidated, False otherwise
    """
    cache = _get_cache()
    if not cache:
        return False

    cache_key = _make_cache_key(tenant_id)
    cache.delete(cache_key)
    logger.debug('Invalidated cache for tenant settings: %d', tenant_id)
    return True


def get_cached_setting(tenant_id: int, section: str, key: str, default: Any = None) -> Any:
    """
    Get a specific setting value with caching.

    Args:
        tenant_id: Tenant ID
        section: Settings section (e.g., 'branding', 'features')
        key: Key within section
        default: Default value if not found

    Returns:
        Setting value or default
    """
    settings = get_cached_tenant_settings(tenant_id)
    return settings.get(section, {}).get(key, default)


def is_feature_enabled(tenant_id: int, feature: str) -> bool:
    """
    Check if a feature is enabled for tenant.

    Args:
        tenant_id: Tenant ID
        feature: Feature name (e.g., 'points_enabled', 'referrals_enabled')

    Returns:
        True if feature is enabled
    """
    return get_cached_setting(tenant_id, 'features', feature, False)


def get_notification_setting(tenant_id: int, notification: str) -> bool:
    """
    Check if a notification type is enabled.

    Args:
        tenant_id: Tenant ID
        notification: Notification type (e.g., 'welcome_email', 'trade_in_approved')

    Returns:
        True if notification is enabled
    """
    settings = get_cached_tenant_settings(tenant_id)
    notifications = settings.get('notifications', {})

    # Check master toggle first
    if not notifications.get('enabled', True):
        return False

    return notifications.get(notification, True)
