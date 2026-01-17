# TradeUp - Claude Code Project Memory

## Overview

TradeUp is a **Shopify embedded app** for loyalty programs, trade-in management, and store credit. Built for collectibles stores (sports cards, Pokemon, MTG).

- **Production**: https://app.cardflowlabs.com
- **Railway Backend**: https://tradeup-production.up.railway.app
- **Test Store**: uy288y-nx.myshopify.com (ORB Sports Cards)
- **Repository**: https://github.com/alarconm/tradeup

## Current Status (January 17, 2026)

**FINAL TESTING PHASE** - 98% of user stories passing (196/200). See `docs/TESTING_PROGRESS.md`.

### What's Complete

| Component | Status | Notes |
|-----------|--------|-------|
| Backend API (43 modules) | 98% Complete | 2 runtime bugs need fixing |
| Frontend (17+ admin pages) | Complete | Full merchant dashboard, no TODOs |
| Services (30 services) | 95% Complete | 2 critical bugs, some placeholders |
| Customer Account Extension | Complete | 1,211 lines, production ready |
| Checkout UI Extension | Complete | Points display, tier badges |
| Post-Purchase Extension | Complete | Celebration + referral prompts |
| POS UI Extension | Complete | Member lookup for retail |
| Shopify Billing (4 plans) | Complete | Free, Starter, Growth, Pro |
| Webhooks (10/13 handlers) | 77% Complete | 3 missing handlers |
| Landing Pages (13 variants) | Complete | A/B test ready |
| App Proxy | Complete | Customer rewards page |

### All Critical Bugs FIXED (January 17, 2026)

| Bug | Fix Applied |
|-----|-------------|
| `flow_service.py:651` | ✓ Changed to `get_shopify_balance(member).get('balance', 0)` |
| `tier_service.py:46` | ✓ Added `shopify_client` parameter to `__init__()` |

### All Missing Webhook Handlers IMPLEMENTED

| Topic | Status |
|-------|--------|
| `refunds/create` | ✓ Reverses points and credit proportionally |
| `orders/paid` | ✓ Optional payment confirmation workflow |
| `products/create` | ✓ Detects new membership products |

### Temporarily Disabled Extensions

| Extension | Reason | Status |
|-----------|--------|--------|
| checkout-validation | Blocking deploy | Can re-enable post-launch |
| tier-discount-function | Blocking deploy | Can re-enable post-launch |

### Remaining Items

1. **Fix critical bugs** - flow_service.py and tier_service.py runtime errors
2. **Implement refunds/create webhook** - Financial impact if refunds aren't processed
3. **End-to-end browser testing** - Full customer flow verification
4. **Set SHOPIFY_BILLING_TEST=false** - For production charges

## Quick Commands

```bash
# Windows
scripts\validate.bat         # Validate locally
scripts\push.bat             # Validate + push
scripts\status.bat           # Production health check

# Unix/Mac
make validate                # Validate locally
make push                    # Validate + push
make dev                     # Local development
```

## Directory Structure

```
tradeup/
├── app/                    # Flask backend
│   ├── api/               # 43 REST API modules
│   ├── models/            # 11 SQLAlchemy models
│   ├── services/          # 30 business logic services
│   ├── webhooks/          # 6 webhook handler files (10 implemented topics)
│   └── utils/             # Helpers (sentry.py)
├── frontend/              # React SPA (Vite + TypeScript)
│   ├── src/admin/         # Admin components
│   ├── src/embedded/      # 17+ Shopify embedded pages
│   └── src/pages/         # Public pages
├── extensions/            # Shopify extensions
│   ├── checkout-ui/       # Checkout points display
│   ├── customer-account-ui/  # Customer rewards display (1,211 lines)
│   ├── post-purchase-ui/  # Post-purchase celebration
│   ├── pos-ui/            # POS member lookup
│   └── *.disabled/        # Temporarily disabled extensions
├── landing-pages/         # 13 A/B test variants
├── migrations/            # Alembic migrations
├── scripts/               # Dev tools
└── docs/                  # Documentation files
```

## API Endpoints

### Core
- `GET /health` - Health check
- `GET /api/dashboard/stats` - Dashboard metrics

### Members & Tiers
- `GET/POST /api/members` - Member CRUD
- `GET/POST /api/tiers` - Tier configuration
- `POST /api/membership/assign-tier` - Assign tier to member

### Trade-Ins
- `GET/POST /api/trade-ins` - Batch management
- `POST /api/trade-ins/{id}/items` - Add items

### Store Credit
- `POST /api/store-credit/add` - Issue credit
- `POST /api/store-credit/deduct` - Deduct credit
- `GET /api/store-credit-events` - Bulk campaigns

### Billing
- `GET /api/billing/plans` - Available plans
- `POST /api/billing/subscribe` - Start subscription
- `POST /api/billing/cancel` - Cancel subscription

### Onboarding
- `GET /api/onboarding/status` - Setup progress
- `GET /api/onboarding/store-credit-check` - Verify store credit enabled
- `POST /api/onboarding/templates/{key}/apply` - Apply tier template

### App Proxy (Customer-Facing)
- `GET /proxy/` - Rewards landing page (HTML)
- `GET /proxy/balance` - Customer points balance (JSON)
- `GET /proxy/rewards` - Available rewards catalog (JSON)
- `GET /proxy/tiers` - Tier benefits comparison (JSON)

Accessible at: `store.myshopify.com/apps/rewards`

## Shopify Extensions

### Active Extensions (4)

| Extension | Purpose | Key Files |
|-----------|---------|-----------|
| checkout-ui | Points display at checkout | `src/Checkout.jsx`, 5 components |
| customer-account-ui | Full rewards dashboard | `src/TradeUpRewards.jsx` (1,211 lines) |
| post-purchase-ui | Celebration + referral prompt | `src/index.jsx` (585 lines) |
| pos-ui | POS member lookup | `src/SmartGridTile.tsx`, `src/MemberModal.tsx` (TypeScript) |

### Disabled Extensions (2)
- `checkout-validation.disabled` - Checkout validation (can re-enable post-launch)
- `tier-discount-function.disabled` - Tier discounts (can re-enable post-launch)

## Billing Plans

| Plan | Price | Members | Tiers |
|------|-------|---------|-------|
| Free | $0 | 50 | 2 |
| Starter | $19/mo | 200 | 3 |
| Growth | $49/mo | 1,000 | 5 |
| Pro | $99/mo | Unlimited | Unlimited |

## Environment Variables

### Required
```env
SECRET_KEY=<secure-random>
DATABASE_URL=postgresql://...
SHOPIFY_API_KEY=<from-partner-dashboard>
SHOPIFY_API_SECRET=<from-partner-dashboard>
APP_URL=https://app.cardflowlabs.com
```

### Optional
```env
SHOPIFY_BILLING_TEST=true    # Set false for production
SENTRY_DSN=<sentry-dsn>      # Error tracking
```

## Key Files

| File | Purpose |
|------|---------|
| `app/__init__.py` | Flask app factory, blueprint registration |
| `app/config.py` | Environment configuration |
| `frontend/src/App.tsx` | React router (routes to EmbeddedApp) |
| `frontend/src/admin/api.ts` | API client with shop domain interceptor |
| `shopify.app.toml` | Shopify app configuration |

## Development Notes

### Shop Domain Header
API requires `X-Shopify-Shop-Domain` header. In development, the axios interceptor in `frontend/src/admin/api.ts` adds this automatically.

### Local Testing
```bash
# Backend (Flask)
cd tradeup && python run.py

# Frontend (Vite)
cd frontend && npm run dev

# Test API
curl -H "X-Shopify-Shop-Domain: uy288y-nx.myshopify.com" http://localhost:5000/api/onboarding/status
```

### Database
- PostgreSQL in production (Railway)
- SQLite locally (auto-created)
- Migrations: `flask db upgrade`

## Railway Deployment Best Practices

### Quick Deploy Commands
```bash
# Check deployment status FIRST
railway deployment list

# Deploy (pick ONE method, not both)
railway up                    # Direct upload
git push origin main          # GitHub trigger

# Check logs if deployment fails
railway logs --deployment <id>
```

### Critical Rules
1. **Keep startCommand simple** - Just `gunicorn -c gunicorn.conf.py run:app`
2. **Never add migrations to startCommand** - They can timeout and fail health checks
3. **Use fix-schema endpoint for quick schema fixes** - `POST /api/admin/fix-schema?key=tradeup-schema-fix-2026`
4. **Check `railway deployment list` immediately** - Don't wait blindly for deploys
5. **The `nul` file is in .gitignore** - Windows reserved name that breaks Railway indexer

### If Deployment Fails
1. Run `railway deployment list` to confirm failure
2. Check logs: `railway logs --deployment <deployment-id>`
3. Common issues:
   - `nul` file in repo → delete it, it's in .gitignore
   - Health check timeout → simplify startCommand
   - Migration errors → use fix-schema endpoint instead

### Fix-Schema Endpoint
For adding missing columns without migrations:
```bash
curl -X POST "https://app.cardflowlabs.com/api/admin/fix-schema?key=tradeup-schema-fix-2026"
```
Add new columns to `app/api/admin.py` in the `columns_to_add` list.

## Recent Changes (January 13-14, 2026)

### Session 2 Enhancements (Jan 13)
- Added usage warnings at 80%, 90%, 100% thresholds
- Added member suspend/reactivate/cancel endpoints
- Added tier change logging
- Added trade-in item editing (PUT/DELETE)
- Added auto-approval threshold enforcement
- Added auto-upgrade/downgrade service
- Added metafield sync/verify endpoints
- Added 15+ granular notification controls
- Added daily report endpoint with comparison metrics

### Deploy Fixes (Jan 13)
- Disabled checkout-validation and tier-discount-function to unblock deploy
- Removed theme-blocks extension (blocking deploy)
- Fixed shopify.app.toml for deploy compatibility
- Made member search instant (like Shopify POS)

### Earlier (Jan 6)
- Added onboarding flow with store credit check
- Added Sentry error tracking (frontend + backend)
- Fixed BrowserRouter missing in main.tsx

## Contact

- **App**: TradeUp by Cardflow Labs
- **Support**: support@cardflowlabs.com
- **Privacy**: privacy@cardflowlabs.com
