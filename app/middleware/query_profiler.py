"""
Query Profiling Middleware for TradeUp.

Tracks SQL query execution times and provides performance insights:
- Per-request query count and total time
- Slow query detection and logging
- N+1 query pattern detection
- Request-level query statistics

Enable with QUERY_PROFILING=true environment variable.
"""
import os
import time
import logging
from functools import wraps
from threading import local
from flask import g, request
from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# Thread-local storage for query stats
_query_stats = local()


def is_profiling_enabled():
    """Check if query profiling is enabled."""
    return os.getenv('QUERY_PROFILING', 'false').lower() == 'true'


def get_slow_query_threshold():
    """Get threshold in seconds for marking queries as slow."""
    return float(os.getenv('SLOW_QUERY_THRESHOLD', '0.1'))  # 100ms default


def get_query_stats():
    """Get query stats for current request."""
    if not hasattr(_query_stats, 'queries'):
        _query_stats.queries = []
        _query_stats.total_time = 0.0
        _query_stats.query_count = 0
    return _query_stats


def reset_query_stats():
    """Reset query stats for new request."""
    _query_stats.queries = []
    _query_stats.total_time = 0.0
    _query_stats.query_count = 0


@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Record query start time."""
    if not is_profiling_enabled():
        return
    context._query_start_time = time.perf_counter()


@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Record query end time and stats."""
    if not is_profiling_enabled():
        return

    if not hasattr(context, '_query_start_time'):
        return

    duration = time.perf_counter() - context._query_start_time
    stats = get_query_stats()
    stats.queries.append({
        'statement': statement[:500],  # Truncate long queries
        'duration': duration,
        'parameters': str(parameters)[:200] if parameters else None,
    })
    stats.total_time += duration
    stats.query_count += 1

    # Log slow queries immediately
    threshold = get_slow_query_threshold()
    if duration > threshold:
        logger.warning(
            f"Slow query detected ({duration:.3f}s > {threshold}s): {statement[:200]}"
        )


def init_query_profiler(app):
    """
    Initialize query profiling middleware.

    Call this in the app factory after creating the Flask app.
    """
    if not is_profiling_enabled():
        logger.info("[QueryProfiler] Disabled (set QUERY_PROFILING=true to enable)")
        return

    logger.info("[QueryProfiler] Enabled - tracking SQL query performance")
    threshold = get_slow_query_threshold()
    logger.info(f"[QueryProfiler] Slow query threshold: {threshold}s")

    @app.before_request
    def start_query_profiling():
        """Reset stats at the start of each request."""
        reset_query_stats()
        g.query_profile_start = time.perf_counter()

    @app.after_request
    def log_query_profile(response):
        """Log query profile after each request."""
        if not hasattr(g, 'query_profile_start'):
            return response

        stats = get_query_stats()
        request_duration = time.perf_counter() - g.query_profile_start

        # Skip logging for health checks and static assets
        if request.path in ['/health', '/'] or request.path.startswith('/assets/'):
            return response

        # Log request stats
        if stats.query_count > 0:
            db_percentage = (stats.total_time / request_duration * 100) if request_duration > 0 else 0

            log_msg = (
                f"[QueryProfile] {request.method} {request.path} - "
                f"{stats.query_count} queries in {stats.total_time:.3f}s "
                f"({db_percentage:.1f}% of {request_duration:.3f}s total)"
            )

            # Detect potential N+1 queries (many similar queries)
            if stats.query_count > 10:
                logger.warning(f"{log_msg} - Possible N+1 pattern detected!")
            elif stats.query_count > 5:
                logger.info(log_msg)
            else:
                logger.debug(log_msg)

            # Add stats to response headers in development
            if app.debug:
                response.headers['X-Query-Count'] = str(stats.query_count)
                response.headers['X-Query-Time'] = f"{stats.total_time:.3f}s"

        return response

    return True


def profile_queries(f):
    """
    Decorator to profile queries for a specific function.

    Usage:
        @profile_queries
        def my_function():
            # ... database operations
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not is_profiling_enabled():
            return f(*args, **kwargs)

        # Save current stats
        old_stats = get_query_stats()
        old_count = old_stats.query_count
        old_time = old_stats.total_time

        start = time.perf_counter()
        result = f(*args, **kwargs)
        duration = time.perf_counter() - start

        # Calculate stats for this function
        new_stats = get_query_stats()
        func_queries = new_stats.query_count - old_count
        func_time = new_stats.total_time - old_time

        if func_queries > 0:
            logger.info(
                f"[QueryProfile] {f.__name__}() - "
                f"{func_queries} queries in {func_time:.3f}s "
                f"(total execution: {duration:.3f}s)"
            )

        return result

    return decorated


def get_request_query_summary():
    """
    Get a summary of queries for the current request.

    Returns:
        dict: Query statistics including count, total time, and slow queries
    """
    stats = get_query_stats()
    threshold = get_slow_query_threshold()

    slow_queries = [
        q for q in stats.queries
        if q['duration'] > threshold
    ]

    return {
        'query_count': stats.query_count,
        'total_time': round(stats.total_time, 4),
        'slow_query_count': len(slow_queries),
        'slow_queries': slow_queries[:10],  # Limit to top 10
        'threshold': threshold,
    }
