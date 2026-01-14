"""
Setup Checklist API - Track onboarding progress and milestones.

Provides comprehensive setup status for the dashboard checklist,
milestone tracking, and celebration triggers.
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime
from ..extensions import db
from ..models import Member, MembershipTier, TradeInBatch, Tenant
from ..middleware.shopify_auth import require_shopify_auth

setup_checklist_bp = Blueprint('setup_checklist', __name__)


def get_checklist_items(tenant: Tenant, tenant_id: int) -> list:
    """
    Get all setup checklist items with their completion status.

    Returns a list of checklist items in order of recommended completion.
    """
    settings = tenant.settings or {}

    # Get counts
    tier_count = MembershipTier.query.filter_by(tenant_id=tenant_id, is_active=True).count()
    member_count = Member.query.filter_by(tenant_id=tenant_id).count()
    trade_in_count = TradeInBatch.query.join(Member).filter(Member.tenant_id == tenant_id).count()

    # Product wizard status
    products_state = settings.get('membership_products', {})
    products_list = products_state.get('products', [])
    products_draft = products_state.get('draft_mode', True)

    # Theme blocks status
    theme_blocks = settings.get('theme_blocks_installed', {})
    blocks_installed = sum(1 for v in theme_blocks.values() if v)
    total_blocks = 4  # membership-signup, credit-badge, trade-in-cta, refer-friend

    # Store credit check - check both keys for backwards compatibility
    # 'store_credit_verified' is set by setup_checklist, 'store_credit_enabled' by onboarding
    store_credit_enabled = settings.get('store_credit_verified', False) or settings.get('store_credit_enabled', False)

    # Onboarding status
    onboarding_complete = settings.get('onboarding_complete', False)

    checklist = [
        {
            'id': 'store_credit',
            'title': 'Enable Store Credit',
            'description': 'Verify Shopify store credit is enabled for your store',
            'completed': store_credit_enabled,
            'action_url': '/app/onboarding',
            'action_label': 'Verify Now',
            'priority': 1,
            'category': 'setup',
        },
        {
            'id': 'tiers_configured',
            'title': 'Configure Membership Tiers',
            'description': f'{tier_count} tier{"s" if tier_count != 1 else ""} created',
            'completed': tier_count > 0,
            'action_url': '/app/tiers',
            'action_label': 'Add Tiers',
            'priority': 2,
            'category': 'setup',
        },
        {
            'id': 'products_created',
            'title': 'Create Membership Products',
            'description': f'{len(products_list)} product{"s" if len(products_list) != 1 else ""} created' if products_list else 'Create products customers can purchase',
            'completed': len(products_list) > 0,
            'action_url': '/app/products/wizard',
            'action_label': 'Setup Products',
            'priority': 3,
            'category': 'setup',
        },
        {
            'id': 'products_published',
            'title': 'Publish Membership Products',
            'description': 'Make products visible to customers',
            'completed': len(products_list) > 0 and not products_draft,
            'action_url': '/app/products/wizard',
            'action_label': 'Publish Products',
            'priority': 4,
            'category': 'setup',
            'depends_on': 'products_created',
        },
        {
            'id': 'theme_blocks',
            'title': 'Add Theme Blocks',
            'description': f'{blocks_installed}/{total_blocks} blocks installed on your storefront',
            'completed': blocks_installed >= 1,  # At least one block installed
            'fully_complete': blocks_installed >= total_blocks,
            'action_url': '/app/theme-blocks',
            'action_label': 'Install Blocks',
            'priority': 5,
            'category': 'setup',
        },
        {
            'id': 'first_member',
            'title': 'Enroll First Member',
            'description': 'Get your first loyalty member',
            'completed': member_count > 0,
            'action_url': '/app/members',
            'action_label': 'Add Member',
            'priority': 6,
            'category': 'milestone',
        },
        {
            'id': 'first_trade_in',
            'title': 'Process First Trade-In',
            'description': 'Complete your first trade-in transaction',
            'completed': trade_in_count > 0,
            'action_url': '/app/trade-ins',
            'action_label': 'New Trade-In',
            'priority': 7,
            'category': 'milestone',
        },
    ]

    return checklist


def get_milestones(tenant: Tenant, tenant_id: int) -> dict:
    """
    Get milestone achievements for celebration triggers.
    """
    settings = tenant.settings or {}
    celebrated = settings.get('milestones_celebrated', {})

    member_count = Member.query.filter_by(tenant_id=tenant_id).count()
    trade_in_count = TradeInBatch.query.join(Member).filter(
        Member.tenant_id == tenant_id,
        TradeInBatch.status == 'completed'
    ).count()

    # Define milestones
    milestones = {
        'first_member': {
            'achieved': member_count >= 1,
            'celebrated': celebrated.get('first_member', False),
            'title': 'First Member!',
            'message': 'Congratulations! You\'ve enrolled your first loyalty member.',
            'icon': 'star',
        },
        'ten_members': {
            'achieved': member_count >= 10,
            'celebrated': celebrated.get('ten_members', False),
            'title': 'Growing Community!',
            'message': 'Amazing! You now have 10 loyalty members.',
            'icon': 'community',
        },
        'fifty_members': {
            'achieved': member_count >= 50,
            'celebrated': celebrated.get('fifty_members', False),
            'title': 'Thriving Program!',
            'message': 'Incredible! 50 members and counting!',
            'icon': 'trophy',
        },
        'first_trade_in': {
            'achieved': trade_in_count >= 1,
            'celebrated': celebrated.get('first_trade_in', False),
            'title': 'First Trade-In Complete!',
            'message': 'You\'ve processed your first trade-in. Your loyalty program is live!',
            'icon': 'exchange',
        },
        'ten_trade_ins': {
            'achieved': trade_in_count >= 10,
            'celebrated': celebrated.get('ten_trade_ins', False),
            'title': 'Trade-In Pro!',
            'message': '10 trade-ins processed. Your customers love this program!',
            'icon': 'chart',
        },
    }

    return milestones


@setup_checklist_bp.route('/status', methods=['GET'])
@require_shopify_auth
def get_setup_status():
    """
    Get comprehensive setup checklist status.

    Returns checklist items, completion percentage, and next recommended action.
    """
    try:
        tenant_id = g.tenant_id
        tenant = g.tenant

        checklist = get_checklist_items(tenant, tenant_id)
        milestones = get_milestones(tenant, tenant_id)

        # Calculate completion
        setup_items = [item for item in checklist if item['category'] == 'setup']
        completed_setup = sum(1 for item in setup_items if item['completed'])
        setup_percentage = (completed_setup / len(setup_items) * 100) if setup_items else 0

        # Find next action (first incomplete item)
        next_action = None
        for item in checklist:
            if not item['completed']:
                # Check dependencies
                depends_on = item.get('depends_on')
                if depends_on:
                    dep_item = next((i for i in checklist if i['id'] == depends_on), None)
                    if dep_item and not dep_item['completed']:
                        continue
                next_action = item
                break

        # Check for uncelebrated milestones
        uncelebrated = []
        for key, milestone in milestones.items():
            if milestone['achieved'] and not milestone['celebrated']:
                uncelebrated.append({
                    'id': key,
                    **milestone
                })

        return jsonify({
            'checklist': checklist,
            'completion': {
                'setup_percentage': round(setup_percentage, 0),
                'setup_completed': completed_setup,
                'setup_total': len(setup_items),
                'all_complete': all(item['completed'] for item in setup_items),
            },
            'next_action': next_action,
            'milestones': milestones,
            'uncelebrated_milestones': uncelebrated,
        })
    except Exception as e:
        import traceback
        print(f"[SetupChecklist] Error: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@setup_checklist_bp.route('/milestones/<milestone_id>/celebrate', methods=['POST'])
@require_shopify_auth
def mark_milestone_celebrated(milestone_id):
    """
    Mark a milestone as celebrated (so we don't show it again).
    """
    try:
        tenant = g.tenant

        settings = tenant.settings or {}
        celebrated = settings.get('milestones_celebrated', {})
        celebrated[milestone_id] = True
        settings['milestones_celebrated'] = celebrated
        tenant.settings = settings

        db.session.commit()

        return jsonify({'success': True, 'milestone_id': milestone_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@setup_checklist_bp.route('/theme-blocks/status', methods=['GET'])
@require_shopify_auth
def get_theme_blocks_status():
    """
    Get detailed theme block installation status.
    """
    try:
        tenant = g.tenant
        settings = tenant.settings or {}

        theme_blocks = settings.get('theme_blocks_installed', {})

        blocks = [
            {
                'id': 'membership-signup',
                'name': 'Membership Signup',
                'description': 'Call-to-action for customers to join your loyalty program',
                'installed': theme_blocks.get('membership-signup', False),
                'recommended_pages': ['Homepage', 'Product pages', 'Cart'],
                'preview_image': '/theme-blocks/membership-signup-preview.png',
            },
            {
                'id': 'credit-badge',
                'name': 'Store Credit Badge',
                'description': 'Shows customer\'s current store credit balance',
                'installed': theme_blocks.get('credit-badge', False),
                'recommended_pages': ['Header', 'Account page'],
                'preview_image': '/theme-blocks/credit-badge-preview.png',
            },
            {
                'id': 'trade-in-cta',
                'name': 'Trade-In CTA',
                'description': 'Button for customers to start a trade-in',
                'installed': theme_blocks.get('trade-in-cta', False),
                'recommended_pages': ['Homepage', 'Navigation'],
                'preview_image': '/theme-blocks/trade-in-cta-preview.png',
            },
            {
                'id': 'refer-friend',
                'name': 'Refer a Friend',
                'description': 'Referral program block for member recruitment',
                'installed': theme_blocks.get('refer-friend', False),
                'recommended_pages': ['Account page', 'Thank you page'],
                'preview_image': '/theme-blocks/refer-friend-preview.png',
            },
        ]

        installed_count = sum(1 for b in blocks if b['installed'])

        return jsonify({
            'blocks': blocks,
            'installed_count': installed_count,
            'total_count': len(blocks),
            'all_installed': installed_count == len(blocks),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@setup_checklist_bp.route('/theme-blocks/<block_id>/mark-installed', methods=['POST'])
@require_shopify_auth
def mark_block_installed(block_id):
    """
    Mark a theme block as installed.

    Note: This is a manual marking. In the future, we could
    detect installation via Theme API.
    """
    try:
        tenant = g.tenant

        settings = tenant.settings or {}
        theme_blocks = settings.get('theme_blocks_installed', {})
        theme_blocks[block_id] = True
        settings['theme_blocks_installed'] = theme_blocks
        tenant.settings = settings

        db.session.commit()

        return jsonify({'success': True, 'block_id': block_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@setup_checklist_bp.route('/store-credit/verify', methods=['POST'])
@require_shopify_auth
def verify_store_credit():
    """
    Mark store credit as verified.
    """
    try:
        tenant = g.tenant

        settings = tenant.settings or {}
        settings['store_credit_verified'] = True
        tenant.settings = settings

        db.session.commit()

        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@setup_checklist_bp.route('/tooltips/dismissed', methods=['GET'])
@require_shopify_auth
def get_dismissed_tooltips():
    """
    Get list of dismissed onboarding tooltips.
    """
    try:
        tenant = g.tenant
        settings = tenant.settings or {}
        dismissed = settings.get('dismissed_tooltips', [])

        return jsonify({'dismissed': dismissed})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@setup_checklist_bp.route('/tooltips/<tooltip_id>/dismiss', methods=['POST'])
@require_shopify_auth
def dismiss_tooltip(tooltip_id):
    """
    Dismiss a tooltip so it doesn't show again.
    """
    try:
        tenant = g.tenant

        settings = tenant.settings or {}
        dismissed = settings.get('dismissed_tooltips', [])
        if tooltip_id not in dismissed:
            dismissed.append(tooltip_id)
        settings['dismissed_tooltips'] = dismissed
        tenant.settings = settings

        db.session.commit()

        return jsonify({'success': True, 'tooltip_id': tooltip_id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
