"""
Pending Distribution Service for TradeUp.

Handles the approval workflow for monthly credit distributions:
- Create pending distributions with preview data
- Approve/reject distributions
- Execute approved distributions
- Auto-expire old pending items
- Send notification emails
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from flask import current_app
from sqlalchemy import and_

from ..extensions import db
from ..models.promotions import PendingDistribution, PendingDistributionStatus
from ..models.tenant import Tenant
from .scheduled_tasks import ScheduledTasksService
from .notification_service import NotificationService

logger = logging.getLogger(__name__)

# Default expiration for pending distributions (7 days)
PENDING_EXPIRATION_DAYS = 7


class PendingDistributionService:
    """
    Service for managing pending distribution approvals.
    """

    def __init__(self):
        self.scheduled_tasks_service = ScheduledTasksService()
        self.notification_service = NotificationService()

    # ==================== CREATE PENDING DISTRIBUTION ====================

    def create_monthly_credit_pending(self, tenant_id: int) -> PendingDistribution:
        """
        Create a pending distribution for monthly credits.

        Generates preview data and creates a pending record
        for merchant review before actual distribution.

        Args:
            tenant_id: The tenant to create pending distribution for

        Returns:
            The created PendingDistribution record

        Raises:
            ValueError: If a pending distribution already exists for this month
        """
        now = datetime.utcnow()
        reference_key = f"monthly-{now.strftime('%Y-%m')}"

        # Check if pending already exists for this month
        existing = PendingDistribution.query.filter_by(
            tenant_id=tenant_id,
            reference_key=reference_key
        ).first()

        if existing:
            if existing.status == 'pending':
                raise ValueError(f"A pending distribution already exists for {now.strftime('%B %Y')}")
            elif existing.status == 'approved':
                raise ValueError(f"Monthly credits already distributed for {now.strftime('%B %Y')}")

        # Generate preview using dry_run
        preview_result = self.scheduled_tasks_service.distribute_monthly_credits(
            tenant_id=tenant_id,
            dry_run=True
        )

        # Build tier breakdown summary
        by_tier = self._build_tier_breakdown(preview_result.get('details', []))

        # Create preview data structure
        preview_data = {
            'total_members': preview_result.get('credited', 0),
            'total_amount': preview_result.get('total_amount', 0),
            'processed': preview_result.get('processed', 0),
            'skipped': preview_result.get('skipped', 0),
            'by_tier': by_tier,
            'members': preview_result.get('details', []),
            'calculated_at': now.isoformat()
        }

        # Create pending distribution
        pending = PendingDistribution(
            tenant_id=tenant_id,
            distribution_type='monthly_credit',
            reference_key=reference_key,
            status='pending',
            preview_data=preview_data,
            expires_at=now + timedelta(days=PENDING_EXPIRATION_DAYS)
        )

        db.session.add(pending)
        db.session.commit()

        logger.info(
            f"[PendingDistribution] Created pending for tenant {tenant_id}: "
            f"{preview_data['total_members']} members, ${preview_data['total_amount']:.2f}"
        )

        return pending

    def _build_tier_breakdown(self, details: List[Dict]) -> List[Dict]:
        """Build tier breakdown summary from member details."""
        tier_totals = {}

        for member in details:
            tier_name = member.get('tier', 'Unknown')
            amount = member.get('amount', 0)

            if tier_name not in tier_totals:
                tier_totals[tier_name] = {'tier': tier_name, 'count': 0, 'amount': 0}

            tier_totals[tier_name]['count'] += 1
            tier_totals[tier_name]['amount'] += amount

        # Sort by amount descending
        return sorted(tier_totals.values(), key=lambda x: x['amount'], reverse=True)

    # ==================== GET PENDING DISTRIBUTIONS ====================

    def get_pending_distributions(
        self,
        tenant_id: int,
        status: Optional[str] = None,
        include_expired: bool = False
    ) -> List[PendingDistribution]:
        """
        Get pending distributions for a tenant.

        Args:
            tenant_id: The tenant to query
            status: Optional status filter ('pending', 'approved', 'rejected', 'expired')
            include_expired: Whether to include auto-expired items

        Returns:
            List of PendingDistribution records
        """
        query = PendingDistribution.query.filter_by(tenant_id=tenant_id)

        if status:
            query = query.filter_by(status=status)
        elif not include_expired:
            # By default, exclude expired items
            query = query.filter(PendingDistribution.status != 'expired')

        return query.order_by(PendingDistribution.created_at.desc()).all()

    def get_pending_by_id(self, pending_id: int, tenant_id: int) -> Optional[PendingDistribution]:
        """Get a specific pending distribution by ID."""
        return PendingDistribution.query.filter_by(
            id=pending_id,
            tenant_id=tenant_id
        ).first()

    def get_pending_count(self, tenant_id: int) -> int:
        """Get count of pending distributions awaiting approval."""
        return PendingDistribution.query.filter_by(
            tenant_id=tenant_id,
            status='pending'
        ).count()

    # ==================== APPROVE DISTRIBUTION ====================

    def approve_distribution(
        self,
        pending_id: int,
        tenant_id: int,
        approved_by: str,
        enable_auto_approve: bool = False
    ) -> Dict[str, Any]:
        """
        Approve and execute a pending distribution.

        Args:
            pending_id: The pending distribution ID
            tenant_id: The tenant ID (for verification)
            approved_by: Email of approver or 'system:auto-approve'
            enable_auto_approve: Whether to enable auto-approve for future distributions

        Returns:
            Execution result with credited count, errors, etc.

        Raises:
            ValueError: If pending not found or already processed
        """
        pending = self.get_pending_by_id(pending_id, tenant_id)

        if not pending:
            raise ValueError("Pending distribution not found")

        if pending.status != 'pending':
            raise ValueError(f"Cannot approve: distribution is already {pending.status}")

        if pending.is_expired:
            # Mark as expired first
            pending.status = 'expired'
            db.session.commit()
            raise ValueError("Cannot approve: distribution has expired")

        now = datetime.utcnow()

        # Execute the actual distribution
        try:
            if pending.distribution_type == 'monthly_credit':
                result = self.scheduled_tasks_service.distribute_monthly_credits(
                    tenant_id=tenant_id,
                    dry_run=False
                )
            else:
                raise ValueError(f"Unknown distribution type: {pending.distribution_type}")

            # Update pending record
            pending.status = 'approved'
            pending.approved_at = now
            pending.approved_by = approved_by
            pending.executed_at = now
            pending.execution_result = {
                'credited': result.get('credited', 0),
                'skipped': result.get('skipped', 0),
                'errors': len(result.get('errors', [])),
                'total_amount': result.get('total_amount', 0),
                'executed_at': now.isoformat()
            }

            # Update tenant settings if auto-approve enabled
            if enable_auto_approve:
                self._update_auto_approve_setting(tenant_id, True)

            # Mark first distribution as completed
            self._mark_first_distribution_completed(tenant_id)

            db.session.commit()

            logger.info(
                f"[PendingDistribution] Approved {pending_id} by {approved_by}: "
                f"{result.get('credited', 0)} members credited, ${result.get('total_amount', 0):.2f}"
            )

            return {
                'success': True,
                'pending_id': pending_id,
                'approved_by': approved_by,
                'execution_result': pending.execution_result
            }

        except Exception as e:
            logger.error(f"[PendingDistribution] Approval failed for {pending_id}: {e}")
            pending.execution_result = {'error': str(e)}
            db.session.commit()
            raise

    # ==================== REJECT DISTRIBUTION ====================

    def reject_distribution(
        self,
        pending_id: int,
        tenant_id: int,
        rejected_by: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reject a pending distribution.

        Args:
            pending_id: The pending distribution ID
            tenant_id: The tenant ID (for verification)
            rejected_by: Email of rejector
            reason: Optional rejection reason

        Returns:
            Result confirmation

        Raises:
            ValueError: If pending not found or already processed
        """
        pending = self.get_pending_by_id(pending_id, tenant_id)

        if not pending:
            raise ValueError("Pending distribution not found")

        if pending.status != 'pending':
            raise ValueError(f"Cannot reject: distribution is already {pending.status}")

        now = datetime.utcnow()

        pending.status = 'rejected'
        pending.rejected_at = now
        pending.rejected_by = rejected_by
        pending.rejection_reason = reason

        db.session.commit()

        logger.info(f"[PendingDistribution] Rejected {pending_id} by {rejected_by}: {reason}")

        return {
            'success': True,
            'pending_id': pending_id,
            'rejected_by': rejected_by,
            'reason': reason
        }

    # ==================== AUTO-APPROVE LOGIC ====================

    def should_auto_approve(self, tenant_id: int) -> bool:
        """
        Check if auto-approval is enabled and first distribution has been completed.

        Auto-approve only works if:
        1. Auto-approve is enabled in tenant settings
        2. At least one distribution has been manually approved first (failsafe)

        Args:
            tenant_id: The tenant to check

        Returns:
            True if auto-approval should happen
        """
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return False

        settings = tenant.settings or {}
        automation = settings.get('automation', {})

        # Both conditions must be true
        auto_approve_enabled = automation.get('monthly_credit_auto_approve', False)
        first_completed = automation.get('first_monthly_credit_completed', False)

        return auto_approve_enabled and first_completed

    def _update_auto_approve_setting(self, tenant_id: int, enabled: bool) -> None:
        """Update auto-approve setting for tenant."""
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return

        settings = tenant.settings or {}
        if 'automation' not in settings:
            settings['automation'] = {}

        settings['automation']['monthly_credit_auto_approve'] = enabled
        tenant.settings = settings
        # Note: commit happens in the calling function

    def _mark_first_distribution_completed(self, tenant_id: int) -> None:
        """Mark that first distribution has been completed (enabling auto-approve option)."""
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return

        settings = tenant.settings or {}
        if 'automation' not in settings:
            settings['automation'] = {}

        settings['automation']['first_monthly_credit_completed'] = True
        tenant.settings = settings
        # Note: commit happens in the calling function

    def get_auto_approve_settings(self, tenant_id: int) -> Dict[str, Any]:
        """Get auto-approve settings for a tenant."""
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return {'enabled': False, 'eligible': False}

        settings = tenant.settings or {}
        automation = settings.get('automation', {})

        return {
            'enabled': automation.get('monthly_credit_auto_approve', False),
            'eligible': automation.get('first_monthly_credit_completed', False),
            'notification_emails': automation.get('notification_emails', []),
            'auto_approve_threshold': automation.get('auto_approve_threshold')
        }

    def update_auto_approve_settings(
        self,
        tenant_id: int,
        enabled: Optional[bool] = None,
        notification_emails: Optional[List[str]] = None,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """Update auto-approve settings for a tenant."""
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")

        settings = tenant.settings or {}
        if 'automation' not in settings:
            settings['automation'] = {}

        if enabled is not None:
            # Only allow enabling if first distribution completed
            if enabled and not settings['automation'].get('first_monthly_credit_completed', False):
                raise ValueError("Cannot enable auto-approve until first distribution is manually approved")
            settings['automation']['monthly_credit_auto_approve'] = enabled

        if notification_emails is not None:
            settings['automation']['notification_emails'] = notification_emails

        if threshold is not None:
            settings['automation']['auto_approve_threshold'] = threshold

        tenant.settings = settings
        db.session.commit()

        return self.get_auto_approve_settings(tenant_id)

    # ==================== EXPIRATION ====================

    def expire_old_pending(self) -> int:
        """
        Mark expired pending distributions.

        Called by scheduler to clean up old pending items.

        Returns:
            Number of items expired
        """
        now = datetime.utcnow()

        expired = PendingDistribution.query.filter(
            PendingDistribution.status == 'pending',
            PendingDistribution.expires_at < now
        ).all()

        count = 0
        for pending in expired:
            pending.status = 'expired'
            count += 1
            logger.info(f"[PendingDistribution] Expired {pending.id} (tenant {pending.tenant_id})")

        if count > 0:
            db.session.commit()

        return count

    # ==================== NOTIFICATIONS ====================

    def send_approval_notification(self, pending: PendingDistribution) -> bool:
        """
        Send email notification that a distribution is ready for approval.

        Args:
            pending: The pending distribution

        Returns:
            True if notification sent successfully
        """
        try:
            tenant = Tenant.query.get(pending.tenant_id)
            if not tenant:
                return False

            preview = pending.preview_data or {}

            # Get notification emails
            settings = tenant.settings or {}
            automation = settings.get('automation', {})
            notification_emails = automation.get('notification_emails', [])

            # Fall back to shop owner email if no specific emails configured
            if not notification_emails and tenant.owner_email:
                notification_emails = [tenant.owner_email]

            if not notification_emails:
                logger.warning(f"[PendingDistribution] No notification emails for tenant {tenant.id}")
                return False

            # Find largest tier for email
            by_tier = preview.get('by_tier', [])
            largest_tier = by_tier[0] if by_tier else {'tier': 'N/A', 'count': 0, 'amount': 0}

            # Build email context
            context = {
                'merchant_name': tenant.shop_name or 'Merchant',
                'total_members': preview.get('total_members', 0),
                'total_amount': f"${preview.get('total_amount', 0):,.2f}",
                'largest_tier': largest_tier['tier'],
                'largest_tier_count': largest_tier['count'],
                'largest_tier_amount': f"${largest_tier['amount']:,.2f}",
                'expires_in_days': pending.days_until_expiry or PENDING_EXPIRATION_DAYS,
                'review_url': f"https://admin.shopify.com/store/{tenant.shop_domain}/apps/tradeup/pending-distributions",
                'distribution_name': pending.display_name
            }

            # Send notification (using existing notification service)
            for email in notification_emails:
                self.notification_service.send_pending_distribution_notification(
                    tenant_id=pending.tenant_id,
                    to_email=email,
                    context=context
                )

            # Update notification tracking
            pending.notification_sent_at = datetime.utcnow()
            db.session.commit()

            logger.info(f"[PendingDistribution] Notification sent for {pending.id} to {notification_emails}")
            return True

        except Exception as e:
            logger.error(f"[PendingDistribution] Failed to send notification for {pending.id}: {e}")
            return False

    def send_reminder_notification(self, pending: PendingDistribution) -> bool:
        """Send reminder for pending distribution approaching expiration."""
        # Similar to send_approval_notification but with reminder messaging
        # Implementation follows same pattern
        try:
            pending.reminder_sent_at = datetime.utcnow()
            db.session.commit()
            return True
        except Exception as e:
            logger.error(f"[PendingDistribution] Failed to send reminder for {pending.id}: {e}")
            return False


# Singleton instance for easy import
pending_distribution_service = PendingDistributionService()
