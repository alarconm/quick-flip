"""
Shopify Flow Integration Service.

Sends trigger events to Shopify Flow and handles Flow action requests.
Flow allows merchants to create automated workflows based on app events.

Triggers (app → Flow):
- Member enrolled
- Tier changed
- Trade-in completed
- Store credit issued

Actions (Flow → app):
- Add store credit
- Change member tier
- Get member info
"""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from flask import current_app
from ..extensions import db


class FlowService:
    """Service for Shopify Flow integration."""

    def __init__(self, tenant_id: int, shopify_client=None):
        self.tenant_id = tenant_id
        self.shopify_client = shopify_client

    # ==================== Flow Triggers ====================
    # These methods send events to Shopify Flow

    def trigger_member_enrolled(
        self,
        member_id: int,
        member_number: str,
        email: str,
        tier_name: str,
        shopify_customer_id: str = None
    ) -> Dict[str, Any]:
        """
        Trigger Flow when a new member enrolls.

        This allows merchants to create workflows like:
        - Send welcome email
        - Add customer tag
        - Create loyalty notification
        """
        payload = {
            'trigger': 'member_enrolled',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'data': {
                'member_id': member_id,
                'member_number': member_number,
                'email': email,
                'tier_name': tier_name,
                'shopify_customer_id': shopify_customer_id
            }
        }

        return self._send_flow_trigger('member-enrolled', payload)

    def trigger_tier_changed(
        self,
        member_id: int,
        member_number: str,
        email: str,
        old_tier: str,
        new_tier: str,
        change_type: str,  # 'upgrade' or 'downgrade'
        source: str,  # 'subscription', 'purchase', 'staff', etc.
        shopify_customer_id: str = None
    ) -> Dict[str, Any]:
        """
        Trigger Flow when a member's tier changes.

        This allows merchants to create workflows like:
        - Send tier upgrade congratulations
        - Update customer tags
        - Send downgrade warning/win-back offers
        """
        payload = {
            'trigger': 'tier_changed',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'data': {
                'member_id': member_id,
                'member_number': member_number,
                'email': email,
                'old_tier': old_tier,
                'new_tier': new_tier,
                'change_type': change_type,
                'source': source,
                'shopify_customer_id': shopify_customer_id
            }
        }

        return self._send_flow_trigger('tier-changed', payload)

    def trigger_trade_in_completed(
        self,
        member_id: int,
        member_number: str,
        email: str,
        batch_reference: str,
        trade_value: float,
        bonus_amount: float,
        item_count: int,
        category: str,
        shopify_customer_id: str = None
    ) -> Dict[str, Any]:
        """
        Trigger Flow when a trade-in is completed.

        This allows merchants to create workflows like:
        - Send thank you email with credit summary
        - Update customer lifetime value
        - Trigger re-engagement campaigns
        """
        payload = {
            'trigger': 'trade_in_completed',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'data': {
                'member_id': member_id,
                'member_number': member_number,
                'email': email,
                'batch_reference': batch_reference,
                'trade_value': trade_value,
                'bonus_amount': bonus_amount,
                'total_credit': trade_value + bonus_amount,
                'item_count': item_count,
                'category': category,
                'shopify_customer_id': shopify_customer_id
            }
        }

        return self._send_flow_trigger('trade-in-completed', payload)

    def trigger_credit_issued(
        self,
        member_id: int,
        member_number: str,
        email: str,
        amount: float,
        event_type: str,  # 'trade_in', 'referral', 'promotion', etc.
        description: str,
        new_balance: float,
        shopify_customer_id: str = None
    ) -> Dict[str, Any]:
        """
        Trigger Flow when store credit is issued.

        This allows merchants to create workflows like:
        - Send credit notification
        - Trigger spend reminder after X days
        - Update marketing segments
        """
        payload = {
            'trigger': 'credit_issued',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'data': {
                'member_id': member_id,
                'member_number': member_number,
                'email': email,
                'amount': amount,
                'event_type': event_type,
                'description': description,
                'new_balance': new_balance,
                'shopify_customer_id': shopify_customer_id
            }
        }

        return self._send_flow_trigger('credit-issued', payload)

    def _send_flow_trigger(self, trigger_name: str, payload: Dict) -> Dict[str, Any]:
        """
        Send a trigger event to Shopify Flow.

        Note: Shopify Flow triggers are sent via the flowTriggerReceive mutation.
        The trigger must be registered in shopify.app.toml.
        """
        if not self.shopify_client:
            return {
                'success': False,
                'error': 'Shopify client not configured'
            }

        mutation = """
        mutation flowTriggerReceive($handle: String!, $payload: JSON!) {
            flowTriggerReceive(handle: $handle, payload: $payload) {
                userErrors {
                    field
                    message
                }
            }
        }
        """

        try:
            # The handle format is typically "app-slug/trigger-name"
            # For custom apps, use the trigger URI path
            handle = f"tradeup/{trigger_name}"

            result = self.shopify_client._execute_query(mutation, {
                'handle': handle,
                'payload': payload
            })

            errors = result.get('flowTriggerReceive', {}).get('userErrors', [])
            if errors:
                return {
                    'success': False,
                    'errors': errors,
                    'trigger': trigger_name
                }

            return {
                'success': True,
                'trigger': trigger_name,
                'payload': payload
            }

        except Exception as e:
            # Log but don't fail - Flow triggers are non-critical
            current_app.logger.warning(f"Flow trigger '{trigger_name}' failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'trigger': trigger_name
            }

    # ==================== Flow Actions ====================
    # These methods handle incoming action requests from Flow

    def action_add_credit(
        self,
        customer_email: str,
        amount: float,
        reason: str = 'Flow automation'
    ) -> Dict[str, Any]:
        """
        Flow action: Add store credit to a customer.

        Args:
            customer_email: Customer's email address
            amount: Credit amount to add
            reason: Description for the credit

        Returns:
            Dict with result and new balance
        """
        from ..models import Member
        from .store_credit_service import store_credit_service
        from ..models.promotions import CreditEventType

        member = Member.query.filter_by(
            tenant_id=self.tenant_id,
            email=customer_email
        ).first()

        if not member:
            return {
                'success': False,
                'error': f'Member not found: {customer_email}'
            }

        try:
            entry = store_credit_service.add_credit(
                member_id=member.id,
                amount=Decimal(str(amount)),
                event_type=CreditEventType.PROMO.value,
                description=f"Flow: {reason}",
                source_type='flow_action',
                created_by='shopify_flow',
                sync_to_shopify=True
            )

            # Get updated balance
            balance = store_credit_service.get_balance(member.id)

            return {
                'success': True,
                'member_id': member.id,
                'member_number': member.member_number,
                'amount_added': float(amount),
                'new_balance': float(balance),
                'credit_entry_id': entry.id if entry else None
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def action_change_tier(
        self,
        customer_email: str,
        new_tier_name: str,
        reason: str = 'Flow automation'
    ) -> Dict[str, Any]:
        """
        Flow action: Change a member's tier.

        Args:
            customer_email: Customer's email address
            new_tier_name: Name of the new tier
            reason: Reason for the change

        Returns:
            Dict with result
        """
        from ..models import Member
        from ..models.promotions import TierConfiguration
        from .tier_service import TierService

        member = Member.query.filter_by(
            tenant_id=self.tenant_id,
            email=customer_email
        ).first()

        if not member:
            return {
                'success': False,
                'error': f'Member not found: {customer_email}'
            }

        # Find the tier
        tier = TierConfiguration.query.filter_by(
            tenant_id=self.tenant_id,
            name=new_tier_name
        ).first()

        if not tier:
            # Try case-insensitive
            tier = TierConfiguration.query.filter(
                TierConfiguration.tenant_id == self.tenant_id,
                TierConfiguration.name.ilike(new_tier_name)
            ).first()

        if not tier:
            return {
                'success': False,
                'error': f'Tier not found: {new_tier_name}'
            }

        try:
            tier_svc = TierService(self.tenant_id)
            result = tier_svc.assign_tier(
                member_id=member.id,
                tier_id=tier.id,
                source='api',  # Flow is an API source
                assigned_by='shopify_flow',
                notes=f"Flow: {reason}"
            )

            return {
                'success': result.get('success', False),
                'member_id': member.id,
                'member_number': member.member_number,
                'old_tier': result.get('old_tier'),
                'new_tier': result.get('new_tier'),
                'change_type': result.get('change_type')
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def action_get_member(self, customer_email: str) -> Dict[str, Any]:
        """
        Flow action: Get member information.

        Args:
            customer_email: Customer's email address

        Returns:
            Dict with member data
        """
        from ..models import Member
        from .store_credit_service import store_credit_service

        member = Member.query.filter_by(
            tenant_id=self.tenant_id,
            email=customer_email
        ).first()

        if not member:
            return {
                'success': False,
                'error': f'Member not found: {customer_email}',
                'is_member': False
            }

        # Get credit balance
        try:
            balance = store_credit_service.get_balance(member.id)
        except Exception:
            balance = 0

        return {
            'success': True,
            'is_member': True,
            'member': {
                'id': member.id,
                'member_number': member.member_number,
                'email': member.email,
                'name': member.name,
                'tier': member.tier.name if member.tier else None,
                'status': member.status,
                'credit_balance': float(balance),
                'total_trade_ins': member.total_trade_ins or 0,
                'total_trade_value': float(member.total_trade_value or 0),
                'total_bonus_earned': float(member.total_bonus_earned or 0),
                'membership_start_date': member.membership_start_date.isoformat() if member.membership_start_date else None,
                'shopify_customer_id': member.shopify_customer_id
            }
        }
