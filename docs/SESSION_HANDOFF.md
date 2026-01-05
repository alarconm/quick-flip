# Cardflow Labs - Session Handoff

*Created: January 4, 2026*

---

## What Was Accomplished This Session

### 1. Deep Monetization Research
- Analyzed competitors: Furloop ($69-99/mo), Smile.io ($49-599/mo), Tern ($99-599/mo)
- Researched card shop economics ($30-70K income, $50-150/mo app budget)
- Created pricing strategy that undercuts competition

### 2. Brand Identity: Cardflow Labs
- **Name:** Cardflow Labs
- **Tagline:** "Built by card shop owners. For card shop owners."
- **Domain:** cardflowlabs.com - **PURCHASED** ($11.28/yr on Namecheap)
- **Story:** "We're not a tech company that Googled 'card shop problems.' We're card shop owners who got tired of the problems and built the solutions ourselves."

### 3. Pricing Structure (Updated in Code)
| Tier | Price | Members | Key Feature |
|------|-------|---------|-------------|
| Free | $0 | 50 | Get reviews/adoption |
| Starter | $19/mo | 200 | Undercuts Furloop |
| Growth | $49/mo | 1,000 | **Most Popular** |
| Pro | $99/mo | Unlimited | + Quick Flip |

### 4. Files Created/Updated
- `docs/MONETIZATION_STRATEGY.md` - Full competitive analysis & plan
- `docs/BRAND.md` - Complete brand guidelines
- `docs/BETA_OUTREACH.md` - Marketing templates (for later)
- `app/services/shopify_billing.py` - Updated pricing tiers
- `app/services/onboarding.py` - 5 tier templates for easy setup
- `shopify.app.toml` - Updated URLs to cardflowlabs.com

---

## What Needs To Happen Next

### Immediate Priority: Deploy TradeUp on ORB Shopify

1. **Check deployment setup** - Look at Railway config, environment vars
2. **Create Shopify app** in Partners Dashboard (if not exists)
3. **Connect to ORB's Shopify store** as first customer
4. **Test the full flow** - OAuth, tier setup, member portal

### Then: Landing Page
- Create simple landing page at cardflowlabs.com
- Tell the ORB story
- Show pricing
- Link to Shopify App Store

### Then: Shopify App Store Submission
- App listing copy
- Screenshots
- Privacy policy

---

## Key Decisions Made

1. **Skip beta program** - Use ORB as first customer instead (faster, more authentic)
2. **Cardflow Labs as umbrella brand** - TradeUp is first product, Quick Flip is add-on
3. **Low price strategy** - $19 entry undercuts $69 competition significantly
4. **Free tier for adoption** - Get App Store reviews before worrying about revenue

---

## Revenue Target

**Goal:** Replace Brandon's income ASAP

- 100 customers at $40 ARPU = $4,000 MRR
- Conservative Year 1: $45K ARR
- Optimistic Year 1: $110K ARR
- Breakeven: Just 2 customers at Starter tier

---

## Quick Reference

```
Brand: Cardflow Labs
Domain: cardflowlabs.com (PURCHASED)
Product: TradeUp by Cardflow Labs
Pricing: Free / $19 / $49 / $99
Parent: ORB Sports Cards LLC
Repo: quick-flip (this repo)
```

---

## Files to Read First in Next Session

1. `shopify.app.toml` - App configuration
2. `app/services/shopify_billing.py` - Pricing & billing logic
3. `app/services/onboarding.py` - Tier templates
4. `docs/BRAND.md` - Brand guidelines
5. Look for Railway/deployment configs in repo root

---

*Ready to deploy and get first revenue!*
