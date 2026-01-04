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

// Dashboard data
export interface DashboardData {
  member: Member;
  store_credit_balance: number;
  recent_bonuses: BonusTransaction[];
  recent_trade_ins: TradeInBatch[];
}

export interface BonusTransaction {
  id: number;
  bonus_amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export interface TradeInBatch {
  id: number;
  batch_reference: string;
  status: string;
  total_items: number;
  total_trade_value: number;
  created_at: string;
}

export async function getDashboard(): Promise<DashboardData> {
  // Get member data
  const meResponse = await api.get<{ member: Member }>('/api/auth/me');

  // Get bonus history (limited)
  const bonusResponse = await api.get<{
    transactions: BonusTransaction[];
  }>('/api/bonuses/history?per_page=5');

  return {
    member: meResponse.member,
    store_credit_balance: 0, // TODO: Implement Shopify store credit lookup
    recent_bonuses: bonusResponse.transactions,
    recent_trade_ins: [], // TODO: Implement
  };
}
