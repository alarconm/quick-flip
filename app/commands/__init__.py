"""
CLI Commands for TradeUp.

Provides Flask CLI commands for scheduled tasks and administration.

Usage:
    flask tiers process-expirations    # Process expired tier assignments
    flask tiers check-eligibility      # Check activity-based eligibility
    flask tiers stats --tenant-id 1    # Show tier statistics
"""
from .tiers import init_app as init_tier_commands


def init_app(app):
    """Register all CLI commands with the Flask app."""
    init_tier_commands(app)
