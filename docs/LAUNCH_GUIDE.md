# TradeUp Launch Guide: From Testing to Production

> **Your First Monetized Shopify App - Complete Launch Playbook**
>
> This guide covers everything you need to successfully launch TradeUp on the Shopify App Store.

---

## Table of Contents

1. [Pre-Launch Checklist](#1-pre-launch-checklist)
2. [Local Development & Testing](#2-local-development--testing)
3. [Staging Environment Testing](#3-staging-environment-testing)
4. [App Store Submission](#4-app-store-submission)
5. [Production Deployment](#5-production-deployment)
6. [Post-Launch Monitoring](#6-post-launch-monitoring)
7. [Billing & Monetization](#7-billing--monetization)
8. [Troubleshooting Guide](#8-troubleshooting-guide)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Support & Maintenance](#10-support--maintenance)

---

## 1. Pre-Launch Checklist

### 1.1 Code Quality Verification

```bash
# Run the full test suite
cd C:\Users\malar\OneDrive\Documents\Coding Projects\tradeup
python -m pytest tests/ -v --tb=short

# Expected: 500+ tests passing
# If any failures, fix them before proceeding
```

### 1.2 Security Checklist

- [ ] **SECRET_KEY is secure** - Not containing 'secret' or default values
  ```bash
  # Generate a secure key if needed
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

- [ ] **Environment variables are production-ready**
  - `SHOPIFY_BILLING_TEST=false` (enables real charges)
  - `FLASK_ENV=production`
  - `SECRET_KEY` is unique and secure

- [ ] **No hardcoded credentials** in code
  ```bash
  # Search for potential issues
  grep -r "password\|secret\|api_key" app/ --include="*.py" | grep -v "\.pyc"
  ```

- [ ] **HTTPS enforced** for all endpoints

### 1.3 Database Verification

```bash
# Check all migrations are applied
flask db current
flask db history

# Verify tables exist
# Use the fix-schema endpoint if needed:
curl -X POST "https://app.cardflowlabs.com/api/admin/fix-schema?key=tradeup-schema-fix-2026"
```

### 1.4 Shopify App Configuration

Verify in `shopify.app.toml`:

```toml
# These should be correct for production
name = "TradeUp by Cardflow Labs"
client_id = "your-production-client-id"
application_url = "https://app.cardflowlabs.com"

[webhooks]
api_version = "2026-01"

[app_proxy]
url = "https://app.cardflowlabs.com/proxy"
subpath = "rewards"
prefix = "apps"
```

### 1.5 Billing Configuration

Verify billing plans in `app/services/shopify_billing.py`:

| Plan | Price | Features |
|------|-------|----------|
| Free | $0/mo | 50 members, 2 tiers |
| Starter | $19/mo | 200 members, 3 tiers |
| Growth | $49/mo | 1,000 members, 5 tiers |
| Pro | $99/mo | Unlimited |

---

## 2. Local Development & Testing

### 2.1 Setting Up Local Environment

```bash
# Clone and setup
git clone https://github.com/alarconm/tradeup.git
cd tradeup

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
copy .env.example .env
# Edit .env with your development credentials
```

### 2.2 Running Locally

```bash
# Terminal 1: Backend
python run.py
# Runs on http://localhost:5000

# Terminal 2: Frontend (optional for standalone testing)
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173

# Terminal 3: Shopify Dev Server (for embedded testing)
npm run dev
# This connects to your dev store
```

### 2.3 Running Tests

```bash
# Full test suite
python -m pytest tests/ -v

# Specific test file
python -m pytest tests/test_members.py -v

# With coverage report
python -m pytest tests/ --cov=app --cov-report=html
# Open htmlcov/index.html to view coverage

# Quick smoke test
python -m pytest tests/ -x -q  # Stop on first failure
```

### 2.4 Manual Testing Checklist

Test these flows manually in your dev store:

#### Member Management
- [ ] Create a new member
- [ ] Edit member details
- [ ] Search for members (instant search)
- [ ] View member's trade-in history
- [ ] Suspend/reactivate a member

#### Trade-Ins
- [ ] Create a new trade-in batch
- [ ] Add items to a batch
- [ ] Approve a trade-in (under auto-approval threshold)
- [ ] Approve a trade-in (over threshold - needs manual approval)
- [ ] Issue store credit from approved trade-in

#### Tiers & Membership
- [ ] Create membership tiers
- [ ] Assign tier to member
- [ ] Verify tier benefits apply

#### Store Credit
- [ ] Issue manual credit
- [ ] Verify credit appears in Shopify customer metafields
- [ ] Test credit deduction at checkout

#### Settings
- [ ] Update branding settings
- [ ] Enable/disable features
- [ ] Test notification settings

---

## 3. Staging Environment Testing

### 3.1 Deploy to Staging

```bash
# Ensure you're on the correct branch
git checkout main
git pull origin main

# Run pre-deployment validation
npm run prerelease

# Deploy extensions to staging (not released yet)
npm run deploy
# Note the version number: tradeup-by-cardflow-labs-XX
```

### 3.2 Test in Dev Store

Your dev store: `uy288y-nx.myshopify.com`

1. **Open the app** in Shopify Admin → Apps → TradeUp
2. **Complete onboarding** if not done
3. **Test all core flows** from Section 2.4

### 3.3 Extension Testing

#### Customer Account Extension
1. Create a test customer account
2. Navigate to the customer account page
3. Verify rewards dashboard displays correctly
4. Check points balance, tier status, referral link

#### Checkout Extension
1. Add items to cart as a logged-in member
2. Proceed to checkout
3. Verify tier badge and points display

#### Post-Purchase Extension
1. Complete a test purchase
2. Verify celebration message appears
3. Check referral prompt displays

#### POS Extension (if using POS)
1. Open Shopify POS
2. Search for a member
3. Verify member details display correctly

### 3.4 Webhook Testing

```bash
# Verify webhooks are registered
shopify app deploy

# Test order webhook (create a test order in dev store)
# Check logs for webhook processing:
railway logs --filter "webhook"
```

### 3.5 Billing Testing

**IMPORTANT:** Keep `SHOPIFY_BILLING_TEST=true` during staging tests!

1. Go to Settings → Billing
2. Click "Choose a Plan"
3. Select a paid plan
4. Verify Shopify billing modal appears
5. Complete test purchase (no real charge with test mode)
6. Verify plan is activated

---

## 4. App Store Submission

### 4.1 App Listing Requirements

#### Required Assets
- [ ] **App Icon** (1200x1200 PNG, no rounded corners)
- [ ] **Screenshots** (minimum 3, 1600x900 recommended)
  - Dashboard view
  - Member management
  - Trade-in workflow
- [ ] **App Description** (detailed, keyword-rich)
- [ ] **Key Benefits** (3-5 bullet points)
- [ ] **Demo Video** (optional but recommended)

#### Required Links
- [ ] Privacy Policy: `https://app.cardflowlabs.com/privacy`
- [ ] Support Email: `support@cardflowlabs.com`
- [ ] FAQ/Documentation URL

### 4.2 Submission Checklist

In Shopify Partner Dashboard → Apps → TradeUp → App Setup:

**App Details**
- [ ] App name: "TradeUp by Cardflow Labs"
- [ ] App tagline (max 80 chars)
- [ ] Full description
- [ ] Category: "Loyalty, rewards, and referrals"

**Pricing**
- [ ] Pricing model: Recurring charge
- [ ] Plans configured with correct prices
- [ ] Free plan available (for approval)

**Requirements**
- [ ] Shopify permissions requested are minimal and justified
- [ ] OAuth scopes documented

### 4.3 App Review Process

1. **Submit for Review** via Partner Dashboard
2. **Review Timeline:** Usually 5-10 business days
3. **Common Rejection Reasons:**
   - Missing privacy policy
   - Unclear app functionality
   - Bugs during testing
   - Excessive permissions requested

### 4.4 Respond to Review Feedback

If Shopify requests changes:
1. Make the required changes
2. Test thoroughly
3. Resubmit with a note explaining changes
4. Timeline resets to 5-10 days

---

## 5. Production Deployment

### 5.1 Pre-Production Checklist

```bash
# 1. Ensure all tests pass
python -m pytest tests/ -v
# Must be 100% passing

# 2. Run validation
npm run prerelease

# 3. Verify environment variables in Railway
railway variables
# Required for production:
# - SECRET_KEY (secure, unique)
# - DATABASE_URL
# - SHOPIFY_API_KEY
# - SHOPIFY_API_SECRET
# - SHOPIFY_BILLING_TEST=false  # CRITICAL!
# - SENTRY_DSN (for error tracking)
```

### 5.2 Enable Production Billing

**THIS IS THE MOST IMPORTANT STEP!**

```bash
# In Railway, set billing to production mode:
railway variables --set "SHOPIFY_BILLING_TEST=false"

# Verify it's set correctly:
railway variables | grep BILLING
# Should show: SHOPIFY_BILLING_TEST=false
```

### 5.3 Deploy Backend

```bash
# Option 1: Auto-deploy via git push
git push origin main
# Railway auto-deploys from main branch

# Option 2: Manual deploy
railway up

# Verify deployment:
railway deployment list
curl https://app.cardflowlabs.com/health
# Should return: {"service":"tradeup","status":"healthy"}
```

### 5.4 Deploy Shopify Extensions

```bash
# Deploy all extensions
npm run deploy

# Note the version number (e.g., tradeup-by-cardflow-labs-18)

# Release to production (makes it live for all users)
npm run release --version=tradeup-by-cardflow-labs-18
# Or with force flag:
npx shopify app release --version=tradeup-by-cardflow-labs-18 --force

# Create git tag for this release
npm run version:minor  # If new features
# or
npm run version:patch  # If bug fixes only
```

### 5.5 Verify Production Deployment

```bash
# 1. Health check
curl https://app.cardflowlabs.com/health

# 2. API endpoints
curl https://app.cardflowlabs.com/api/dashboard/stats \
  -H "X-Shopify-Shop-Domain: uy288y-nx.myshopify.com"

# 3. Open app in Shopify Admin
# https://admin.shopify.com/store/YOUR-STORE/apps/tradeup-2
```

---

## 6. Post-Launch Monitoring

### 6.1 Error Monitoring (Sentry)

Dashboard: https://sentry.io (login with your account)

**Key Metrics to Watch:**
- Error rate (should be < 1%)
- New errors (investigate immediately)
- Affected users

**Alert Setup:**
- Set up Slack/email alerts for new errors
- Set threshold alerts for error spikes

### 6.2 Railway Monitoring

```bash
# View live logs
railway logs -f

# Check deployment status
railway deployment list

# Monitor resources
railway status
```

### 6.3 Shopify Partner Dashboard

Monitor in Partner Dashboard → Apps → TradeUp → Insights:

- **Install/uninstall rate**
- **Active installs**
- **Revenue (for paid plans)**
- **User feedback/reviews**

### 6.4 Key Metrics to Track

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Uptime | 99.9% | Investigate Railway issues |
| Error Rate | < 1% | Check Sentry, fix bugs |
| API Response Time | < 500ms | Optimize slow endpoints |
| Install Rate | Growing | Improve app listing |
| Churn Rate | < 5%/mo | Analyze feedback, improve UX |

### 6.5 Daily Monitoring Routine (First 2 Weeks)

1. **Morning:**
   - Check Sentry for new errors
   - Review Railway logs for warnings
   - Check app reviews in Partner Dashboard

2. **Evening:**
   - Review daily stats
   - Respond to any support emails
   - Note any patterns in issues

---

## 7. Billing & Monetization

### 7.1 How Shopify Billing Works

1. Merchant clicks "Choose a Plan" in your app
2. Your app creates a `RecurringApplicationCharge` via Shopify API
3. Merchant approves charge in Shopify modal
4. Shopify handles all billing, taxes, currency conversion
5. You receive 80% of revenue (Shopify takes 20%)

### 7.2 Billing Flow in TradeUp

```
Settings → Billing → Choose Plan → Shopify Approval → Plan Active
```

Code flow:
1. `EmbeddedBilling.tsx` - Frontend billing page
2. `app/api/billing.py` - API endpoints
3. `app/services/shopify_billing.py` - Billing logic
4. Webhooks handle subscription updates

### 7.3 Testing Billing in Production

**AFTER enabling production billing:**

1. Install app on a test store (not dev store)
2. Go to Settings → Billing
3. Select a paid plan
4. Complete REAL billing approval
5. Verify subscription in Partner Dashboard → Finances

**Note:** You'll be charged real money, but you can cancel immediately.

### 7.4 Revenue Tracking

In Shopify Partner Dashboard:
- Finances → Payouts (see your earnings)
- Apps → TradeUp → Revenue

Shopify pays out:
- Net 15 terms (paid 15 days after month end)
- Minimum payout: $25

### 7.5 Handling Failed Payments

When a merchant's payment fails:
1. Shopify sends `app_subscriptions/update` webhook
2. Your app receives `status: 'frozen'`
3. App should gracefully limit features
4. Shopify retries payment automatically

---

## 8. Troubleshooting Guide

### 8.1 Common Issues

#### App Shows Blank Screen

**Symptoms:** App loads but content area is white/empty

**Solutions:**
```bash
# 1. Check if backend is running
curl https://app.cardflowlabs.com/health

# 2. Check browser console for errors
# Open DevTools (F12) → Console

# 3. Verify API endpoints
curl https://app.cardflowlabs.com/api/dashboard/stats \
  -H "X-Shopify-Shop-Domain: YOUR-STORE.myshopify.com"

# 4. Clear browser cache and reload
# Ctrl+Shift+R (hard refresh)
```

#### Webhooks Not Processing

**Symptoms:** Orders don't trigger point awards

**Solutions:**
```bash
# 1. Check webhook registration
shopify app deploy

# 2. Verify webhook endpoints in Partner Dashboard
# App Setup → App URL → Webhooks

# 3. Check Railway logs for webhook errors
railway logs --filter "webhook"

# 4. Test webhook manually
# Create a test order in dev store
```

#### Store Credit Not Syncing

**Symptoms:** Credit issued but not showing in Shopify

**Solutions:**
```bash
# 1. Check metafield sync
curl "https://app.cardflowlabs.com/api/members/MEMBER_ID/sync-metafields" \
  -X POST -H "X-Shopify-Shop-Domain: YOUR-STORE.myshopify.com"

# 2. Verify Shopify API permissions
# Check OAuth scopes include write_customers

# 3. Check Shopify admin for metafield
# Customers → Select customer → Metafields
```

#### Billing Not Working

**Symptoms:** Plan selection doesn't work or charges fail

**Solutions:**
```bash
# 1. Verify billing mode
railway variables | grep BILLING_TEST
# Should be: false for production, true for testing

# 2. Check billing API
curl "https://app.cardflowlabs.com/api/billing/plans" \
  -H "X-Shopify-Shop-Domain: YOUR-STORE.myshopify.com"

# 3. Check Shopify Partner Dashboard for billing errors
# Apps → TradeUp → Charges
```

### 8.2 Emergency Contacts

- **Railway Status:** https://status.railway.app
- **Shopify Status:** https://status.shopify.com
- **Sentry Issues:** https://sentry.io

---

## 9. Rollback Procedures

### 9.1 Backend Rollback

If a deployment causes issues:

```bash
# 1. List recent deployments
railway deployment list

# 2. Identify the last working deployment ID

# 3. Rollback (Railway doesn't have built-in rollback)
# Option A: Revert git commit and push
git revert HEAD
git push origin main

# Option B: Redeploy previous commit
git checkout <previous-commit-hash>
railway up
git checkout main
```

### 9.2 Extension Rollback

```bash
# 1. List extension versions
npx shopify app versions list

# 2. Release a previous version
npx shopify app release --version=tradeup-by-cardflow-labs-17 --force
```

### 9.3 Database Rollback

```bash
# 1. List migrations
flask db history

# 2. Downgrade to specific revision
flask db downgrade <revision>

# CAUTION: This may cause data loss
# Always backup first!
```

### 9.4 Creating Backups

```bash
# Database backup (run periodically)
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Or use Railway's automatic backups (if enabled)
```

---

## 10. Support & Maintenance

### 10.1 Handling Support Requests

**Email:** support@cardflowlabs.com

**Response Time Targets:**
- Critical (app down): < 1 hour
- High (feature broken): < 4 hours
- Medium (questions): < 24 hours
- Low (feature requests): < 48 hours

### 10.2 Responding to App Reviews

**Positive Reviews:**
- Thank the merchant
- Ask for specific feedback on what they like

**Negative Reviews:**
- Respond quickly and professionally
- Apologize for the issue
- Offer to help directly via support email
- Update review once issue is resolved

### 10.3 Regular Maintenance Tasks

**Weekly:**
- Review Sentry errors
- Check Railway resource usage
- Review new app reviews
- Respond to support emails

**Monthly:**
- Review analytics and growth metrics
- Update dependencies if needed
- Review and archive old logs
- Test backup restoration

**Quarterly:**
- Security audit
- Performance review
- Feature roadmap planning
- Pricing review

### 10.4 Updating the App

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes, test locally

# 3. Run test suite
python -m pytest tests/ -v

# 4. Create PR and merge to main

# 5. Deploy
npm run prerelease  # Validation
npm run deploy      # Deploy to staging
# Test in dev store
npm run release --version=tradeup-by-cardflow-labs-XX
npm run version:patch  # or version:minor

# 6. Monitor for issues
railway logs -f
```

---

## Quick Reference Commands

```bash
# === Development ===
python run.py                    # Run backend locally
npm run dev                      # Run with Shopify dev server

# === Testing ===
python -m pytest tests/ -v       # Run all tests
python -m pytest tests/ -x       # Stop on first failure
npm run validate                 # Run validation checks

# === Deployment ===
npm run prerelease               # Pre-deployment validation
npm run deploy                   # Deploy extensions (staging)
npm run release --version=XX     # Release to production
npm run version:patch            # Bump version (x.x.1)
npm run version:minor            # Bump version (x.1.0)

# === Monitoring ===
railway logs -f                  # Live logs
railway deployment list          # Deployment history
curl https://app.cardflowlabs.com/health  # Health check

# === Emergency ===
git revert HEAD && git push      # Revert last commit
railway up                       # Force redeploy
```

---

## Final Checklist Before Going Live

- [ ] All tests passing (500+)
- [ ] `SHOPIFY_BILLING_TEST=false` in Railway
- [ ] `SECRET_KEY` is secure and unique
- [ ] Sentry error tracking configured
- [ ] All webhooks registered
- [ ] App listing complete with screenshots
- [ ] Privacy policy published
- [ ] Support email configured
- [ ] Billing plans verified
- [ ] Extensions deployed and released
- [ ] Test purchase completed on real store
- [ ] Monitoring dashboards set up

---

**Congratulations on launching TradeUp!**

If you run into any issues, check this guide first, then reach out to Shopify Partner support if needed.

*Last updated: January 22, 2026*
