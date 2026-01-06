"""
Tier management CLI commands.

Commands for scheduled tasks and administrative tier operations.

Usage:
    flask tiers process-expirations
    flask tiers check-eligibility
    flask tiers cleanup-promos
"""
import click
from flask import current_app
from flask.cli import with_appcontext
from ..extensions import db
from ..models import Tenant
from ..services.tier_service import TierService


@click.group()
def tiers():
    """Tier management commands."""
    pass


@tiers.command('process-expirations')
@click.option('--tenant-id', type=int, help='Process specific tenant (default: all)')
@click.option('--dry-run', is_flag=True, help='Show what would be processed without making changes')
@with_appcontext
def process_expirations(tenant_id, dry_run):
    """
    Process expired tier assignments.

    This command should be run periodically (e.g., hourly via cron).
    It handles:
    - Tier assignments that have passed their expiration date
    - Promotional tiers that need to be reverted
    - Subscription tiers with expired billing grace periods

    Examples:
        flask tiers process-expirations
        flask tiers process-expirations --tenant-id 1
        flask tiers process-expirations --dry-run
    """
    if tenant_id:
        tenants = [Tenant.query.get(tenant_id)]
        if not tenants[0]:
            click.echo(f'Tenant {tenant_id} not found', err=True)
            return
    else:
        tenants = Tenant.query.all()

    total_results = {
        'tenants_processed': 0,
        'processed': 0,
        'removed': 0,
        'reverted': 0,
        'errors': 0
    }

    for tenant in tenants:
        click.echo(f'Processing tenant: {tenant.name} (ID: {tenant.id})')

        if dry_run:
            # Show what would be processed
            from datetime import datetime
            from ..models import Member
            from ..models.tier_history import MemberPromoUsage

            now = datetime.utcnow()

            expired_members = Member.query.filter(
                Member.tenant_id == tenant.id,
                Member.tier_expires_at.isnot(None),
                Member.tier_expires_at <= now,
                Member.tier_id.isnot(None)
            ).all()

            expired_promos = MemberPromoUsage.query.filter(
                MemberPromoUsage.tenant_id == tenant.id,
                MemberPromoUsage.status == 'active',
                MemberPromoUsage.expires_at <= now
            ).all()

            click.echo(f'  Would process {len(expired_members)} expired tier assignments')
            for m in expired_members:
                click.echo(f'    - {m.member_number}: {m.tier.name if m.tier else "No tier"} expires {m.tier_expires_at}')

            click.echo(f'  Would process {len(expired_promos)} expired promotions')
            for p in expired_promos:
                click.echo(f'    - Member {p.member_id}: Promo {p.promotion.name if p.promotion else p.promotion_id}')

            total_results['processed'] += len(expired_members) + len(expired_promos)
        else:
            tier_service = TierService(tenant.id)
            result = tier_service.process_expired_tiers()

            total_results['tenants_processed'] += 1
            total_results['processed'] += result.get('processed', 0)
            total_results['removed'] += result.get('removed', 0)
            total_results['reverted'] += result.get('reverted', 0)
            total_results['errors'] += result.get('errors', 0)

            click.echo(f'  Processed: {result.get("processed", 0)}')
            click.echo(f'  Removed: {result.get("removed", 0)}')
            click.echo(f'  Reverted: {result.get("reverted", 0)}')
            if result.get('errors'):
                click.echo(f'  Errors: {result.get("errors", 0)}', err=True)

    click.echo('')
    click.echo('=== Summary ===')
    if dry_run:
        click.echo(f'Would process {total_results["processed"]} expirations (DRY RUN)')
    else:
        click.echo(f'Tenants processed: {total_results["tenants_processed"]}')
        click.echo(f'Total processed: {total_results["processed"]}')
        click.echo(f'Tiers removed: {total_results["removed"]}')
        click.echo(f'Promos reverted: {total_results["reverted"]}')
        if total_results['errors']:
            click.echo(f'Errors: {total_results["errors"]}', err=True)


@tiers.command('check-eligibility')
@click.option('--tenant-id', type=int, help='Process specific tenant (default: all)')
@click.option('--member-id', type=int, help='Check specific member only')
@click.option('--apply', is_flag=True, help='Actually apply eligible tier upgrades')
@with_appcontext
def check_eligibility(tenant_id, member_id, apply):
    """
    Check activity-based tier eligibility for members.

    This command evaluates members against eligibility rules and
    optionally applies tier upgrades for qualifying members.

    Should be run daily to catch members who have earned tier upgrades.

    Examples:
        flask tiers check-eligibility
        flask tiers check-eligibility --tenant-id 1 --apply
        flask tiers check-eligibility --member-id 123
    """
    if tenant_id:
        tenants = [Tenant.query.get(tenant_id)]
        if not tenants[0]:
            click.echo(f'Tenant {tenant_id} not found', err=True)
            return
    else:
        tenants = Tenant.query.all()

    total_results = {
        'checked': 0,
        'upgraded': 0,
        'unchanged': 0,
        'errors': 0
    }

    for tenant in tenants:
        click.echo(f'Checking tenant: {tenant.name} (ID: {tenant.id})')

        tier_service = TierService(tenant.id)

        member_ids = [member_id] if member_id else None
        result = tier_service.process_activity_batch(member_ids=member_ids)

        total_results['checked'] += result.get('checked', 0)
        total_results['upgraded'] += result.get('upgraded', 0)
        total_results['unchanged'] += result.get('unchanged', 0)
        total_results['errors'] += result.get('errors', 0)

        click.echo(f'  Checked: {result.get("checked", 0)}')
        click.echo(f'  Upgraded: {result.get("upgraded", 0)}')
        click.echo(f'  Unchanged: {result.get("unchanged", 0)}')
        if result.get('errors'):
            click.echo(f'  Errors: {result.get("errors", 0)}', err=True)

    click.echo('')
    click.echo('=== Summary ===')
    click.echo(f'Total checked: {total_results["checked"]}')
    click.echo(f'Total upgraded: {total_results["upgraded"]}')
    click.echo(f'Unchanged: {total_results["unchanged"]}')
    if total_results['errors']:
        click.echo(f'Errors: {total_results["errors"]}', err=True)


@tiers.command('cleanup-promos')
@click.option('--tenant-id', type=int, help='Process specific tenant (default: all)')
@click.option('--days', type=int, default=90, help='Deactivate promos ended more than N days ago')
@with_appcontext
def cleanup_promos(tenant_id, days):
    """
    Clean up old expired promotions.

    Deactivates promotions that ended more than the specified days ago.
    This helps keep the promotions list manageable.

    Examples:
        flask tiers cleanup-promos
        flask tiers cleanup-promos --days 30
    """
    from datetime import datetime, timedelta
    from ..models.tier_history import TierPromotion

    cutoff = datetime.utcnow() - timedelta(days=days)

    query = TierPromotion.query.filter(
        TierPromotion.ends_at < cutoff,
        TierPromotion.is_active == True
    )

    if tenant_id:
        query = query.filter_by(tenant_id=tenant_id)

    old_promos = query.all()

    if not old_promos:
        click.echo(f'No promotions older than {days} days to clean up')
        return

    click.echo(f'Found {len(old_promos)} promotions to deactivate:')
    for promo in old_promos:
        click.echo(f'  - {promo.name} (ended {promo.ends_at.strftime("%Y-%m-%d")})')
        promo.is_active = False

    db.session.commit()
    click.echo(f'Deactivated {len(old_promos)} old promotions')


@tiers.command('stats')
@click.option('--tenant-id', type=int, required=True, help='Tenant to get stats for')
@with_appcontext
def show_stats(tenant_id):
    """
    Show tier statistics for a tenant.

    Examples:
        flask tiers stats --tenant-id 1
    """
    from sqlalchemy import func
    from ..models import Member, MembershipTier
    from ..models.tier_history import TierChangeLog, TierPromotion

    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        click.echo(f'Tenant {tenant_id} not found', err=True)
        return

    click.echo(f'\n=== Tier Statistics for {tenant.name} ===\n')

    # Tier distribution
    click.echo('Tier Distribution:')
    tier_counts = db.session.query(
        MembershipTier.name,
        func.count(Member.id)
    ).outerjoin(
        Member, Member.tier_id == MembershipTier.id
    ).filter(
        MembershipTier.tenant_id == tenant.id,
        MembershipTier.is_active == True
    ).group_by(
        MembershipTier.id, MembershipTier.name
    ).all()

    for name, count in tier_counts:
        click.echo(f'  {name}: {count} members')

    no_tier = Member.query.filter_by(
        tenant_id=tenant.id,
        tier_id=None,
        status='active'
    ).count()
    click.echo(f'  (No tier): {no_tier} members')

    # Active promotions
    from datetime import datetime
    now = datetime.utcnow()
    active_promos = TierPromotion.query.filter(
        TierPromotion.tenant_id == tenant.id,
        TierPromotion.is_active == True,
        TierPromotion.starts_at <= now,
        TierPromotion.ends_at >= now
    ).all()

    click.echo(f'\nActive Promotions: {len(active_promos)}')
    for promo in active_promos:
        remaining_uses = (promo.max_uses - promo.current_uses) if promo.max_uses else 'unlimited'
        click.echo(f'  - {promo.name} ({promo.current_uses} uses, {remaining_uses} remaining)')

    # Recent changes
    recent = TierChangeLog.query.filter_by(
        tenant_id=tenant.id
    ).order_by(TierChangeLog.created_at.desc()).limit(5).all()

    click.echo(f'\nRecent Changes:')
    for log in recent:
        change = f'{log.previous_tier_name or "None"} -> {log.new_tier_name or "None"}'
        click.echo(f'  - {log.created_at.strftime("%Y-%m-%d %H:%M")}: {change} ({log.change_type})')


def init_app(app):
    """Register CLI commands with the Flask app."""
    app.cli.add_command(tiers)
