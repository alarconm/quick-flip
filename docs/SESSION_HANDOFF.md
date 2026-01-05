# Cardflow Labs - Session Handoff

*Updated: January 4, 2026 - 7:30 PM*

---

## CURRENT STATUS

### Railway Deployment: WORKING
- Health endpoint returns 200: `https://web-production-41bb1.up.railway.app/health`
- Fixed missing database columns with migration `add_shopify_billing_columns.py`
- Custom domain `app.cardflowlabs.com` added to Railway

### DNS Configuration: PENDING USER ACTION
Configure in Namecheap DNS settings:
```
Type: CNAME
Name: app
Value: 20du0xvq.up.railway.app
TTL: Automatic
```

---

## COMPLETED THIS SESSION

### 1. Shopify App Created in Partners Dashboard
- **App Name**: TradeUp by Cardflow Labs
- **Client ID**: `f27841c5cf965100dfa81a212d7d9c10`
- **Client Secret**: (in .env file - do not commit)
- **Version**: v1.0.0-cardflow-labs (Active)
- **App URL**: https://app.cardflowlabs.com
- **Scopes**: read_customers,write_customers,read_orders,read_products,write_products,read_inventory,read_fulfillments

### 2. All Code Committed & Pushed
- 48 files, 12,139 lines of Cardflow Labs branding
- `shopify.app.toml` updated with client_id
- `.env` updated with Shopify app credentials
- Repo: github.com/alarconm/quick-flip

### 3. Railway Deployment Fixed
- **Issue**: Database missing Shopify billing columns
- **Fix**: Created migration `add_shopify_billing_columns.py`
- **Result**: Health endpoint now returns 200

### 4. Custom Domain Configured in Railway
- Added `app.cardflowlabs.com` to Railway project
- Port: 8080 (gunicorn)
- Awaiting DNS propagation after Namecheap configuration

---

## NEXT STEPS

### 1. Configure DNS in Namecheap (Manual)
1. Log into Namecheap
2. Go to Domain List → cardflowlabs.com → Manage
3. Advanced DNS tab
4. Add new record:
   - Type: CNAME
   - Host: app
   - Value: 20du0xvq.up.railway.app
   - TTL: Automatic
5. Wait for propagation (5-30 minutes)

### 2. Install on ORB Shopify
- OAuth install URL: `https://app.cardflowlabs.com/shopify/install?shop=uy288y-nx.myshopify.com`
- (Use Railway URL until DNS propagates: `https://web-production-41bb1.up.railway.app/shopify/install?shop=uy288y-nx.myshopify.com`)

### 3. Test OAuth Flow
- Complete install flow
- Verify redirect and token exchange
- Check tenant created in database

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

*Next: Configure DNS in Namecheap, then install TradeUp on ORB Shopify*
