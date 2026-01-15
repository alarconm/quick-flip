# TradeUp App Store Launch - Session Handoff

**Date:** January 15, 2026
**Status:** Nearly ready for App Store submission

---

## COMPLETED THIS SESSION

### 1. POS Extension Built & Deployed (Version 12)
- `extensions/pos-ui/src/SmartGridTile.tsx` - Home tile with live stats
- `extensions/pos-ui/src/MemberModal.tsx` - Full member lookup with VIP badges, tier bonuses, trade-in history
- **Note:** Requires network access approval before release (standard process)
- Version 11 (without POS) can be released immediately
- Version 12 (with POS) can be released after network access approved

### 2. App Store Descriptions Written

**Short (78 chars):**
```
Loyalty & trade-in program for collectibles stores. Tiers, bonuses, store credit.
```

**Long Description:** (See conversation for full text - covers features, pricing, target market)

### 3. Screenshots Captured
Browser screenshot IDs (can be downloaded from Chrome):
- `ss_27176sj7u` - Dashboard (stats, setup progress, recent activity)
- `ss_885367prc` - Members list (4 members, tier badges, credit amounts)
- `ss_2871dr8p7` - Settings (branding, features toggles)

### 4. Legal Documents Created
- `docs/PRIVACY_POLICY.md` - App-specific privacy policy
- `docs/TERMS_OF_SERVICE.md` - Terms of service with billing details

---

## REMAINING FOR APP STORE SUBMISSION

### Must Do:
1. **App Icon (1024x1024)** - User needs to generate using prompt:
   ```
   App icon for "TradeUp", a Shopify loyalty app for collectibles stores.
   Modern, clean design. Upward arrow incorporated with a trading card or
   star symbol. Colors: teal/green gradient with gold accent.
   Minimalist style, works well at small sizes. No text.
   ```

2. **Upload to Partner Dashboard:**
   - App icon
   - Screenshots
   - Short description
   - Long description
   - Privacy policy URL (host docs/PRIVACY_POLICY.md somewhere)
   - Terms URL (host docs/TERMS_OF_SERVICE.md somewhere)
   - Support email: support@cardflowlabs.com

3. **Test Full User Flow** (not completed yet):
   - Install app on fresh test store
   - Complete onboarding
   - Create member
   - Issue store credit
   - Test checkout with store credit
   - Test billing subscription flow

4. **Set SHOPIFY_BILLING_TEST=false** in Railway for production charges

5. **Submit for Shopify Review** (5-10 business days)

### Nice to Have:
- Demo video/GIF showing key features
- Additional screenshots (Trade-Ins page, Bonus Events)

---

## KEY URLS & INFO

- **Partner Dashboard:** https://partners.shopify.com/145871459/apps/308330692609
- **Test Store:** uy288y-nx.myshopify.com (ORB Sports Cards)
- **Production Backend:** https://app.cardflowlabs.com
- **Railway:** https://tradeup-production.up.railway.app

### Versions:
- Version 11: Without POS (ready to release)
- Version 12: With POS (needs network access approval)

---

## QUICK COMMANDS

```bash
# Deploy new version
cd tradeup && shopify app deploy --force

# Release version (Partner Dashboard or):
# Go to: partners.shopify.com > Apps > TradeUp > Versions > Release

# Check Railway
railway logs
railway deployment list
```

---

## NEXT SESSION PRIORITIES

1. Test full user flow end-to-end
2. Help user upload assets to Partner Dashboard
3. Submit for Shopify review
4. Request POS network access approval
