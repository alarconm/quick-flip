# TradeUp Production Testing Checklist

**Created:** January 14, 2026
**Test Store:** uy288y-nx.myshopify.com (ORB Sports Cards)
**Production URL:** https://app.cardflowlabs.com

---

## Pre-Testing Setup

### 1. Commit Pending Changes
- [ ] Review uncommitted deletions (checkout-validation, tier-discount-function)
- [ ] Commit the `.disabled` folder moves
- [ ] Push to main branch
- [ ] Verify Railway deployment succeeds

### 2. Environment Verification
- [ ] Verify production health: `curl https://app.cardflowlabs.com/health`
- [ ] Check Railway deployment status: `railway deployment list`
- [ ] Confirm database is accessible

---

## Merchant Admin Testing

### Dashboard (Admin Home)
- [ ] Dashboard loads without errors
- [ ] Stats cards display correctly (members, trade-ins, credit issued)
- [ ] Recent activity feed shows data
- [ ] Quick actions are functional
- [ ] Responsive layout works on mobile

### Members Management
- [ ] List all members with pagination
- [ ] Search members by name/email (instant search)
- [ ] Filter by tier
- [ ] Filter by status (active, suspended, cancelled)
- [ ] View member detail page
- [ ] Edit member information
- [ ] Add store credit to member
- [ ] Deduct store credit from member
- [ ] Change member tier
- [ ] Suspend/reactivate member
- [ ] Export members to CSV

### Tier Configuration
- [ ] List all tiers
- [ ] Create new tier with all fields (name, benefits, price, bonuses)
- [ ] Edit existing tier
- [ ] Delete tier (with member check)
- [ ] Set tier as default
- [ ] Configure auto-upgrade rules
- [ ] Configure tier eligibility requirements

### Trade-In Management
- [ ] List all trade-in batches
- [ ] Search trade-ins by member/guest
- [ ] Filter by status (pending, approved, rejected, completed)
- [ ] Filter by category
- [ ] Create new trade-in batch
- [ ] Add items to trade-in
- [ ] Edit trade-in items (PUT)
- [ ] Delete trade-in items (DELETE)
- [ ] View trade-in detail with timeline
- [ ] Approve trade-in (credit issued)
- [ ] Reject trade-in with notes
- [ ] Partial approval workflow
- [ ] Auto-approval threshold enforcement

### Store Credit Operations
- [ ] View store credit events list
- [ ] Create bulk credit campaign
- [ ] Issue credit to multiple members
- [ ] View credit ledger history
- [ ] Credit expiration settings work

### Promotions & Campaigns
- [ ] List promotions
- [ ] Create new promotion
- [ ] Edit promotion
- [ ] Delete promotion
- [ ] Promotion scheduling works
- [ ] Bonus multipliers apply correctly

### Settings
- [ ] General settings save and persist
- [ ] Branding settings (logo, colors)
- [ ] Notification settings (15+ toggles)
- [ ] Trade-in settings
- [ ] Points settings
- [ ] Referral settings
- [ ] Integration settings
- [ ] Bug report form submits successfully

### Analytics & Reporting
- [ ] Dashboard statistics accurate
- [ ] Date range filtering works
- [ ] Daily report endpoint returns data
- [ ] Export to CSV functional

---

## Billing & Subscription Testing

### Plan Display
- [ ] All 4 plans display correctly (Free, Starter, Growth, Pro)
- [ ] Plan limits shown accurately
- [ ] Current plan highlighted

### Subscription Flow
- [ ] Subscribe to Starter plan (test mode)
- [ ] Shopify billing redirect works
- [ ] Subscription confirmation returns correctly
- [ ] Plan limits enforced after subscription
- [ ] Usage warnings at 80%, 90%, 100%

### Plan Management
- [ ] View billing history
- [ ] Upgrade plan flow
- [ ] Downgrade scheduling works
- [ ] Cancel subscription
- [ ] Reactivate subscription

### Webhook Handling
- [ ] app_subscriptions/update webhook processes
- [ ] Billing history updates on events

---

## Onboarding Flow Testing

### New Store Setup
- [ ] Onboarding status endpoint returns correct steps
- [ ] Store credit check detects if enabled
- [ ] Tier template selection works (standard, premium, basic)
- [ ] Membership product check
- [ ] Skip step functionality
- [ ] Complete onboarding marks as done
- [ ] Progress persists across sessions

---

## Shopify Integration Testing

### OAuth Flow
- [ ] New install redirects to OAuth
- [ ] OAuth callback processes correctly
- [ ] Access token stored
- [ ] Session management works

### Webhooks
- [ ] orders/paid - Points/credit awarded
- [ ] orders/fulfilled - Fulfillment tracked
- [ ] orders/cancelled - Handled correctly
- [ ] orders/create - Order tracked
- [ ] customers/create - Customer synced
- [ ] customers/update - Customer updated
- [ ] customers/delete - Customer handled
- [ ] refunds/create - Refund processed
- [ ] app/uninstalled - Cleanup executed
- [ ] shop/update - Settings synced

### GDPR Compliance
- [ ] customers/data_request - Returns customer data
- [ ] customers/redact - Redacts customer data
- [ ] shop/redact - Redacts shop data

### Metafield Sync
- [ ] Individual member metafield sync works
- [ ] Bulk metafield sync works
- [ ] Metafield verification endpoint returns status

---

## Customer-Facing Testing

### App Proxy (Rewards Page)
- [ ] Navigate to `store.myshopify.com/apps/rewards`
- [ ] Page loads without errors
- [ ] Customer balance displays (logged in)
- [ ] Tier information shows
- [ ] Rewards catalog accessible
- [ ] Mobile responsive

### Customer Account Extension
- [ ] Extension appears in customer account
- [ ] Rewards balance displays
- [ ] Tier status shows
- [ ] Trade-in history visible
- [ ] Points balance accurate

### Checkout UI Extension
- [ ] Extension loads in checkout
- [ ] Store credit applies correctly
- [ ] Points redemption works

---

## API Endpoint Verification

### Core Endpoints
```bash
# Health check
curl https://app.cardflowlabs.com/health

# Dashboard stats (requires auth)
curl -H "X-Shopify-Shop-Domain: uy288y-nx.myshopify.com" \
  https://app.cardflowlabs.com/api/dashboard/stats
```

### Member Endpoints
- [ ] GET /api/members - List
- [ ] POST /api/members/enroll - Create
- [ ] GET /api/members/{id} - Detail
- [ ] PUT /api/members/{id} - Update
- [ ] POST /api/members/{id}/suspend - Suspend
- [ ] POST /api/members/{id}/reactivate - Reactivate
- [ ] POST /api/members/{id}/cancel - Cancel

### Trade-In Endpoints
- [ ] GET /api/trade-ins - List
- [ ] POST /api/trade-ins - Create
- [ ] GET /api/trade-ins/{id} - Detail
- [ ] POST /api/trade-ins/{id}/items - Add items
- [ ] PUT /api/trade-ins/{id}/items/{item_id} - Edit item
- [ ] DELETE /api/trade-ins/{id}/items/{item_id} - Delete item
- [ ] POST /api/trade-ins/{id}/approve - Approve
- [ ] POST /api/trade-ins/{id}/reject - Reject
- [ ] GET /api/trade-ins/{id}/timeline - History

### Store Credit Endpoints
- [ ] POST /api/store-credit/add - Add credit
- [ ] POST /api/store-credit/deduct - Deduct credit
- [ ] GET /api/store-credit-events - List events

### Tier Endpoints
- [ ] GET /api/tiers - List
- [ ] POST /api/tiers - Create
- [ ] PUT /api/tiers/{id} - Update
- [ ] DELETE /api/tiers/{id} - Delete
- [ ] POST /api/tiers/process-eligibility - Auto-upgrade
- [ ] POST /api/tiers/process-expirations - Downgrade

### Billing Endpoints
- [ ] GET /api/billing/plans - List plans
- [ ] GET /api/billing/status - Current status
- [ ] POST /api/billing/subscribe - Start subscription
- [ ] POST /api/billing/cancel - Cancel
- [ ] GET /api/billing/history - Billing history

### Proxy Endpoints
- [ ] GET /proxy/ - Rewards landing page
- [ ] GET /proxy/balance - Customer balance
- [ ] GET /proxy/rewards - Rewards catalog
- [ ] GET /proxy/tiers - Tier information

---

## Error Handling & Edge Cases

### Input Validation
- [ ] Invalid member ID returns 404
- [ ] Invalid tier ID returns 404
- [ ] Missing required fields return 400
- [ ] Duplicate entries handled

### Rate Limiting
- [ ] Shopify API rate limits respected
- [ ] Retry logic works

### Error Display
- [ ] Toast notifications show on errors
- [ ] API error messages user-friendly
- [ ] Sentry captures errors

---

## Performance Testing

### Load Times
- [ ] Dashboard loads < 3s
- [ ] Member list loads < 2s
- [ ] Trade-in list loads < 2s
- [ ] Search responds < 500ms

### Pagination
- [ ] Large member lists paginate
- [ ] Large trade-in lists paginate
- [ ] Pagination controls work

---

## Mobile/Responsive Testing

### Breakpoints
- [ ] Desktop (> 1024px) - Full layout
- [ ] Tablet (768px - 1024px) - Adjusted layout
- [ ] Mobile (< 768px) - Mobile layout with hamburger

### Touch Interactions
- [ ] Buttons are tap-friendly
- [ ] Forms work on mobile
- [ ] Navigation drawer slides in/out

---

## Security Testing

### Authentication
- [ ] Unauthenticated requests blocked
- [ ] Shop domain header required
- [ ] Session tokens validated

### Authorization
- [ ] Multi-tenant isolation works
- [ ] Can't access other shop's data
- [ ] Admin endpoints protected

---

## Final Checks Before Launch

### Configuration
- [ ] SHOPIFY_BILLING_TEST=false set in production
- [ ] All environment variables configured
- [ ] Sentry DSN configured
- [ ] Database backups enabled

### App Store Assets
- [ ] App icon uploaded (512x512, 1200x1200)
- [ ] Screenshots ready
- [ ] Privacy policy accessible at /privacy-policy
- [ ] Support page accessible at /support
- [ ] App listing description finalized

### Documentation
- [ ] README.md up to date
- [ ] CLAUDE.md updated
- [ ] User documentation ready

---

## Test Results Log

| Date | Tester | Area | Result | Notes |
|------|--------|------|--------|-------|
| | | | | |

---

## Sign-Off

- [ ] All HIGH priority tests pass
- [ ] No blocking bugs found
- [ ] Ready for App Store submission

**Tested By:** _______________
**Date:** _______________
