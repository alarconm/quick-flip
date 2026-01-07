# TradeUp Membership Product Workflow

This document explains how merchants set up membership products in Shopify and how TradeUp handles the subscription lifecycle.

---

## Overview

TradeUp integrates with Shopify's subscription system to manage paid membership tiers. When a customer purchases a membership product, TradeUp automatically assigns the appropriate tier and manages the subscription lifecycle.

```
┌─────────────────────────────────────────────────────────────────┐
│                  MEMBERSHIP PURCHASE FLOW                        │
│                                                                  │
│  Customer → Shopify Store → Subscription Product → Webhook      │
│                    ↓                                             │
│               TradeUp API                                        │
│                    ↓                                             │
│        Assign Tier + Create Member                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Setting Up Membership Products in Shopify

### Step 1: Create Selling Plans

Selling Plans define the subscription billing cycle (monthly, yearly).

1. Go to **Shopify Admin → Settings → Selling Plans** (or use an app like "Shopify Subscriptions")
2. Create a selling plan group called "Membership Plans"
3. Add plans for each billing cycle:
   - **Monthly**: Bill every 1 month
   - **Yearly**: Bill every 1 year (with optional discount)

### Step 2: Create Membership Products

Create one product per membership tier:

| Product | Price | Selling Plan | Tags |
|---------|-------|--------------|------|
| Bronze Membership | $9.99/mo | Monthly | `membership:bronze`, `tier-bronze` |
| Silver Membership | $19.99/mo | Monthly | `membership:silver`, `tier-silver` |
| Gold Membership | $49.99/mo | Monthly | `membership:gold`, `tier-gold` |

**Required Tags** (at least one):
- `membership:tier_name` (e.g., `membership:gold`)
- `tier:tier_name` (e.g., `tier:gold`)
- `membership-tier_name` (e.g., `membership-gold`)
- `tier-tier_name` (e.g., `tier-gold`)

### Step 3: Link Selling Plans to Tiers in TradeUp

In TradeUp Admin:

1. Go to **Settings → Tiers**
2. For each tier, enter the **Shopify Selling Plan ID** (`gid://shopify/SellingPlan/xxx`)
3. Save

This links the Shopify subscription to the TradeUp tier.

---

## 2. How Subscription Webhooks Work

TradeUp listens to these Shopify webhooks:

| Webhook | Endpoint | Action |
|---------|----------|--------|
| `SUBSCRIPTION_CONTRACTS_CREATE` | `/webhooks/subscription_contracts/create` | Assign tier to member |
| `SUBSCRIPTION_CONTRACTS_UPDATE` | `/webhooks/subscription_contracts/update` | Handle status changes |
| `SUBSCRIPTION_BILLING_ATTEMPTS_SUCCESS` | `/webhooks/subscription_billing_attempts/success` | Confirm active status |
| `SUBSCRIPTION_BILLING_ATTEMPTS_FAILURE` | `/webhooks/subscription_billing_attempts/failure` | Mark as past_due |

### Subscription Created

When a customer purchases a subscription product:

1. Shopify sends `SUBSCRIPTION_CONTRACTS_CREATE` webhook
2. TradeUp extracts the selling plan ID from the contract
3. Finds the tier linked to that selling plan
4. If no existing member: Auto-enrolls customer as new member
5. Assigns the tier using TierService (with audit trail)
6. Updates member's subscription status to `active`

```python
# Example payload fields used:
subscription_contract = {
    'admin_graphql_api_id': 'gid://shopify/SubscriptionContract/123',
    'customer': {
        'id': 456,
        'email': 'customer@example.com'
    },
    'status': 'ACTIVE',
    'lines': {
        'edges': [{
            'node': {
                'sellingPlanId': 'gid://shopify/SellingPlan/789',
                'productId': 'gid://shopify/Product/111'
            }
        }]
    }
}
```

### Subscription Status Changes

| Status | Action |
|--------|--------|
| `ACTIVE` | Ensure tier benefits are active |
| `PAUSED` | Keep tier but mark status as paused |
| `CANCELLED` | Remove tier, downgrade to free or base tier |
| `EXPIRED` | Same as cancelled |

### Billing Failures

1. **First failure**: Mark member as `past_due`, log warning
2. **Grace period** (configurable in Settings): Keep tier active
3. **After grace period**: May downgrade tier (depends on settings)
4. **Payment recovered**: Restore `active` status, log recovery

---

## 3. Tier Assignment Methods

Members can receive tiers through multiple channels:

### 1. Subscription Purchase (Automatic)
- Customer buys subscription product in Shopify
- Webhook triggers tier assignment
- Fully automatic

### 2. Staff Assignment (Manual)
- Staff assigns tier from TradeUp Admin → Members
- Optionally set expiration date
- Used for: VIPs, promotions, manual upgrades

### 3. Product Tags (Fallback)
If no selling plan is linked, TradeUp checks product tags:
- `membership:gold` → Assigns Gold tier
- `tier-silver` → Assigns Silver tier

### 4. Auto-Enrollment (Purchase-Based)
- Enabled in Settings → Auto-Enrollment
- First purchase above threshold auto-enrolls customer
- Assigns default (lowest) tier

---

## 4. Member Lifecycle States

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMBER STATES                             │
│                                                              │
│  new → active → [paused] → [past_due] → [cancelled]         │
│           ↑___________________________|  (can recover)       │
└─────────────────────────────────────────────────────────────┘
```

| State | Tier Active? | Description |
|-------|--------------|-------------|
| `active` | Yes | Normal, paying member |
| `paused` | Yes (grace) | Subscription paused, within grace period |
| `past_due` | Yes (grace) | Payment failed, within grace period |
| `cancelled` | No | Subscription cancelled, tier removed |
| `none` | N/A | Staff-assigned tier (no subscription) |

---

## 5. Tier Benefits Application

When a member has an active tier, benefits are applied:

### Trade-In Bonus
```
bonus_amount = trade_in_value × tier.bonus_rate
```
Example: $100 trade-in × 5% bonus = $5 extra credit

### Purchase Cashback
```
cashback = order_total × tier.cashback_rate
```
Example: $50 purchase × 3% cashback = $1.50 store credit

### Store Discount
Applied via Shopify discount codes or automatic discounts.

---

## 6. Technical Integration

### Required Environment Variables

```bash
# In Railway/production environment
SHOPIFY_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
```

### Webhook Registration

Webhooks are registered during app installation. To verify:

```bash
# Check registered webhooks
curl -X GET \
  "https://your-store.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: $ACCESS_TOKEN"
```

### Database Columns

Membership-related columns on the `members` table:

| Column | Type | Description |
|--------|------|-------------|
| `tier_id` | INTEGER | Current assigned tier |
| `shopify_subscription_contract_id` | VARCHAR(100) | Active subscription GID |
| `subscription_status` | VARCHAR(20) | none, active, paused, past_due, cancelled |
| `tier_assigned_by` | VARCHAR(100) | Who/what assigned the tier |
| `tier_assigned_at` | TIMESTAMP | When tier was assigned |
| `tier_expires_at` | TIMESTAMP | Expiration (for manual assignments) |

---

## 7. Troubleshooting

### Member Not Getting Tier

1. Check product has correct tag: `membership:tier_name`
2. Verify tier has `shopify_selling_plan_id` set
3. Check webhook delivery in Shopify Admin → Settings → Notifications → Webhooks
4. View logs: `railway logs`

### Subscription Status Not Updating

1. Confirm webhook endpoint is accessible (no 4xx/5xx errors)
2. Check `subscription_status` column in database
3. View TierChangeLog for audit trail

### Grace Period Issues

Adjust in Settings → Subscriptions:
- `trial_days`: Free trial before first charge
- `grace_period_days`: Days before downgrade on failed payment

---

## 8. API Endpoints

### Public Endpoints (Customer-Facing)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/membership/tiers` | GET | List available tiers |
| `/api/membership/status` | GET | Current member's tier status |
| `/api/membership/store-credit` | GET | Member's store credit balance |
| `/api/membership/credit-history` | GET | Credit transaction history |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/members/:id/assign-tier` | POST | Manually assign tier |
| `/api/members/:id/remove-tier` | POST | Remove current tier |
| `/api/tiers` | GET/POST | List/create tiers |
| `/api/tiers/:id` | GET/PUT/DELETE | Manage single tier |

---

## 9. Best Practices

### For Merchants

1. **Clear product naming**: "Gold Membership - Monthly"
2. **Consistent tagging**: Always use `membership:tier_name` format
3. **Set grace period**: 3-7 days gives customers time to fix payment issues
4. **Enable notifications**: Alert customers about billing issues

### For Development

1. **Use TierService**: Always use `TierService` for tier changes (audit trail)
2. **Handle webhooks idempotently**: Same webhook may be delivered multiple times
3. **Log everything**: Use proper logging levels for debugging
4. **Test subscription lifecycle**: Use Shopify's test mode for development

---

*Last updated: January 2026*
