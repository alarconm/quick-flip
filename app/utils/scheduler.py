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

        # Anniversary rewards - Daily at 8 AM UTC
        _scheduler.add_job(
            run_anniversary_rewards,
            trigger=CronTrigger(hour=8, minute=0),
            id='anniversary_rewards',
            name='Process anniversary rewards',
            replace_existing=True
        )

        # Anniversary reminders - Daily at 7 AM UTC (before anniversary rewards)
        _scheduler.add_job(
            run_anniversary_reminders,
            trigger=CronTrigger(hour=7, minute=0),
            id='anniversary_reminders',
            name='Send anniversary advance reminders',
            replace_existing=True
        )

        _scheduler.start()
        os.environ['SCHEDULER_RUNNING'] = 'true'

        # Use print during init to avoid app context issues
        print('[Scheduler] Started with 6 scheduled jobs:')
        print('  - Monthly credits: 1st of month at 6:00 UTC (creates pending for approval)')
        print('  - Credit expiration: Daily at 0:00 UTC')
        print('  - Pending expiration: Daily at 1:00 UTC')
        print('  - Anniversary reminders: Daily at 7:00 UTC')
        print('  - Anniversary rewards: Daily at 8:00 UTC')
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


def run_anniversary_rewards():
    """
    Process anniversary rewards for all tenants.
    Runs daily at 8 AM UTC to issue rewards and send emails to members with anniversaries today.
    """
    global _flask_app

    if not _flask_app:
        logger.error('[Scheduler] Flask app not initialized')
        return

    logger.info('[Scheduler] Processing anniversary rewards...')

    with _flask_app.app_context():
        try:
            from ..extensions import db
            from ..models.tenant import Tenant
            from ..services.anniversary_service import AnniversaryService
            from ..services.notification_service import notification_service

            # Get all active tenants
            tenants = Tenant.query.filter_by(subscription_active=True).all()

            total_rewarded = 0
            total_emails_sent = 0
            total_failed = 0

            for tenant in tenants:
                try:
                    # Create service instance for this tenant
                    service = AnniversaryService(tenant.id)
                    settings = service.get_anniversary_settings()

                    # Skip if anniversary rewards are disabled
                    if not settings.get('enabled'):
                        continue

                    # Process anniversary rewards for this tenant
                    result = service.process_anniversary_rewards()

                    if result.get('success'):
                        successful = result.get('successful', 0)
                        total_rewarded += successful

                        # Send anniversary emails for each successfully rewarded member
                        for detail in result.get('details', []):
                            if detail.get('success'):
                                try:
                                    email_result = notification_service.send_anniversary_reward(
                                        tenant_id=tenant.id,
                                        member_id=detail.get('member_id'),
                                        anniversary_year=detail.get('anniversary_year', 1),
                                        reward_type=detail.get('reward_type', 'points'),
                                        reward_amount=detail.get('reward_amount', 0),
                                        custom_message=settings.get('message', '')
                                    )
                                    if email_result.get('success'):
                                        total_emails_sent += 1
                                    elif not email_result.get('skipped'):
                                        logger.warning(
                                            f'[Scheduler] Anniversary email failed for member {detail.get("member_id")}: '
                                            f'{email_result.get("error", "Unknown error")}'
                                        )
                                except Exception as e:
                                    logger.error(f'[Scheduler] Anniversary email error for member {detail.get("member_id")}: {e}')

                        logger.info(
                            f'[Scheduler] Tenant {tenant.id}: {successful} anniversary rewards issued, '
                            f'{result.get("already_rewarded", 0)} already rewarded'
                        )
                    else:
                        if result.get('error') != 'Anniversary rewards not enabled':
                            logger.warning(f'[Scheduler] Tenant {tenant.id}: {result.get("error", "Unknown error")}')

                except Exception as e:
                    total_failed += 1
                    logger.error(f'[Scheduler] Anniversary rewards failed for tenant {tenant.id}: {e}')

            logger.info(
                f'[Scheduler] Anniversary rewards complete: '
                f'{total_rewarded} rewards issued, {total_emails_sent} emails sent, '
                f'{total_failed} tenant failures'
            )

        except Exception as e:
            logger.error(f'[Scheduler] Anniversary rewards failed: {e}')


def run_anniversary_reminders():
    """
    Send anniversary advance reminder emails for all tenants.
    Runs daily at 7 AM UTC (before anniversary rewards at 8 AM).

    Only sends reminders if:
    - Anniversary rewards are enabled for the tenant
    - email_days_before > 0 (advance reminders configured)
    - Member's anniversary is exactly email_days_before days away
    """
    global _flask_app

    if not _flask_app:
        logger.error('[Scheduler] Flask app not initialized')
        return

    logger.info('[Scheduler] Processing anniversary reminders...')

    with _flask_app.app_context():
        try:
            from ..extensions import db
            from ..models.tenant import Tenant
            from ..services.anniversary_service import AnniversaryService

            # Get all active tenants
            tenants = Tenant.query.filter_by(subscription_active=True).all()

            total_reminders_sent = 0
            total_failed = 0
            tenants_with_reminders = 0

            for tenant in tenants:
                try:
                    # Create service instance for this tenant
                    service = AnniversaryService(tenant.id)
                    settings = service.get_anniversary_settings()

                    # Skip if anniversary rewards are disabled
                    if not settings.get('enabled'):
                        continue

                    # Skip if advance reminders not configured
                    email_days_before = settings.get('email_days_before', 0)
                    if email_days_before <= 0:
                        continue

                    # Process anniversary reminders for this tenant
                    result = service.process_anniversary_reminders()

                    if result.get('success'):
                        successful = result.get('successful', 0)
                        if successful > 0:
                            total_reminders_sent += successful
                            tenants_with_reminders += 1
                            logger.info(
                                f'[Scheduler] Tenant {tenant.id}: {successful} anniversary reminders sent '
                                f'({email_days_before} days in advance)'
                            )
                    else:
                        if result.get('error') not in ['Anniversary rewards not enabled', 'Advance reminders not configured']:
                            logger.warning(f'[Scheduler] Tenant {tenant.id}: {result.get("error", "Unknown error")}')

                except Exception as e:
                    total_failed += 1
                    logger.error(f'[Scheduler] Anniversary reminders failed for tenant {tenant.id}: {e}')

            logger.info(
                f'[Scheduler] Anniversary reminders complete: '
                f'{total_reminders_sent} reminders sent across {tenants_with_reminders} tenants, '
                f'{total_failed} tenant failures'
            )

        except Exception as e:
            logger.error(f'[Scheduler] Anniversary reminders failed: {e}')


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
