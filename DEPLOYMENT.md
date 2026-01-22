# TradeUp Deployment Guide

Professional deployment workflow for TradeUp Shopify App.

## Quick Reference

```bash
# Development (hot-reload extensions in dev store)
npm run dev

# Deploy extensions (staging - not released to users)
npm run deploy

# Release to users (after testing)
npm run release --version=<version-name>

# Full deploy + release in one command
npm run deploy:release

# Version bump + tag + push
npm run version:patch   # 2.0.0 -> 2.0.1
npm run version:minor   # 2.0.0 -> 2.1.0
npm run version:major   # 2.0.0 -> 3.0.0
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TradeUp App                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐          ┌──────────────────────────────┐ │
│  │   Flask Backend  │          │    Shopify Extensions        │ │
│  │   (Railway)      │          │    (Shopify CDN)             │ │
│  │                  │          │                              │ │
│  │  • API endpoints │          │  • checkout-ui               │ │
│  │  • Webhooks      │          │  • customer-account-ui       │ │
│  │  • Database      │          │  • post-purchase-ui          │ │
│  │  • Billing       │          │  • pos-ui                    │ │
│  │                  │          │                              │ │
│  │  Deploy: CI/CD   │          │  Deploy: Local CLI           │ │
│  │  (auto on push)  │          │  (manual command)            │ │
│  └──────────────────┘          └──────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Environments

### Current: Development/Staging

| Component | Environment | URL |
|-----------|-------------|-----|
| Backend | Railway | https://tradeup-production.up.railway.app |
| App | Shopify Partners | TradeUp by Cardflow Labs |
| Test Store | Shopify | uy288y-nx.myshopify.com |

### Future: Production (Post-Launch)

When launching to public stores, create a separate Shopify app:

| App | Purpose | Who Uses It |
|-----|---------|-------------|
| TradeUp Dev | Development, testing, staging | Internal team only |
| TradeUp | Production | Real merchant stores |

**Why separate apps?**
- Test extensions without affecting real merchants
- Different API keys = complete isolation
- Can test breaking changes safely
- Matches enterprise Shopify developer practices

## Deployment Workflows

### 1. Daily Development

```bash
# Start local dev server with hot-reload
npm run dev

# This opens your dev store with live extension updates
# Make changes, see them instantly in the browser
```

### 2. Deploy to Staging (Test Before Release)

```bash
# Validate code first
npm run validate

# Deploy extensions (creates new version, NOT released)
npm run deploy

# Output: "tradeup-by-cardflow-labs-17"
# Test in your dev store at this point
```

### 3. Release to Users

```bash
# After testing, release the deployed version
npm run release --version=tradeup-by-cardflow-labs-17

# Or deploy + release in one command (when confident)
npm run deploy:release
```

### 4. Version Release (Tags)

```bash
# Bug fix release
npm run version:patch   # 2.0.0 -> 2.0.1

# New feature release
npm run version:minor   # 2.0.0 -> 2.1.0

# Breaking change release
npm run version:major   # 2.0.0 -> 3.0.0
```

This automatically:
1. Bumps version in package.json
2. Creates a git commit
3. Creates a git tag (v2.0.1)
4. Pushes to GitHub with tags

## Pre-Release Checklist

Before releasing a new version:

- [ ] All E2E tests passing (`npm run test:e2e` or manual)
- [ ] Validation passes (`npm run validate`)
- [ ] Extensions deploy without errors (`npm run deploy`)
- [ ] Tested in dev store manually
- [ ] No console errors in browser
- [ ] Billing flows work (if changed)
- [ ] Webhooks firing correctly (check Railway logs)

## Backend Deployment (Automatic)

The Flask backend deploys automatically when you push to `main`:

```bash
git push origin main
# Railway detects push, rebuilds, deploys
# ~2-3 minutes for full deploy
```

**Check deployment status:**
```bash
railway deployment list
railway logs --deployment <id>
```

## Extension Deployment (Manual)

Extensions are deployed manually for safety:

```bash
# Step 1: Deploy (creates version, not live yet)
npm run deploy

# Step 2: Test in dev store
# Visit your store, check extensions work

# Step 3: Release (makes it live)
npm run release --version=<version-from-step-1>
```

## Rollback Procedures

### Backend Rollback

```bash
# View recent deployments
railway deployment list

# Rollback to previous deployment
railway rollback <deployment-id>
```

### Extension Rollback

```bash
# List versions in Shopify Partners Dashboard
# Or use CLI to release a previous version
npm run release --version=<previous-version-name>
```

## Monitoring

| What | Where |
|------|-------|
| Backend errors | Sentry dashboard |
| Backend logs | Railway logs |
| Extension errors | Browser console / Shopify Partner dashboard |
| API health | https://app.cardflowlabs.com/health |

## Secrets & Environment

### GitHub Secrets (for CI/CD)

| Secret | Purpose |
|--------|---------|
| `SHOPIFY_API_KEY` | App API key |
| `SHOPIFY_CLI_PARTNERS_TOKEN` | CLI authentication |

### Railway Environment

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Flask session encryption |
| `DATABASE_URL` | PostgreSQL connection |
| `SHOPIFY_API_KEY` | App API key |
| `SHOPIFY_API_SECRET` | App secret |
| `APP_URL` | https://app.cardflowlabs.com |
| `SHOPIFY_BILLING_TEST` | `true` for dev, `false` for production |

## Production Launch Checklist

When ready to go live with real merchants:

1. **Create Production App**
   - New app in Shopify Partners: "TradeUp"
   - New Railway project: "tradeup-production"
   - New database

2. **Update Billing**
   - Set `SHOPIFY_BILLING_TEST=false` in Railway
   - Verify billing plans work with real charges

3. **App Store Submission**
   - Complete app listing
   - Submit for review
   - Address any feedback

4. **DNS & SSL**
   - Production domain configured
   - SSL certificates valid

5. **Monitoring**
   - Sentry alerts configured
   - Uptime monitoring (optional: UptimeRobot, Pingdom)

## Troubleshooting

### Extension deploy fails

```bash
# Check for build errors
cd extensions/checkout-ui && npm run build

# Clear Shopify cache
npx shopify app dev --reset
```

### Backend deploy fails

```bash
# Check Railway logs
railway logs

# Common issues:
# - Migration timeout: Use fix-schema endpoint instead
# - Health check fail: Simplify startCommand
```

### Version mismatch

```bash
# Sync package.json version with tags
git tag v$(node -p "require('./package.json').version")
git push origin --tags
```
