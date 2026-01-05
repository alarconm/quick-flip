/**
 * Quick Flip Admin API Client
 * Handles all admin operations: members, events, Shopify lookups
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper for authenticated requests
async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('admin_token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': '1', // ORB Sports Cards tenant
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// ================== Types ==================

export interface Member {
  id: number;
  member_number: string;
  email: string;
  name: string | null;
  phone: string | null;
  tier_id: number | null;
  tier: Tier | null;
  shopify_customer_id: string | null;
  status: 'active' | 'pending' | 'paused' | 'cancelled';
  membership_start_date: string;
  membership_end_date: string | null;
  total_bonus_earned: number;
  total_trade_ins: number;
  total_trade_value: number;
  created_at: string;
  updated_at: string;
}

export interface Tier {
  id: number;
  name: string;
  monthly_price: number;
  bonus_rate: number;
  quick_flip_days: number;
  benefits: Record<string, unknown>;
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tags: string[];
  ordersCount: number;
  totalSpent: number;
  storeCreditBalance: number;
  currency: string;
  createdAt: string;
}

export interface StoreCreditEvent {
  id: string;
  name: string;
  description?: string;
  credit_amount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  filters: EventFilters;
  customers_affected?: number;
  total_credited?: number;
  created_at: string;
  executed_at?: string;
  created_by?: string;
}

export interface EventFilters {
  date_range?: { start: string; end: string };
  sources?: string[];
  collections?: string[];
  product_tags?: string[];
  customer_tags?: string[];
  tiers?: string[];
  min_spend?: number;
}

export interface EventPreview {
  customer_count: number;
  total_credit: number;
  breakdown_by_tier?: Record<string, number>;
  sample_customers?: {
    id: string;
    email: string;
    name?: string;
    tier?: string;
  }[];
}

export interface EventRunResult {
  success: boolean;
  event_id: string;
  customers_processed: number;
  total_credited: number;
  errors?: string[];
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  productsCount: number;
}

export interface DashboardStats {
  total_members: number;
  active_members: number;
  members_this_month: number;
  total_events_this_month: number;
  total_credited_this_month: number;
  members_by_tier: Record<string, number>;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'member_joined' | 'member_upgraded' | 'event_completed' | 'credit_issued';
  description: string;
  timestamp: string;
  meta: Record<string, unknown>;
}

// ================== Member APIs ==================

export async function getMembers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tier_id?: number;
}): Promise<{ members: Member[]; total: number; page: number; pages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.tier_id) searchParams.set('tier_id', String(params.tier_id));

  return adminFetch(`/api/members?${searchParams}`);
}

export async function getMember(id: number): Promise<Member> {
  return adminFetch(`/api/members/${id}`);
}

export async function createMember(data: {
  email: string;
  name?: string;
  phone?: string;
  tier_id?: number;
  shopify_customer_id?: string;
  notes?: string;
}): Promise<Member> {
  return adminFetch('/api/members', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMember(
  id: number,
  data: Partial<Member>
): Promise<Member> {
  return adminFetch(`/api/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateMemberTier(
  memberId: number,
  tierId: number
): Promise<Member> {
  return adminFetch(`/api/members/${memberId}/tier`, {
    method: 'PUT',
    body: JSON.stringify({ tier_id: tierId }),
  });
}

// ================== Tier APIs ==================

export async function getTiers(): Promise<{ tiers: Tier[] }> {
  return adminFetch('/api/membership/tiers');
}

// ================== Shopify APIs ==================

export async function lookupShopifyCustomer(
  email: string
): Promise<ShopifyCustomer | null> {
  try {
    const result = await adminFetch<{ customer: ShopifyCustomer | null }>(
      `/api/admin/shopify/customer?email=${encodeURIComponent(email)}`
    );
    return result.customer;
  } catch {
    return null;
  }
}

export async function getShopifyCollections(): Promise<ShopifyCollection[]> {
  const result = await adminFetch<{ collections: ShopifyCollection[] }>(
    '/api/admin/shopify/collections'
  );
  return result.collections;
}

export async function getShopifyProductTags(): Promise<string[]> {
  const result = await adminFetch<{ tags: string[] }>(
    '/api/admin/shopify/product-tags'
  );
  return result.tags;
}

// ================== Store Credit Event APIs ==================

export async function getStoreCreditEvents(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ events: StoreCreditEvent[]; total: number; page: number; pages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);

  return adminFetch(`/api/admin/events?${searchParams}`);
}

export async function previewEvent(params: {
  credit_amount: number;
  filters: EventFilters;
}): Promise<EventPreview> {
  return adminFetch('/api/admin/events/preview', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function runEvent(params: {
  name: string;
  description?: string;
  credit_amount: number;
  filters: EventFilters;
}): Promise<EventRunResult> {
  return adminFetch('/api/admin/events/run', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ================== Filter Option APIs ==================

export async function getCollections(): Promise<{ collections: { id: string; title: string }[] }> {
  return adminFetch('/api/admin/shopify/collections');
}

export async function getProductTags(): Promise<{ tags: string[] }> {
  return adminFetch('/api/admin/shopify/product-tags');
}

export async function getCustomerTags(): Promise<{ tags: string[] }> {
  return adminFetch('/api/admin/shopify/customer-tags');
}

// ================== Dashboard APIs ==================

export async function getDashboardStats(): Promise<DashboardStats> {
  return adminFetch('/api/admin/dashboard');
}

// ================== Admin Auth ==================

export async function adminLogin(credentials: {
  email: string;
  password: string;
}): Promise<{ token: string; admin: { email: string; name: string } }> {
  const result = await adminFetch<{
    token: string;
    admin: { email: string; name: string };
  }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  localStorage.setItem('admin_token', result.token);
  return result;
}

export function adminLogout(): void {
  localStorage.removeItem('admin_token');
}

export function isAdminLoggedIn(): boolean {
  return !!localStorage.getItem('admin_token');
}
