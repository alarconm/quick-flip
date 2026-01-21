# API Test Report

**Base URL:** https://app.cardflowlabs.com
**Date:** 2026-01-20
**Shop Domain:** uy288y-nx.myshopify.com

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Endpoints Discovered | 45+ |
| Endpoints Tested | 8 |
| Response Time (Health) | 289-391ms |
| Response Time (API avg) | 275-453ms |
| Pass Rate | 100% (for accessible endpoints) |

### Critical Performance Issues Found

1. **Health endpoint is slow**: 300-400ms (should be <50ms)
2. **JS bundle is 1MB**: Takes 766ms to download
3. **CSS bundle is 441KB**: Takes 645ms to download
4. **Total initial page load**: ~2+ seconds

---

## Shopify Speed Test Requirements

For "Built for Shopify" certification:

| Metric | Requirement | Current Status |
|--------|-------------|----------------|
| INP (Interaction to Next Paint) | ≤200ms | ⚠️ AT RISK (large bundle) |
| CLS (Cumulative Layout Shift) | ≤0.1 | ✅ Likely OK |
| Checkout p95 | ≤500ms | ✅ N/A |
| API Failure Rate | <0.1% | ✅ OK |

---

## API Response Time Analysis

### Endpoint Response Times (5-test average)

| Endpoint | Method | Avg Time | Status |
|----------|--------|----------|--------|
| /health | GET | 320ms | ⚠️ SLOW |
| /api/onboarding/status | GET | 453ms | ⚠️ SLOW |
| /api/billing/plans | GET | 275ms | ⚠️ SLOW |
| /api/dashboard/stats | GET | 321ms | Requires Auth |
| /api/members | GET | 304ms | Requires Auth |
| /api/settings | GET | 354ms | Requires Auth |

### Expected vs Actual Response Times

| Endpoint Type | Expected | Actual | Gap |
|---------------|----------|--------|-----|
| Health Check | <50ms | 320ms | 270ms slower |
| Simple API | <100ms | 300ms | 200ms slower |
| Complex API | <200ms | 450ms | 250ms slower |

---

## Frontend Asset Analysis

### Bundle Sizes

| Asset | Size | Load Time | Issue |
|-------|------|-----------|-------|
| index-CulyM89_.js | 1,017,865 bytes (1MB) | 766ms | ⚠️ TOO LARGE |
| index-DDbFyb2F.css | 441,352 bytes (441KB) | 645ms | ⚠️ LARGE |
| **Total** | **1.46MB** | **1.4s** | ❌ CRITICAL |

### Bundle Composition (Estimated)

The large bundle includes:
- @shopify/polaris (~400KB)
- @shopify/polaris-icons (~200KB)
- React + React-DOM (~150KB)
- TailwindCSS (~100KB)
- @sentry/react (~50KB)
- i18next (~30KB)
- Other dependencies (~87KB)

### HTML Issues Found

```html
<!-- App Bridge loaded TWICE - potential issue -->
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<!-- ... later ... -->
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

---

## Authentication Analysis

### Auth Mechanism Detected: Shopify Session Token

Endpoints require one of:
- `X-Shopify-Shop-Domain` header + valid session
- Shopify App Bridge session token

### Public Endpoints (No Auth Required)

| Endpoint | Status |
|----------|--------|
| /health | ✅ 200 |
| /api/onboarding/status | ✅ 200 |
| /api/billing/plans | ✅ 200 |
| /proxy/* | ✅ 200 (with shop domain) |

### Protected Endpoints (Auth Required)

| Endpoint | Status |
|----------|--------|
| /api/dashboard/stats | 401 - Auth Required |
| /api/members | 401 - Auth Required |
| /api/members/* | 401 - Auth Required |
| /api/settings | 401 - Auth Required |
| /api/tiers/* | 401 - Auth Required |

---

## Root Cause Analysis: Slow Loading

### Issue 1: Railway Hosting Latency

The health endpoint (which does nothing) takes 300-400ms. This indicates:
- **Cold start penalty**: Railway containers may be sleeping
- **Geographic latency**: Server location vs user location
- **SSL handshake time**: ~70-100ms per connection

**Evidence:**
```
TIME_CONNECT: 0.068-0.170s (68-170ms just for TCP connection)
TIME_STARTTRANSFER: 0.290-0.392s (290-392ms to first byte)
```

### Issue 2: No Code Splitting

The entire React app is bundled into a single 1MB JavaScript file. This means:
- Every page load downloads ALL code for ALL pages
- No lazy loading of routes
- No vendor chunking

**Current vite.config.ts:**
```typescript
// No build optimization configured
export default defineConfig({
  plugins: [react()],
  // Missing: build.rollupOptions.output.manualChunks
})
```

### Issue 3: Large Dependencies

Heavy dependencies being fully bundled:
- Polaris icons (entire icon library, not tree-shaken)
- i18next (likely not using internationalization)
- Sentry (full SDK)

### Issue 4: Duplicate Script Loading

App Bridge is loaded twice in the HTML, causing redundant network requests.

---

## Recommendations

### Priority 1: Enable Code Splitting (Critical - Impact: High)

Update `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-polaris': ['@shopify/polaris'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
        }
      }
    },
    chunkSizeWarningLimit: 500, // Warn if chunks > 500KB
  }
})
```

**Expected improvement:** Initial bundle from 1MB → ~200KB

### Priority 2: Implement Route-Based Code Splitting

Use React.lazy() for page components:

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Settings = lazy(() => import('./pages/Settings'));
```

**Expected improvement:** Only load code for current page

### Priority 3: Remove Duplicate App Bridge Script

In the HTML template, App Bridge is loaded twice. Remove one instance.

### Priority 4: Tree-Shake Polaris Icons

Import icons individually instead of the entire library:

```typescript
// Bad - imports entire library
import { Icon } from '@shopify/polaris-icons';

// Good - imports only what's needed
import { HomeMajor, SettingsMajor } from '@shopify/polaris-icons';
```

### Priority 5: Consider i18next Removal

If not using internationalization, remove i18next to save ~30KB.

### Priority 6: Investigate Railway Performance

Options:
- Enable "always on" to prevent cold starts
- Consider edge deployment (Cloudflare Workers, Vercel Edge)
- Add regional CDN for static assets

---

## Performance Budget Recommendation

For Shopify "Built for Shopify" compliance:

| Metric | Target |
|--------|--------|
| Initial JS Bundle | <200KB |
| Initial CSS Bundle | <50KB |
| Time to Interactive | <2s |
| API Response (p95) | <500ms |
| INP | <200ms |

---

## Test Artifacts

- Report generated: 2026-01-20
- Test duration: ~5 minutes
- Network location: Local (Windows)
