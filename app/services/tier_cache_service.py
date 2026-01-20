"""
Cached tier configuration service.

Provides cached access to tier configurations with automatic invalidation on changes.
Uses 5-minute TTL to balance freshness with performance.

Usage:
    from app.services.tier_cache_service import (
        get_cached_tiers,
        get_cached_tier_by_id,
        invalidate_tier_cache
    )

    # Get all tiers for tenant (cached)
    tiers = get_cached_tiers(tenant_id)

    # Get specific tier (uses cached tier list)
    tier = get_cached_tier_by_id(tenant_id, tier_id)

    # After creating/updating/deleting tier, invalidate cache
    invalidate_tier_cache(tenant_id)
"""
import logging
from typing import Optional, Dict, Any, List

from ..models import MembershipTier

logger = logging.getLogger(__name__)

# Cache TTL: 5 minutes
TIER_CACHE_TTL = 300


def _get_cache():
    """Get cache instance, returns None if unavailable."""
    try:
        from ..utils.cache import cache
        return cache
    except ImportError:
        return None


def _make_cache_key(tenant_id: int) -> str:
    """Generate cache key for tenant tiers."""
    return f'tenant_tiers:{tenant_id}'


def get_cached_tiers(tenant_id: int, active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Get tier configurations for tenant with caching.

    Checks cache first, falls back to database query.
    Returns list of tier dictionaries.

    Args:
        tenant_id: Tenant ID to fetch tiers for
        active_only: If True, only return active tiers (default)

    Returns:
        List of tier dicts sorted by display_order
    """
    cache = _get_cache()
    cache_key = _make_cache_key(tenant_id)

    # Only use cache for active_only=True (most common case)
    if cache and active_only:
        cached = cache.get(cache_key)
        if cached is not None:
            logger.debug('Cache HIT for tiers: tenant=%d', tenant_id)
            return cached

    # Cache miss - fetch from database
    logger.debug('Cache MISS for tiers: tenant=%d', tenant_id)

    query = MembershipTier.query.filter_by(tenant_id=tenant_id)
    if active_only:
        query = query.filter_by(is_active=True)

    tiers = query.order_by(MembershipTier.display_order).all()
    tier_list = [t.to_dict() for t in tiers]

    # Cache the result (only for active_only=True)
    if cache and active_only:
        cache.set(cache_key, tier_list, timeout=TIER_CACHE_TTL)
        logger.debug('Cached tiers: tenant=%d count=%d (TTL=%d)', tenant_id, len(tier_list), TIER_CACHE_TTL)

    return tier_list


def get_cached_tier_by_id(tenant_id: int, tier_id: int) -> Optional[Dict[str, Any]]:
    """
    Get a specific tier by ID from cached tier list.

    Args:
        tenant_id: Tenant ID
        tier_id: Tier ID to find

    Returns:
        Tier dict or None if not found
    """
    tiers = get_cached_tiers(tenant_id, active_only=False)
    for tier in tiers:
        if tier.get('id') == tier_id:
            return tier
    return None


def get_tier_for_member(tenant_id: int, tier_id: Optional[int]) -> Optional[Dict[str, Any]]:
    """
    Get tier data for a member, with caching.

    Useful when accessing member.tier in endpoints.

    Args:
        tenant_id: Tenant ID
        tier_id: Member's tier_id (can be None)

    Returns:
        Tier dict or None if no tier assigned
    """
    if tier_id is None:
        return None
    return get_cached_tier_by_id(tenant_id, tier_id)


def invalidate_tier_cache(tenant_id: int) -> bool:
    """
    Invalidate cached tier configurations.

    Call this after creating, updating, or deleting tiers.

    Args:
        tenant_id: Tenant ID whose tier cache should be cleared

    Returns:
        True if cache was invalidated, False otherwise
    """
    cache = _get_cache()
    if not cache:
        return False

    cache_key = _make_cache_key(tenant_id)
    cache.delete(cache_key)
    logger.debug('Invalidated cache for tiers: tenant=%d', tenant_id)
    return True


def get_default_tier(tenant_id: int) -> Optional[Dict[str, Any]]:
    """
    Get the default (lowest order) tier for a tenant.

    Useful for auto-enrollment.

    Args:
        tenant_id: Tenant ID

    Returns:
        Tier dict or None if no tiers exist
    """
    tiers = get_cached_tiers(tenant_id, active_only=True)
    return tiers[0] if tiers else None


def get_tier_bonus_rate(tenant_id: int, tier_id: Optional[int]) -> float:
    """
    Get the bonus rate for a tier, with caching.

    Args:
        tenant_id: Tenant ID
        tier_id: Tier ID (can be None)

    Returns:
        Bonus rate (e.g., 0.05 for 5%), or 0.0 if no tier
    """
    tier = get_tier_for_member(tenant_id, tier_id)
    if tier:
        return float(tier.get('bonus_rate', 0))
    return 0.0
