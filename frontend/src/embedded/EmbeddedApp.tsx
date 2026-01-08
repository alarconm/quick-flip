/**
 * TradeUp Shopify Embedded App
 *
 * This component renders inside the Shopify Admin when merchants
 * access the TradeUp app. Uses Shopify Polaris for consistent UX.
 *
 * Navigation is handled by Shopify Admin's sidebar - configured in shopify.app.toml
 */
import { Routes, Route, Navigate } from 'react-router-dom';

// Embedded app pages
import { EmbeddedDashboard } from './pages/EmbeddedDashboard';
import { EmbeddedTiers } from './pages/EmbeddedTiers';
import { EmbeddedMembers } from './pages/EmbeddedMembers';
import { EmbeddedTradeIns } from './pages/EmbeddedTradeIns';
import { EmbeddedNewTradeIn } from './pages/EmbeddedNewTradeIn';
import { EmbeddedCategories } from './pages/EmbeddedCategories';
import { EmbeddedBulkCredit } from './pages/EmbeddedBulkCredit';
import { EmbeddedPromotions } from './pages/EmbeddedPromotions';
import { EmbeddedSettings } from './pages/EmbeddedSettings';
import { EmbeddedBilling } from './pages/EmbeddedBilling';
import { EmbeddedReferrals } from './pages/EmbeddedReferrals';
import { EmbeddedAnalytics } from './pages/EmbeddedAnalytics';

interface EmbeddedAppProps {
  shop: string | null;
}

export function EmbeddedApp({ shop }: EmbeddedAppProps) {
  // Navigation is handled by Shopify Admin sidebar (via shopify.app.toml)
  // No custom Frame/Navigation needed - just render pages directly
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/dashboard" element={<EmbeddedDashboard shop={shop} />} />
      <Route path="/tiers" element={<EmbeddedTiers shop={shop} />} />
      <Route path="/members" element={<EmbeddedMembers shop={shop} />} />
      <Route path="/trade-ins" element={<EmbeddedTradeIns shop={shop} />} />
      <Route path="/trade-ins/new" element={<EmbeddedNewTradeIn shop={shop} />} />
      <Route path="/trade-ins/categories" element={<EmbeddedCategories shop={shop} />} />
      <Route path="/promotions" element={<EmbeddedPromotions shop={shop} />} />
      <Route path="/bulk-credit" element={<EmbeddedBulkCredit shop={shop} />} />
      <Route path="/settings" element={<EmbeddedSettings shop={shop} />} />
      <Route path="/billing" element={<EmbeddedBilling shop={shop} />} />
      <Route path="/referrals" element={<EmbeddedReferrals shop={shop} />} />
      <Route path="/analytics" element={<EmbeddedAnalytics shop={shop} />} />
    </Routes>
  );
}
