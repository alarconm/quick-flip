"""
Background scheduler for automated tasks.

Handles:
- Monthly store credit distribution (1st of each month at 6 AM UTC)
- Credit expiration processing (daily at midnight UTC)
- Expiration warnings (daily at 9 AM UTC)
"""
import os
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler = None
_flask_app = None  # Store Flask app reference for context


def init_scheduler(app):
    """
    Initialize the background scheduler.

    Only runs in production or when ENABLE_SCHEDULER=true.
    Only the main gunicorn process should run the scheduler.
    """
    global _scheduler, _flask_app

    # Store app reference for context in job functions
    _flask_app = app

    # Don't run scheduler in testing
    if app.config.get('TESTING'):
        # Use print to avoid app context issues during validation
        print('[Scheduler] Disabled in testing mode')
        return

    # Only enable scheduler in production or when explicitly enabled
    if not (os.getenv('FLASK_ENV') == 'production' or os.getenv('ENABLE_SCHEDULER') == 'true'):
        # Use print to avoid app context issues during validation
        print('[Scheduler] Disabled (set FLASK_ENV=production or ENABLE_SCHEDULER=true)')
        return

    # Prevent multiple scheduler instances (important for gunicorn workers)
    # Only run scheduler if this is the main/first worker
    if os.getenv('SCHEDULER_RUNNING') == 'true':
        print('[Scheduler] Already running in another process')
        return

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        _scheduler = BackgroundScheduler(
            timezone='UTC',
            job_defaults={
                'coalesce': True,  # Combine missed runs
                'max_instances': 1,  # Prevent concurrent runs
                'misfire_grace_time': 3600  # 1 hour grace period
            }
        )

        # Monthly credits - 1st of each month at 6 AM UTC
        _scheduler.add_job(
            run_monthly_credits,
            trigger=CronTrigger(day=1, hour=6, minute=0),
            id='monthly_credits',
            name='Distribute monthly tier credits',
            replace_existing=True
        )

        # Credit expiration - Daily at midnight UTC
        _scheduler.add_job(
            run_credit_expiration,
            trigger=CronTrigger(hour=0, minute=0),
            id='credit_expiration',
            name='Process expired credits',
            replace_existing=True
        )

        # Expiration warnings - Daily at 9 AM UTC
        _scheduler.add_job(
            run_expiration_warnings,
            trigger=CronTrigger(hour=9, minute=0),
            id='expiration_warnings',
            name='Send credit expiration warnings',
            replace_existing=True
        )

        # Pending distribution expiration - Daily at 1 AM UTC
        _scheduler.add_job(
            run_pending_expiration,
            trigger=CronTrigger(hour=1, minute=0),
            id='pending_expiration',
            name='Expire old pending distributions',
            replace_existing=True
        )

        _scheduler.start()
        os.environ['SCHEDULER_RUNNING'] = 'true'

        # Use print during init to avoid app context issues
        print('[Scheduler] Started with 4 scheduled jobs:')
        print('  - Monthly credits: 1st of month at 6:00 UTC (creates pending for approval)')
        print('  - Credit expiration: Daily at 0:00 UTC')
        print('  - Pending expiration: Daily at 1:00 UTC')
        print('  - Expiration warnings: Daily at 9:00 UTC')

        # Register shutdown
        import atexit
        atexit.register(shutdown_scheduler)

    except ImportError:
        print('[Scheduler] APScheduler not installed, automated tasks disabled')
    except Exception as e:
        print(f'[Scheduler] Failed to initialize: {e}')


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info('[Scheduler] Shutdown complete')


def run_monthly_credits():
    """
    Create pending distributions for monthly credits (with approval workflow).

    Runs on the 1st of each month. Creates pending distributions that require
    merchant approval before actual credit distribution. If auto-approve is
    enabled AND first distribution has been manually approved, credits are
    distributed immediately.
    """
    global _flask_app

    if not _flask_app:
        logger.error('[Scheduler] Flask app not initialized')
        return

    logger.info('[Scheduler] Starting monthly credit processing...')

    with _flask_app.app_context():
        try:
            from ..extensions import db
            from ..models.tenant import Tenant
            from ..services.pending_distribution_service import PendingDistributionService

            # Get all active tenants
            tenants = Tenant.query.filter_by(subscription_active=True).all()

            pending_service = PendingDistributionService()

            total_pending = 0
            total_auto_approved = 0
            total_skipped = 0

            for tenant in tenants:
                try:
                    # Check if auto-approve is enabled and first distribution completed
                    if pending_service.should_auto_approve(tenant.id):
                        # Create and immediately approve
                        pending = pending_service.create_monthly_credit_pending(tenant.id)
                        result = pending_service.approve_distribution(
                            pending_id=pending.id,
                            tenant_id=tenant.id,
                            approved_by='system:auto-approve'
                        )
                        execution = result.get('execution_result', {})
                        total_auto_approved += 1

                        logger.info(
                            f'[Scheduler] Tenant {tenant.id}: Auto-approved - '
                            f'{execution.get("credited", 0)} members credited '
                            f'${execution.get("total_amount", 0):.2f}'
                        )
                    else:
                        # Create pending distribution for merchant review
                        pending = pending_service.create_monthly_credit_pending(tenant.id)
                        pending_service.send_approval_notification(pending)
                        total_pending += 1

                        preview = pending.preview_data or {}
                        logger.info(
                            f'[Scheduler] Tenant {tenant.id}: Pending approval - '
                            f'{preview.get("total_members", 0)} members, '
                            f'${preview.get("total_amount", 0):.2f}'
                        )

                except ValueError as e:
                    # Already exists for this month - skip
                    total_skipped += 1
                    logger.info(f'[Scheduler] Tenant {tenant.id}: Skipped - {e}')

                except Exception as e:
                    logger.error(f'[Scheduler] Failed for tenant {tenant.id}: {e}')

            logger.info(
                f'[Scheduler] Monthly credits complete: '
                f'{total_pending} pending approval, {total_auto_approved} auto-approved, '
                f'{total_skipped} skipped'
            )

        except Exception as e:
            logger.error(f'[Scheduler] Monthly credits failed: {e}')


def run_credit_expiration():
    """
    Process expired credits for all tenants.
    Runs daily at midnight.
    """
    global _flask_app

    if not _flask_app:
        logger.error('[Scheduler] Flask app not initialized')
        return

    logger.info('[Scheduler] Processing credit expirations...')

    with _flask_app.app_context():
        try:
            from ..extensions import db
            from ..models.tenant import Tenant
            from ..services.scheduled_tasks import ScheduledTasksService

            tenants = Tenant.query.filter_by(subscription_active=True).all()

            total_expired = 0
            total_amount = 0

            service = ScheduledTasksService()

            for tenant in tenants:
                try:
                    result = service.expire_old_credits(tenant.id, dry_run=False)

                    total_expired += result.get('expired_count', 0)
                    total_amount += float(result.get('total_amount', 0))

                except Exception as e:
                    logger.error(f'[Scheduler] Expiration failed for tenant {tenant.id}: {e}')

            logger.info(
                f'[Scheduler] Credit expiration complete: '
                f'{total_expired} entries, ${total_amount:.2f} expired'
            )

        except Exception as e:
            logger.error(f'[Scheduler] Credit expiration failed: {e}')


def run_expiration_warnings():
    """
    Send expiration warning emails for points/credits expiring soon.
    Runs daily at 9 AM.
    """
    global _flask_app

    if not _flask_app:
        logger.error('[Scheduler] Flask app not initialized')
        return

    logger.info('[Scheduler] Sending expiration warnings...')

    with _flask_app.app_context():
        try:
            from ..extensions import db
            from ..models.tenant import Tenant
            from ..services.scheduled_tasks import ScheduledTasksService

            tenants = Tenant.query.filter_by(subscription_active=True).all()

            total_warnings = 0

            service = ScheduledTasksService()

            for tenant in tenants:
                try:
                    # Send warnings for points expiring in 30 days
                    result = service.send_points_expiry_warnings(tenant.id, dry_run=False)
                    total_warnings += result.get('warnings_sent', 0)

                except Exception as e:
                    logger.error(f'[Scheduler] Warnings failed for tenant {tenant.id}: {e}')

            logger.info(f'[Scheduler] Expiration warnings complete: {total_warnings} sent')

        except Exception as e:
            logger.error(f'[Scheduler] Expiration warnings failed: {e}')


def run_pending_expiration():
    """
    Expire old pending distributions that weren't approved in time.
    Runs daily at 1 AM.
    """
    global _flask_app

    if not _flask_app:
        logger.error('[Scheduler] Flask app not initialized')
        return

    logger.info('[Scheduler] Processing pending distribution expirations...')

    with _flask_app.app_context():
        try:
            from ..services.pending_distribution_service import PendingDistributionService

            service = PendingDistributionService()
            expired_count = service.expire_old_pending()

            logger.info(f'[Scheduler] Pending expiration complete: {expired_count} expired')

        except Exception as e:
            logger.error(f'[Scheduler] Pending expiration failed: {e}')


def get_next_run_times() -> dict:
    """Get the next scheduled run times for all jobs."""
    global _scheduler

    if not _scheduler:
        return {'error': 'Scheduler not initialized'}

    jobs = {}
    for job in _scheduler.get_jobs():
        next_run = job.next_run_time
        jobs[job.id] = {
            'name': job.name,
            'next_run': next_run.isoformat() if next_run else None
        }

    return jobs
