"""
Review Prompt API Endpoints

API endpoints for checking eligibility and recording review prompt responses.

Story: RC-005 - Add API endpoint for review prompt
"""

from flask import Blueprint, request, jsonify, g
from ..middleware.shopify_auth import require_shopify_auth
from app.services.review_prompt_service import ReviewPromptService

review_prompt_bp = Blueprint('review_prompt', __name__)


def get_service() -> ReviewPromptService:
    """Get review prompt service for current tenant."""
    return ReviewPromptService(g.tenant.id)


@review_prompt_bp.route('/check', methods=['GET'])
@require_shopify_auth
def check_review_prompt():
    """
    Check if a review prompt should be shown to the merchant.

    Returns eligibility status and details about why or why not
    the prompt should be shown.

    Response:
        {
            "should_show": true/false,
            "eligibility": {
                "eligible": true/false,
                "criteria": {...},
                "failed_criteria": []
            }
        }
    """
    service = get_service()
    should_show = service.should_show_prompt()
    eligibility = service.get_eligibility_details()

    return jsonify({
        'should_show': should_show,
        'eligibility': eligibility,
    })


@review_prompt_bp.route('/shown', methods=['POST'])
@require_shopify_auth
def record_prompt_shown():
    """
    Record that a review prompt was shown to the merchant.

    Creates a new ReviewPrompt record with the current timestamp.
    Should be called when the prompt modal is displayed.

    Response:
        {
            "success": true/false,
            "prompt_id": 123
        }
    """
    service = get_service()
    prompt_id = service.record_prompt_shown()

    if prompt_id is None:
        return jsonify({
            'success': False,
            'error': 'Failed to record prompt shown',
        }), 500

    return jsonify({
        'success': True,
        'prompt_id': prompt_id,
    })


@review_prompt_bp.route('/response', methods=['POST'])
@require_shopify_auth
def record_prompt_response():
    """
    Record the merchant's response to a review prompt.

    Request body:
        {
            "prompt_id": 123,
            "response": "clicked" | "dismissed" | "reminded_later"
        }

    Response:
        {
            "success": true/false,
            "prompt_id": 123,
            "response": "clicked",
            "responded_at": "2026-01-21T12:00:00"
        }
    """
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided',
        }), 400

    prompt_id = data.get('prompt_id')
    response = data.get('response')

    if not prompt_id:
        return jsonify({
            'success': False,
            'error': 'prompt_id is required',
        }), 400

    if not response:
        return jsonify({
            'success': False,
            'error': 'response is required',
        }), 400

    service = get_service()
    result = service.record_prompt_response(prompt_id, response)

    if not result.get('success'):
        return jsonify(result), 400

    return jsonify(result)


@review_prompt_bp.route('/history', methods=['GET'])
@require_shopify_auth
def get_prompt_history():
    """
    Get the review prompt history for the current tenant.

    Query params:
        limit: Maximum number of records to return (default 10)

    Response:
        {
            "success": true,
            "prompts": [...]
        }
    """
    limit = request.args.get('limit', 10, type=int)

    service = get_service()
    prompts = service.get_prompt_history(limit=limit)

    return jsonify({
        'success': True,
        'prompts': prompts,
    })


@review_prompt_bp.route('/stats', methods=['GET'])
@require_shopify_auth
def get_prompt_stats():
    """
    Get review prompt statistics for the current tenant.

    Response:
        {
            "success": true,
            "stats": {
                "total_prompts_shown": 5,
                "total_responses": 3,
                "response_rate": 60.0,
                "clicked_count": 1,
                "dismissed_count": 1,
                "reminded_later_count": 1,
                ...
            }
        }
    """
    service = get_service()
    stats = service.get_prompt_stats()

    return jsonify({
        'success': True,
        'stats': stats,
    })
