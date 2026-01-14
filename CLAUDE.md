# TradeUp - Claude Code Project Memory

## Overview

TradeUp is a **Shopify embedded app** for loyalty programs, trade-in management, and store credit. Built for collectibles stores (sports cards, Pokemon, MTG).

- **Production**: https://app.cardflowlabs.com
- **Railway Backend**: https://tradeup-production.up.railway.app
- **Test Store**: uy288y-nx.myshopify.com (ORB Sports Cards)
- **Repository**: https://github.com/alarconm/tradeup

## Current Status (January 14, 2026)

**FINAL TESTING PHASE** - 98% of user stories passing (196/200). See `docs/TESTING_PROGRESS.md`.

### What's Complete

| Component | Status | Notes |
|-----------|--------|-------|
| Backend API (31 modules) | Complete | All endpoints functional |
| Frontend (17 admin pages) | Complete | Full merchant dashboard |
| Services (16 services) | Complete | Business logic layer |
| Customer Account Extension | Complete | Rewards display in customer account |
| Checkout UI Extension | Complete | Checkout integration |
| Post-Purchase Extension | Complete | Post-purchase upsells |
| Pixel Extension | Complete | Analytics tracking |
| Shopify Billing (4 plans) | Complete | Free, Starter, Growth, Pro |
| Webhooks (13 handlers) | Complete | Orders, customers, billing |
| Landing Pages (13 variants) | Complete | A/B test ready |
| App Proxy | Complete | Customer rewards page |

### Temporarily Disabled Extensions

| Extension | Reason | Status |
|-----------|--------|--------|
| checkout-validation | Blocking deploy | Can re-enable post-launch |
| tier-discount-function | Blocking deploy | Can re-enable post-launch |
| theme-blocks | Removed for deploy | Future enhancement |

### Remaining Items

1. **Commit pending changes** - Extension cleanup needs to be committed
2. **End-to-end browser testing** - Full customer flow verification
3. **Set SHOPIFY_BILLING_TEST=false** - For production charges
4. **Complete setup in test store** - Verify store credit, membership products

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
│   ├── api/               # 31 REST API modules
│   ├── models/            # 11 SQLAlchemy models
│   ├── services/          # 16 business logic services
│   ├── webhooks/          # 13 Shopify webhook handlers
│   └── utils/             # Helpers (sentry.py)
├── frontend/              # React SPA (Vite + TypeScript)
│   ├── src/admin/         # 17 merchant admin pages
│   ├── src/embedded/      # Shopify embedded pages
│   └── src/pages/         # Public pages
├── extensions/            # Shopify extensions
│   ├── checkout-ui/       # Checkout integration
│   ├── customer-account-ui/  # Customer rewards display
│   ├── post-purchase-ui/  # Post-purchase upsells
│   └── tradeup-pixel/     # Analytics tracking
├── landing-pages/         # 13 A/B test variants
├── migrations/            # 20 Alembic migrations
├── scripts/               # Dev tools
└── docs/                  # 13 documentation files
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

### Active Extensions

| Extension | Purpose | Key File |
|-----------|---------|----------|
| checkout-ui | Checkout integration | `extensions/checkout-ui/` |
| customer-account-ui | Rewards display | `extensions/customer-account-ui/src/TradeUpRewards.jsx` |
| post-purchase-ui | Post-purchase upsells | `extensions/post-purchase-ui/` |
| tradeup-pixel | Analytics tracking | `extensions/tradeup-pixel/` |

### Disabled Extensions (in `.disabled` folders)
- `checkout-validation.disabled` - Checkout validation (future)
- `tier-discount-function.disabled` - Tier discounts (future)

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
