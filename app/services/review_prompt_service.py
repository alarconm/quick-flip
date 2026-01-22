"""
Review Prompt Service for TradeUp.

Manages the lifecycle of in-app review prompts: determining eligibility,
recording when prompts are shown, and tracking merchant responses.

Story: RC-003 - Create review prompt service
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

from app.extensions import db
from app.models.review_prompt import ReviewPrompt, ReviewPromptResponse
from app.services.review_eligibility_service import ReviewEligibilityService

logger = logging.getLogger(__name__)


class ReviewPromptService:
    """
    Service for managing review prompt lifecycle.

    Integrates eligibility checking (ReviewEligibilityService) with
    prompt tracking (ReviewPrompt model) to provide a complete
    review collection workflow.

    Usage:
        service = ReviewPromptService(tenant_id)

        # Check if we should show a prompt
        if service.should_show_prompt():
            # Show the review prompt to the merchant
            prompt_id = service.record_prompt_shown()

            # Later, when they respond
            service.record_prompt_response(prompt_id, 'clicked')

        # View prompt history
        history = service.get_prompt_history()
    """

    def __init__(self, tenant_id: int):
        """
        Initialize the ReviewPromptService.

        Args:
            tenant_id: The tenant ID to manage prompts for
        """
        self.tenant_id = tenant_id
        self._eligibility_service: Optional[ReviewEligibilityService] = None

    @property
    def eligibility_service(self) -> ReviewEligibilityService:
        """Lazy load the eligibility service."""
        if self._eligibility_service is None:
            self._eligibility_service = ReviewEligibilityService(self.tenant_id)
        return self._eligibility_service

    def should_show_prompt(self) -> bool:
        """
        Determine if a review prompt should be shown to this tenant.

        This combines eligibility criteria (activity metrics, support tickets, errors)
        with prompt cooldown logic (no recent prompts) to make a final decision.

        Returns:
            True if a review prompt should be shown, False otherwise
        """
        eligibility_result = self.eligibility_service.check_eligibility()
        return eligibility_result['eligible']

    def get_eligibility_details(self) -> Dict[str, Any]:
        """
        Get detailed eligibility information for debugging or display.

        Returns:
            Dict with full eligibility criteria breakdown
        """
        return self.eligibility_service.check_eligibility()

    def record_prompt_shown(self) -> Optional[int]:
        """
        Record that a review prompt was shown to the merchant.

        Creates a new ReviewPrompt record with the current timestamp.
        Should only be called after should_show_prompt() returns True.

        Returns:
            The ID of the created prompt record, or None if creation failed
        """
        try:
            # Verify we should show the prompt (extra safety check)
            if not self.should_show_prompt():
                logger.warning(
                    f"record_prompt_shown called when not eligible for tenant {self.tenant_id}"
                )
                # Still allow recording if explicitly called
                # This prevents data loss if UI is out of sync

            prompt = ReviewPrompt.create_prompt(self.tenant_id)
            db.session.commit()

            logger.info(f"Recorded review prompt shown for tenant {self.tenant_id}, prompt_id={prompt.id}")
            return prompt.id

        except Exception as e:
            logger.error(f"Failed to record prompt shown for tenant {self.tenant_id}: {e}")
            db.session.rollback()
            return None

    def record_prompt_response(
        self,
        prompt_id: int,
        response: str
    ) -> Dict[str, Any]:
        """
        Record a merchant's response to a review prompt.

        Args:
            prompt_id: The ID of the prompt being responded to
            response: One of 'dismissed', 'clicked', 'reminded_later'

        Returns:
            Dict with success status and details
        """
        # Validate response value
        valid_responses = [r.value for r in ReviewPromptResponse]
        if response not in valid_responses:
            return {
                'success': False,
                'error': f"Invalid response. Must be one of: {', '.join(valid_responses)}"
            }

        try:
            prompt = ReviewPrompt.query.filter_by(
                id=prompt_id,
                tenant_id=self.tenant_id
            ).first()

            if not prompt:
                return {
                    'success': False,
                    'error': f"Prompt {prompt_id} not found for tenant {self.tenant_id}"
                }

            # Check if already responded
            if prompt.response:
                return {
                    'success': False,
                    'error': f"Prompt already has response: {prompt.response}",
                    'existing_response': prompt.response
                }

            # Record the response
            prompt.record_response(ReviewPromptResponse(response))
            db.session.commit()

            logger.info(
                f"Recorded review prompt response for tenant {self.tenant_id}: "
                f"prompt_id={prompt_id}, response={response}"
            )

            return {
                'success': True,
                'prompt_id': prompt_id,
                'response': response,
                'responded_at': prompt.responded_at.isoformat() if prompt.responded_at else None
            }

        except Exception as e:
            logger.error(
                f"Failed to record prompt response for tenant {self.tenant_id}, "
                f"prompt_id={prompt_id}: {e}"
            )
            db.session.rollback()
            return {
                'success': False,
                'error': 'Failed to record response'
            }

    def get_prompt_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the review prompt history for this tenant.

        Args:
            limit: Maximum number of records to return (default 10)

        Returns:
            List of prompt records as dicts, most recent first
        """
        prompts = ReviewPrompt.get_prompt_history(self.tenant_id, limit=limit)
        return [prompt.to_dict() for prompt in prompts]

    def get_last_prompt(self) -> Optional[Dict[str, Any]]:
        """
        Get the most recent review prompt for this tenant.

        Returns:
            Dict of the last prompt, or None if no prompts exist
        """
        history = self.get_prompt_history(limit=1)
        return history[0] if history else None

    def get_prompt_stats(self) -> Dict[str, Any]:
        """
        Get statistics about review prompts for this tenant.

        Returns:
            Dict with prompt statistics
        """
        all_prompts = ReviewPrompt.query.filter_by(tenant_id=self.tenant_id).all()

        total_prompts = len(all_prompts)
        total_responses = sum(1 for p in all_prompts if p.response)
        responses_by_type = {}

        for prompt in all_prompts:
            if prompt.response:
                responses_by_type[prompt.response] = responses_by_type.get(prompt.response, 0) + 1

        last_prompt = self.get_last_prompt()
        eligibility = self.eligibility_service.get_eligibility_summary()

        return {
            'total_prompts_shown': total_prompts,
            'total_responses': total_responses,
            'response_rate': round(total_responses / total_prompts * 100, 1) if total_prompts > 0 else 0,
            'responses_by_type': responses_by_type,
            'clicked_count': responses_by_type.get('clicked', 0),
            'dismissed_count': responses_by_type.get('dismissed', 0),
            'reminded_later_count': responses_by_type.get('reminded_later', 0),
            'last_prompt': last_prompt,
            'currently_eligible': eligibility['eligible'],
            'eligibility_summary': eligibility
        }


def should_show_review_prompt(tenant_id: int) -> bool:
    """
    Convenience function to check if a review prompt should be shown.

    Args:
        tenant_id: The tenant ID to check

    Returns:
        True if a prompt should be shown, False otherwise
    """
    service = ReviewPromptService(tenant_id)
    return service.should_show_prompt()


def record_review_prompt_shown(tenant_id: int) -> Optional[int]:
    """
    Convenience function to record a prompt being shown.

    Args:
        tenant_id: The tenant ID

    Returns:
        The prompt ID, or None if creation failed
    """
    service = ReviewPromptService(tenant_id)
    return service.record_prompt_shown()


def record_review_prompt_response(tenant_id: int, prompt_id: int, response: str) -> Dict[str, Any]:
    """
    Convenience function to record a prompt response.

    Args:
        tenant_id: The tenant ID
        prompt_id: The prompt ID
        response: The response type

    Returns:
        Dict with success status
    """
    service = ReviewPromptService(tenant_id)
    return service.record_prompt_response(prompt_id, response)
