# Cardflow Labs - Session Handoff

*Updated: January 5, 2026 - 12:45 AM*

---

## CURRENT STATUS: FULLY WORKING ✅

### TradeUp Embedded App: v1.7 WORKING
- App loads and displays correctly inside Shopify Admin iframe
- All API calls working (uses XMLHttpRequest, not fetch)
- Dashboard shows real data from Shopify
- Test member: Michael Alarcon (michael.alarconii@gmail.com)

### Railway Deployment: WORKING
- Health endpoint: `https://web-production-41bb1.up.railway.app/health`
- App URL: `https://web-production-41bb1.up.railway.app/app?shop=uy288y-nx.myshopify.com`

### Access in Shopify Admin
- Navigate to: Apps → TradeUp
- Direct URL: `https://admin.shopify.com/store/uy288y-nx/apps/tradeup-2`

---

## COMPLETED THIS SESSION

### 1. Fixed Shopify Iframe API Issue
- **Problem**: `fetch()` calls hang inside Shopify embedded iframes (never resolve)
- **Solution**: Converted all API calls to use `XMLHttpRequest` instead
- **Result**: All API calls now complete successfully

### 2. TradeUp Dashboard Features Working
- Dashboard stats (members, credit, trade-ins, bonuses)
- Recent members list with real Shopify customer data
- Quick action buttons (Add Member, New Trade-In, Bonuses, Settings)
- Bottom navigation (Home, Members, Trade-Ins, Bonuses, Settings)
- Light/dark mode toggle
- Mobile-optimized responsive design

### 3. Test Data
- Member: Michael Alarcon (michael.alarconii@gmail.com)
- Member ID: QF1001
- Tier: Silver
- Store Credit: $0

---

## KEY TECHNICAL FIX

**fetch() vs XMLHttpRequest in Shopify iframes:**

```javascript
// DON'T USE fetch() - it hangs in Shopify iframes:
fetch(url, { headers: {...} })  // ❌ Never resolves

// USE XMLHttpRequest instead:
const xhr = new XMLHttpRequest();  // ✅ Works
xhr.open('GET', url, true);
xhr.setRequestHeader('X-Tenant-ID', '1');
xhr.onreadystatechange = function() {...};
xhr.send();
```

This is documented in `app/__init__.py` around line 921.

---

## NEXT STEPS

### 1. Configure DNS in Namecheap (Manual)
```
Type: CNAME
Name: app
Value: 20du0xvq.up.railway.app
TTL: Automatic
```

### 2. Build Out Remaining Features
- Add Member form functionality
- New Trade-In workflow
- Bonuses management
- Settings page with tier configuration

### 3. Shopify Billing Integration
- Already have billing columns in database
- Need to implement App Bridge billing flow

---

## KEY CREDENTIALS

| Service | Value |
|---------|-------|
| Shopify Client ID | f27841c5cf965100dfa81a212d7d9c10 |
| Shopify Client Secret | (in .env file) |
| ORB Shopify Domain | uy288y-nx.myshopify.com |
| Railway Live URL | https://web-production-41bb1.up.railway.app |
| Custom Domain | app.cardflowlabs.com (pending DNS) |
| Railway CNAME | 20du0xvq.up.railway.app |

---

## PRICING (Already in Code)

| Tier | Price | Members |
|------|-------|---------|
| Free | $0 | 50 |
| Starter | $19/mo | 200 |
| Growth | $49/mo | 1,000 |
| Pro | $99/mo | Unlimited |

---

## REPO LOCATION
```
C:\Users\malar\OneDrive\Documents\Coding Projects\quick-flip
```

---

*App is now functional! Next: Add form functionality and billing integration.*
