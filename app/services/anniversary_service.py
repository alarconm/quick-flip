"""
Anniversary Rewards Service

Handles anniversary tracking and automatic reward issuance for membership anniversaries.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

from flask import current_app

from app import db
from app.models.member import Member
from app.models.promotions import StoreCreditLedger, CreditEventType
from app.models.tenant import Tenant


class AnniversaryService:
    """Service for managing anniversary rewards."""

    def __init__(self, tenant_id: int, settings: Optional[Dict] = None):
        """
        Initialize AnniversaryService.

        Args:
            tenant_id: Tenant ID for multi-tenancy
            settings: Optional pre-loaded tenant settings
        """
        self.tenant_id = tenant_id
        self._settings = settings

    @property
    def settings(self) -> Dict:
        """Get tenant settings, loading from DB if not provided."""
        if self._settings is None:
            tenant = Tenant.query.get(self.tenant_id)
            self._settings = tenant.settings if tenant else {}
        return self._settings

    def get_anniversary_settings(self) -> Dict[str, Any]:
        """
        Get anniversary reward settings for the tenant.

        Returns:
            Dict with anniversary reward configuration.
        """
        anniversary_settings = self.settings.get('anniversary', {})
        return {
            'enabled': anniversary_settings.get('enabled', False),
            'reward_type': anniversary_settings.get('reward_type', 'points'),  # points, credit, or discount_code
            'reward_amount': anniversary_settings.get('reward_amount', 100),  # Default 100 points or $10
            'email_days_before': anniversary_settings.get('email_days_before', 0),  # 0 = on anniversary
            'message': anniversary_settings.get('message', 'Happy Anniversary! Thank you for being a loyal member!'),
        }

    def get_todays_anniversaries(self) -> List[Member]:
        """
        Get all members whose anniversary is today.

        Returns:
            List of Member objects with anniversary today.
        """
        today = date.today()

        # Query all active members for this tenant
        members = Member.query.filter(
            Member.tenant_id == self.tenant_id,
            Member.status == 'active'
        ).all()

        # Filter to those with anniversary today
        anniversary_members = [
            member for member in members
            if member.is_anniversary_today()
        ]

        return anniversary_members

    def get_members_with_upcoming_anniversaries(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """
        Get members with anniversaries in the next N days.

        Args:
            days_ahead: Number of days to look ahead (default: 7)

        Returns:
            List of dicts with member info and days until anniversary.
        """
        today = date.today()
        upcoming = []

        members = Member.query.filter(
            Member.tenant_id == self.tenant_id,
            Member.status == 'active'
        ).all()

        for member in members:
            days_until = member.days_until_anniversary()
            if 0 <= days_until <= days_ahead:
                # Calculate anniversary year (how many years they'll have been a member)
                anniversary_year = member.membership_years()
                if days_until > 0:
                    # If anniversary hasn't happened yet, add 1
                    anniversary_year += 1

                upcoming.append({
                    'member': member.to_dict(),
                    'member_id': member.id,
                    'enrollment_date': member.get_enrollment_date().isoformat(),
                    'anniversary_date': member.get_anniversary_date(today.year if days_until > 0 or member.is_anniversary_today() else today.year + 1).isoformat(),
                    'days_until': days_until,
                    'anniversary_year': anniversary_year,
                    'already_rewarded': member.last_anniversary_reward_year == today.year if hasattr(member, 'last_anniversary_reward_year') and member.last_anniversary_reward_year else False,
                })

        # Sort by days until anniversary
        upcoming.sort(key=lambda x: x['days_until'])
        return upcoming

    def get_anniversary_year(self, member: Member) -> int:
        """
        Get the anniversary year for a member (1st, 2nd, 3rd year, etc.).

        Args:
            member: Member object

        Returns:
            Integer representing the anniversary year (1 for first anniversary, etc.)
        """
        years = member.membership_years()
        # If their anniversary is today, they're completing this year
        if member.is_anniversary_today():
            return years
        # Otherwise, next anniversary will be years + 1
        return years + 1 if years >= 0 else 1

    def issue_anniversary_reward(self, member_id: int) -> Dict[str, Any]:
        """
        Issue anniversary reward to a member.

        Args:
            member_id: ID of the member to reward

        Returns:
            Dict with result info including success status and reward details.
        """
        member = Member.query.filter_by(
            id=member_id,
            tenant_id=self.tenant_id
        ).first()

        if not member:
            return {'success': False, 'error': 'Member not found'}

        if member.status != 'active':
            return {'success': False, 'error': f'Member is not active (status: {member.status})'}

        settings = self.get_anniversary_settings()

        if not settings['enabled']:
            return {'success': False, 'error': 'Anniversary rewards not enabled'}

        # Check if already rewarded this year
        current_year = date.today().year
        last_reward_year = getattr(member, 'last_anniversary_reward_year', None)
        if last_reward_year == current_year:
            return {'success': False, 'error': 'Already rewarded this year', 'already_rewarded': True}

        # Calculate anniversary year
        anniversary_year = self.get_anniversary_year(member)

        reward_type = settings['reward_type']
        reward_amount = settings['reward_amount']

        result = {
            'success': True,
            'member_id': member.id,
            'member_number': member.member_number,
            'member_name': member.name,
            'member_email': member.email,
            'reward_type': reward_type,
            'reward_amount': reward_amount,
            'anniversary_year': anniversary_year,
        }

        if reward_type == 'credit':
            # Issue store credit
            credit_result = self._issue_store_credit_reward(member, reward_amount, anniversary_year, settings['message'])
            result.update(credit_result)

        elif reward_type == 'points':
            # Issue points
            points_result = self._issue_points_reward(member, reward_amount, anniversary_year)
            result.update(points_result)

        elif reward_type == 'discount_code':
            # Generate discount code
            discount_result = self._issue_discount_code_reward(member, reward_amount, anniversary_year)
            result.update(discount_result)

        else:
            return {'success': False, 'error': f'Unknown reward type: {reward_type}'}

        # Mark as rewarded this year (if we have the field)
        if hasattr(member, 'last_anniversary_reward_year'):
            member.last_anniversary_reward_year = current_year

        # Award anniversary badge if applicable (1, 2, or 5 year milestones)
        badge_awarded = None
        try:
            badge_awarded = self._award_anniversary_badge(member_id, anniversary_year)
            if badge_awarded:
                result['badge_awarded'] = {
                    'id': badge_awarded.badge_id,
                    'name': badge_awarded.badge.name if badge_awarded.badge else None,
                }
                current_app.logger.info(
                    f"Anniversary badge awarded: {badge_awarded.badge.name if badge_awarded.badge else 'Unknown'} "
                    f"to member {member.member_number}"
                )
        except Exception as e:
            # Don't fail the reward if badge awarding fails
            current_app.logger.warning(f"Failed to award anniversary badge for member {member_id}: {e}")

        try:
            db.session.commit()
            current_app.logger.info(
                f"Anniversary reward issued: Member {member.member_number} "
                f"({anniversary_year} year anniversary), "
                f"{reward_type}: {reward_amount}"
            )
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to commit anniversary reward for member {member_id}: {e}")
            return {'success': False, 'error': str(e)}

        return result

    def _issue_store_credit_reward(
        self,
        member: Member,
        amount: float,
        anniversary_year: int,
        message: str
    ) -> Dict[str, Any]:
        """Issue store credit as anniversary reward."""
        try:
            from .store_credit_service import store_credit_service

            event_type = CreditEventType.ANNIVERSARY_REWARD.value

            entry = store_credit_service.add_credit(
                member_id=member.id,
                amount=Decimal(str(amount)),
                event_type=event_type,
                description=f"{self._ordinal(anniversary_year)} Anniversary Reward - {message}",
                source_type='anniversary_reward',
                source_id=str(date.today().year),
                created_by='system:anniversary_service',
                sync_to_shopify=True
            )

            return {
                'credit_issued': amount,
                'ledger_entry_id': entry.id if entry else None,
            }
        except Exception as e:
            current_app.logger.error(f"Failed to issue anniversary credit for member {member.id}: {e}")
            return {'success': False, 'error': f'Failed to issue credit: {e}'}

    def _issue_points_reward(
        self,
        member: Member,
        amount: int,
        anniversary_year: int
    ) -> Dict[str, Any]:
        """Issue points as anniversary reward."""
        try:
            # Update member's points balance directly
            member.points_balance = (member.points_balance or 0) + amount
            member.lifetime_points_earned = (member.lifetime_points_earned or 0) + amount

            # Create points transaction for tracking
            from app.models.points import PointsTransaction
            transaction = PointsTransaction(
                tenant_id=self.tenant_id,
                member_id=member.id,
                points=amount,
                remaining_points=amount,
                transaction_type='earn',
                source='anniversary',
                reference_id=str(date.today().year),
                reference_type='anniversary_reward',
                description=f"{self._ordinal(anniversary_year)} Anniversary Reward",
                created_at=datetime.utcnow()
            )
            db.session.add(transaction)

            return {
                'points_issued': amount,
                'new_points_balance': member.points_balance,
            }
        except Exception as e:
            current_app.logger.error(f"Failed to issue anniversary points for member {member.id}: {e}")
            return {'success': False, 'error': f'Failed to issue points: {e}'}

    def _issue_discount_code_reward(
        self,
        member: Member,
        amount: float,
        anniversary_year: int
    ) -> Dict[str, Any]:
        """Generate a discount code as anniversary reward."""
        try:
            from .shopify_client import ShopifyClient

            # Generate unique discount code
            code = f"ANNIV{anniversary_year}Y-{member.member_number}-{date.today().strftime('%Y%m%d')}"

            shopify_client = ShopifyClient(self.tenant_id)
            result = shopify_client.create_reward_discount_code(
                code=code,
                title=f"{self._ordinal(anniversary_year)} Anniversary Reward - {member.email}",
                discount_type='fixed',
                discount_value=amount,
                usage_limit=1,
                customer_id=member.shopify_customer_id,
                expires_days=30
            )

            if result.get('success'):
                return {
                    'discount_code': result.get('code', code),
                    'discount_id': result.get('discount_id'),
                    'discount_value': amount,
                    'expires_days': 30,
                }
            else:
                current_app.logger.error(f"Failed to create discount code: {result}")
                return {'success': False, 'error': f"Failed to create discount code: {result.get('error', 'Unknown error')}"}

        except Exception as e:
            current_app.logger.error(f"Failed to issue anniversary discount for member {member.id}: {e}")
            return {'success': False, 'error': f'Failed to issue discount: {e}'}

    def process_anniversary_rewards(self) -> Dict[str, Any]:
        """
        Process anniversary rewards for all members with anniversaries today.
        Called by scheduled task daily.

        Returns:
            Dict with processing results.
        """
        settings = self.get_anniversary_settings()

        if not settings['enabled']:
            return {'success': False, 'error': 'Anniversary rewards not enabled', 'processed': 0}

        anniversary_members = self.get_todays_anniversaries()
        results = []

        for member in anniversary_members:
            result = self.issue_anniversary_reward(member.id)
            results.append(result)

        successful = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]
        already_rewarded = [r for r in failed if r.get('already_rewarded')]

        return {
            'success': True,
            'processed': len(results),
            'successful': len(successful),
            'failed': len(failed),
            'already_rewarded': len(already_rewarded),
            'details': results,
        }

    def get_anniversary_stats(self) -> Dict[str, Any]:
        """
        Get anniversary reward statistics for the tenant.

        Returns:
            Dict with anniversary statistics.
        """
        today = date.today()
        current_year = today.year

        # Count active members
        total_active_members = Member.query.filter(
            Member.tenant_id == self.tenant_id,
            Member.status == 'active'
        ).count()

        # Count members rewarded this year
        rewarded_this_year = Member.query.filter(
            Member.tenant_id == self.tenant_id,
            Member.last_anniversary_reward_year == current_year,
            Member.status == 'active'
        ).count() if hasattr(Member, 'last_anniversary_reward_year') else 0

        # Get upcoming anniversaries (next 7 days)
        upcoming = self.get_members_with_upcoming_anniversaries(days_ahead=7)

        # Count anniversaries today
        anniversaries_today = len([m for m in upcoming if m['days_until'] == 0])

        return {
            'total_active_members': total_active_members,
            'rewarded_this_year': rewarded_this_year,
            'anniversaries_today': anniversaries_today,
            'upcoming_7_days': len(upcoming),
            'upcoming_anniversaries': upcoming[:5],  # Top 5 upcoming
        }

    @staticmethod
    def _ordinal(n: int) -> str:
        """
        Convert a number to its ordinal representation.

        Args:
            n: The number to convert

        Returns:
            String like "1st", "2nd", "3rd", "4th", etc.
        """
        if 11 <= (n % 100) <= 13:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
        return f"{n}{suffix}"

    def _award_anniversary_badge(self, member_id: int, anniversary_year: int):
        """
        Award anniversary badge via GamificationService integration.

        Args:
            member_id: ID of the member
            anniversary_year: The anniversary year (1, 2, 5, etc.)

        Returns:
            MemberBadge if awarded, None otherwise
        """
        from .gamification_service import GamificationService

        gamification_service = GamificationService(self.tenant_id)
        return gamification_service.award_anniversary_badge(member_id, anniversary_year)


# Convenience functions for simpler usage
def get_anniversary_service(tenant_id: int, settings: Optional[Dict] = None) -> AnniversaryService:
    """Get an AnniversaryService instance for a tenant."""
    return AnniversaryService(tenant_id, settings)


def process_tenant_anniversaries(tenant_id: int) -> Dict[str, Any]:
    """Process anniversary rewards for a single tenant."""
    service = AnniversaryService(tenant_id)
    return service.process_anniversary_rewards()
