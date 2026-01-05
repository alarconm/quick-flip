/**
 * Membership API calls
 */
import api from './client';
import type { Tier, Member } from './auth';

export interface CheckoutSession {
  session_id: string;
  url: string;
}

export interface SubscriptionStatus {
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tier: Tier | null;
  member_status: string;
}

export async function getTiers(): Promise<{ tiers: Tier[] }> {
  return api.get('/api/membership/tiers');
}

export async function createCheckout(
  tierId: number,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSession> {
  return api.post('/api/membership/checkout', {
    tier_id: tierId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createPortalSession(returnUrl?: string): Promise<{ url: string }> {
  return api.post('/api/membership/portal', { return_url: returnUrl });
}

export async function changeTier(tierId: number): Promise<{
  message: string;
  new_tier: Tier;
  subscription: unknown;
}> {
  return api.post('/api/membership/change-tier', { tier_id: tierId });
}

export async function cancelSubscription(immediate?: boolean): Promise<{
  message: string;
  subscription: unknown;
}> {
  return api.post('/api/membership/cancel', { immediate });
}

export async function reactivateSubscription(): Promise<{
  message: string;
  subscription: unknown;
}> {
  return api.post('/api/membership/reactivate');
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return api.get('/api/membership/status');
}

// Store Credit
export interface StoreCreditBalance {
  balance: number;
  currency: string;
  account_id?: string;
  message?: string;
}

export async function getStoreCredit(): Promise<StoreCreditBalance> {
  return api.get('/api/membership/store-credit');
}

// Bonus History
export interface BonusTransaction {
  id: number;
  member_id: number;
  member_number?: string;
  trade_in_item_id?: number;
  bonus_amount: number;
  transaction_type: string;
  store_credit_txn_id?: string;
  notes?: string;
  reason?: string;
  calculation?: {
    sale_price?: number;
    trade_value?: number;
    profit?: number;
    bonus_rate?: number;
    days_to_sell?: number;
  };
  created_at: string;
  created_by?: string;
}

export interface BonusHistoryResponse {
  transactions: BonusTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export async function getBonusHistory(
  limit: number = 20,
  offset: number = 0
): Promise<BonusHistoryResponse> {
  return api.get(`/api/membership/bonus-history?limit=${limit}&offset=${offset}`);
}

// Link Shopify account
export interface ShopifyLinkResult {
  success: boolean;
  customer_id: string;
  customer_name: string;
  store_credit_balance: number;
  tags: string[];
}

export async function linkShopifyAccount(): Promise<ShopifyLinkResult> {
  return api.post('/api/membership/link-shopify');
}

// Trade-In Batches
export interface TradeInBatch {
  id: number;
  batch_reference: string;
  status: string;
  total_items: number;
  total_trade_value: number;
  trade_in_date: string;
  created_at: string;
}

// Dashboard aggregated data
export interface DashboardData {
  member: Member;
  store_credit_balance: number;
  recent_bonuses: BonusTransaction[];
  recent_trade_ins: TradeInBatch[];
}

export async function getDashboard(): Promise<DashboardData> {
  // Get member data
  const meResponse = await api.get<{ member: Member }>('/api/auth/me');

  // Get store credit balance
  let storeCredit = 0;
  try {
    const creditResponse = await getStoreCredit();
    storeCredit = creditResponse.balance;
  } catch {
    console.warn('Could not fetch store credit balance');
  }

  // Get bonus history (limited)
  let recentBonuses: BonusTransaction[] = [];
  try {
    const bonusResponse = await getBonusHistory(5, 0);
    recentBonuses = bonusResponse.transactions;
  } catch {
    console.warn('Could not fetch bonus history');
  }

  return {
    member: meResponse.member,
    store_credit_balance: storeCredit,
    recent_bonuses: recentBonuses,
    recent_trade_ins: [], // TODO: Implement trade-in history endpoint
  };
}
