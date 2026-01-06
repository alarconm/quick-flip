/**
 * Membership API calls
 *
 * Note: Tier management is now handled by staff assignment, not Stripe payments.
 * All billing goes through Shopify for app subscriptions.
 */
import api from './client';
import type { Tier, Member } from './auth';

export interface MembershipStatus {
  status: string;
  tier: Tier | null;
  subscription_status: string;
  tier_assigned_by: string | null;
  tier_assigned_at: string | null;
  tier_expires_at: string | null;
  member_number: string;
  stats: {
    total_bonus_earned: number;
    total_trade_ins: number;
    total_trade_value: number;
  };
}

// For backwards compatibility - alias to MembershipStatus
export type SubscriptionStatus = MembershipStatus;

export async function getTiers(): Promise<{ tiers: Tier[] }> {
  return api.get('/api/membership/tiers');
}

export async function getMembershipStatus(): Promise<MembershipStatus> {
  return api.get('/api/membership/status');
}

// Backwards compatibility alias
export async function getSubscriptionStatus(): Promise<MembershipStatus> {
  return getMembershipStatus();
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
