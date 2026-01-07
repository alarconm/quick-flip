/**
 * TradeUp Settings - Shopify Embedded Version
 *
 * Configure program settings with Polaris components.
 * Uses the nested settings API structure.
 */
import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  InlineStack,
  BlockStack,
  TextField,
  Checkbox,
  Button,
  Banner,
  Spinner,
  Box,
  Select,
  Divider,
} from '@shopify/polaris';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl, authFetch } from '../../hooks/useShopifyBridge';

interface SettingsProps {
  shop: string | null;
}

// Match the backend API structure
interface SettingsResponse {
  settings: {
    branding: {
      app_name: string;
      tagline: string;
      logo_url: string | null;
      colors: {
        primary: string;
        primary_hover: string;
        secondary: string;
        accent: string;
      };
      style: string;
    };
    features: {
      points_enabled: boolean;
      referrals_enabled: boolean;
      self_signup_enabled: boolean;
    };
    auto_enrollment: {
      enabled: boolean;
      default_tier_id: number | null;
      min_order_value: number;
      excluded_tags: string[];
    };
    cashback: {
      method: string;
      purchase_cashback_enabled: boolean;
      trade_in_credit_enabled: boolean;
      same_transaction_bonus: boolean;
      rounding_mode: string;
      min_cashback_amount: number;
    };
    subscriptions: {
      monthly_enabled: boolean;
      yearly_enabled: boolean;
      trial_days: number;
      grace_period_days: number;
    };
    notifications: {
      enabled: boolean;
      welcome_email: boolean;
      trade_in_updates: boolean;
      tier_change: boolean;
      credit_issued: boolean;
      from_name: string | null;
      from_email: string | null;
    };
    contact: {
      support_email: string | null;
      support_phone: string | null;
    };
    trade_ins: {
      enabled: boolean;
      auto_approve_under: number;
      require_review_over: number;
      allow_guest_trade_ins: boolean;
      default_category: string;
      require_photos: boolean;
    };
    general: {
      currency: string;
      timezone: string;
    };
  };
  tenant: {
    id: number;
    shop_name: string;
    shop_slug: string;
  };
}

async function fetchSettings(shop: string | null): Promise<SettingsResponse> {
  const response = await authFetch(`${getApiUrl()}/settings`, shop);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

async function updateSettings(
  shop: string | null,
  section: string,
  data: Record<string, unknown>
): Promise<{ success: boolean }> {
  const endpoint = section === 'root' ? '' : `/${section}`;
  const response = await authFetch(`${getApiUrl()}/settings${endpoint}`, shop, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

export function EmbeddedSettings({ shop }: SettingsProps) {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, unknown>>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', shop],
    queryFn: () => fetchSettings(shop),
    enabled: !!shop,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Save each section that has changes
      for (const [section, changes] of Object.entries(pendingChanges)) {
        if (Object.keys(changes).length > 0) {
          await updateSettings(shop, section, changes);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHasChanges(false);
      setPendingChanges({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleChange = useCallback(
    (section: string, field: string, value: unknown) => {
      setPendingChanges((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] || {}),
          [field]: value,
        },
      }));
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    updateMutation.mutate();
  }, [updateMutation]);

  const handleDiscard = useCallback(() => {
    setPendingChanges({});
    setHasChanges(false);
  }, []);

  // Helper to get current value (pending change or stored value)
  const getValue = useCallback(
    <T,>(section: keyof SettingsResponse['settings'], field: string, fallback: T): T => {
      const pending = pendingChanges[section]?.[field];
      if (pending !== undefined) return pending as T;
      const stored = data?.settings?.[section]?.[field as keyof typeof data.settings[typeof section]];
      return (stored as T) ?? fallback;
    },
    [data, pendingChanges]
  );

  if (!shop) {
    return (
      <Page title="Settings">
        <Banner tone="warning">
          <p>No shop connected. Please install the app from the Shopify App Store.</p>
        </Banner>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page title="Settings">
        <Box padding="1600">
          <InlineStack align="center">
            <Spinner size="large" />
          </InlineStack>
        </Box>
      </Page>
    );
  }

  return (
    <Page title="Settings" subtitle="Configure your TradeUp loyalty program">
      {saveSuccess && (
        <Box paddingBlockEnd="400">
          <Banner tone="success" onDismiss={() => setSaveSuccess(false)}>
            <p>Settings saved successfully.</p>
          </Banner>
        </Box>
      )}

      {hasChanges && (
        <Box paddingBlockEnd="400">
          <Banner
            title="Unsaved changes"
            action={{
              content: 'Save',
              onAction: handleSave,
              loading: updateMutation.isPending,
            }}
            secondaryAction={{ content: 'Discard', onAction: handleDiscard }}
            tone="warning"
          >
            <p>You have unsaved changes.</p>
          </Banner>
        </Box>
      )}

      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Failed to load settings. Please try refreshing the page.</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Branding */}
        <Layout.AnnotatedSection
          id="branding"
          title="Branding"
          description="Customize your program's appearance"
        >
          <Card>
            <BlockStack gap="400">
              <TextField
                label="Program Name"
                value={getValue('branding', 'app_name', 'TradeUp')}
                onChange={(value) => handleChange('branding', 'app_name', value)}
                helpText="Shown to customers in their membership dashboard"
                autoComplete="off"
              />

              <TextField
                label="Tagline"
                value={getValue('branding', 'tagline', '')}
                onChange={(value) => handleChange('branding', 'tagline', value)}
                helpText="A short description of your loyalty program"
                autoComplete="off"
              />

              <Select
                label="Style"
                options={[
                  { label: 'Glass (Modern)', value: 'glass' },
                  { label: 'Solid', value: 'solid' },
                  { label: 'Minimal', value: 'minimal' },
                ]}
                value={getValue('branding', 'style', 'glass')}
                onChange={(value) => handleChange('branding', 'style', value)}
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* General Settings */}
        <Layout.AnnotatedSection
          id="general"
          title="General"
          description="Basic program configuration"
        >
          <Card>
            <BlockStack gap="400">
              <Select
                label="Currency"
                options={[
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'CAD (C$)', value: 'CAD' },
                  { label: 'EUR (€)', value: 'EUR' },
                  { label: 'GBP (£)', value: 'GBP' },
                  { label: 'AUD (A$)', value: 'AUD' },
                ]}
                value={getValue('general', 'currency', 'USD')}
                onChange={(value) => handleChange('general', 'currency', value)}
              />

              <Select
                label="Timezone"
                options={[
                  { label: 'Pacific Time (US)', value: 'America/Los_Angeles' },
                  { label: 'Mountain Time (US)', value: 'America/Denver' },
                  { label: 'Central Time (US)', value: 'America/Chicago' },
                  { label: 'Eastern Time (US)', value: 'America/New_York' },
                  { label: 'UTC', value: 'UTC' },
                  { label: 'London (GMT)', value: 'Europe/London' },
                ]}
                value={getValue('general', 'timezone', 'America/Los_Angeles')}
                onChange={(value) => handleChange('general', 'timezone', value)}
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Features */}
        <Layout.AnnotatedSection
          id="features"
          title="Features"
          description="Enable or disable program features"
        >
          <Card>
            <BlockStack gap="400">
              <Checkbox
                label="Enable self-signup"
                checked={getValue('features', 'self_signup_enabled', true)}
                onChange={(value) => handleChange('features', 'self_signup_enabled', value)}
                helpText="Allow customers to sign up for membership themselves"
              />

              <Checkbox
                label="Enable points system"
                checked={getValue('features', 'points_enabled', false)}
                onChange={(value) => handleChange('features', 'points_enabled', value)}
                helpText="Award points for purchases that can be redeemed for rewards"
              />

              <Checkbox
                label="Enable referral program"
                checked={getValue('features', 'referrals_enabled', false)}
                onChange={(value) => handleChange('features', 'referrals_enabled', value)}
                helpText="Allow members to earn rewards by referring new customers"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Auto-Enrollment */}
        <Layout.AnnotatedSection
          id="auto-enrollment"
          title="Auto-Enrollment"
          description="Automatically enroll customers on first purchase"
        >
          <Card>
            <BlockStack gap="400">
              <Checkbox
                label="Enable auto-enrollment"
                checked={getValue('auto_enrollment', 'enabled', true)}
                onChange={(value) => handleChange('auto_enrollment', 'enabled', value)}
                helpText="Automatically enroll customers when they make their first purchase"
              />

              <TextField
                label="Minimum Order Value"
                type="number"
                value={String(getValue('auto_enrollment', 'min_order_value', 0))}
                onChange={(value) =>
                  handleChange('auto_enrollment', 'min_order_value', parseFloat(value) || 0)
                }
                prefix="$"
                helpText="Only auto-enroll if order is at least this amount (0 = any order)"
                autoComplete="off"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Cashback Settings */}
        <Layout.AnnotatedSection
          id="cashback"
          title="Cashback & Rewards"
          description="Configure how rewards are delivered"
        >
          <Card>
            <BlockStack gap="400">
              <Select
                label="Reward Delivery Method"
                options={[
                  { label: 'Shopify Native Store Credit (Recommended)', value: 'native_store_credit' },
                  { label: 'Unique Discount Codes', value: 'discount_code' },
                  { label: 'Shopify Gift Cards', value: 'gift_card' },
                  { label: 'Manual Fulfillment', value: 'manual' },
                ]}
                value={getValue('cashback', 'method', 'native_store_credit')}
                onChange={(value) => handleChange('cashback', 'method', value)}
                helpText="How store credit and rewards are delivered to customers"
              />

              <Divider />

              <Checkbox
                label="Enable purchase cashback"
                checked={getValue('cashback', 'purchase_cashback_enabled', true)}
                onChange={(value) => handleChange('cashback', 'purchase_cashback_enabled', value)}
                helpText="Award cashback percentage on purchases based on tier"
              />

              <Checkbox
                label="Enable trade-in credit"
                checked={getValue('cashback', 'trade_in_credit_enabled', true)}
                onChange={(value) => handleChange('cashback', 'trade_in_credit_enabled', value)}
                helpText="Award bonus credit on trade-ins based on tier"
              />

              <Checkbox
                label="Same-transaction bonus"
                checked={getValue('cashback', 'same_transaction_bonus', true)}
                onChange={(value) => handleChange('cashback', 'same_transaction_bonus', value)}
                helpText="Apply tier benefits to the order that includes membership purchase"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Trade-In Rules */}
        <Layout.AnnotatedSection
          id="trade-ins"
          title="Trade-In Rules"
          description="Configure automatic approval thresholds"
        >
          <Card>
            <BlockStack gap="400">
              <Checkbox
                label="Enable trade-ins"
                checked={getValue('trade_ins', 'enabled', true)}
                onChange={(value) => handleChange('trade_ins', 'enabled', value)}
              />

              <Checkbox
                label="Allow guest trade-ins"
                checked={getValue('trade_ins', 'allow_guest_trade_ins', true)}
                onChange={(value) => handleChange('trade_ins', 'allow_guest_trade_ins', value)}
                helpText="Allow non-members to submit trade-ins (no tier bonus)"
              />

              <Divider />

              <TextField
                label="Auto-Approve Under"
                type="number"
                value={String(getValue('trade_ins', 'auto_approve_under', 50))}
                onChange={(value) =>
                  handleChange('trade_ins', 'auto_approve_under', parseFloat(value) || 0)
                }
                prefix="$"
                helpText="Trade-ins under this amount will be automatically approved"
                autoComplete="off"
              />

              <TextField
                label="Require Review Over"
                type="number"
                value={String(getValue('trade_ins', 'require_review_over', 500))}
                onChange={(value) =>
                  handleChange('trade_ins', 'require_review_over', parseFloat(value) || 0)
                }
                prefix="$"
                helpText="Trade-ins over this amount will require manual review"
                autoComplete="off"
              />

              <Checkbox
                label="Require photo uploads"
                checked={getValue('trade_ins', 'require_photos', false)}
                onChange={(value) => handleChange('trade_ins', 'require_photos', value)}
                helpText="Customers must upload photos when submitting trade-ins"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Subscriptions */}
        <Layout.AnnotatedSection
          id="subscriptions"
          title="Subscriptions"
          description="Membership subscription options"
        >
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400">
                <Checkbox
                  label="Enable monthly subscriptions"
                  checked={getValue('subscriptions', 'monthly_enabled', true)}
                  onChange={(value) => handleChange('subscriptions', 'monthly_enabled', value)}
                />
                <Checkbox
                  label="Enable yearly subscriptions"
                  checked={getValue('subscriptions', 'yearly_enabled', true)}
                  onChange={(value) => handleChange('subscriptions', 'yearly_enabled', value)}
                />
              </InlineStack>

              <TextField
                label="Free Trial Days"
                type="number"
                value={String(getValue('subscriptions', 'trial_days', 0))}
                onChange={(value) =>
                  handleChange('subscriptions', 'trial_days', parseInt(value) || 0)
                }
                suffix="days"
                helpText="Number of free trial days (0 = no trial)"
                autoComplete="off"
              />

              <TextField
                label="Grace Period"
                type="number"
                value={String(getValue('subscriptions', 'grace_period_days', 3))}
                onChange={(value) =>
                  handleChange('subscriptions', 'grace_period_days', parseInt(value) || 0)
                }
                suffix="days"
                helpText="Days to retry failed payments before downgrading tier"
                autoComplete="off"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Notifications */}
        <Layout.AnnotatedSection
          id="notifications"
          title="Notifications"
          description="Email notification settings"
        >
          <Card>
            <BlockStack gap="400">
              <Checkbox
                label="Enable email notifications"
                checked={getValue('notifications', 'enabled', true)}
                onChange={(value) => handleChange('notifications', 'enabled', value)}
              />

              <Divider />

              <Text as="h3" variant="headingSm">
                Notification Types
              </Text>

              <Checkbox
                label="Welcome email on enrollment"
                checked={getValue('notifications', 'welcome_email', true)}
                onChange={(value) => handleChange('notifications', 'welcome_email', value)}
              />

              <Checkbox
                label="Trade-in status updates"
                checked={getValue('notifications', 'trade_in_updates', true)}
                onChange={(value) => handleChange('notifications', 'trade_in_updates', value)}
              />

              <Checkbox
                label="Tier upgrade/downgrade"
                checked={getValue('notifications', 'tier_change', true)}
                onChange={(value) => handleChange('notifications', 'tier_change', value)}
              />

              <Checkbox
                label="Store credit issued"
                checked={getValue('notifications', 'credit_issued', true)}
                onChange={(value) => handleChange('notifications', 'credit_issued', value)}
              />

              <Divider />

              <TextField
                label="From Name"
                value={getValue('notifications', 'from_name', '') || ''}
                onChange={(value) => handleChange('notifications', 'from_name', value)}
                placeholder="Your Store Name"
                helpText="Sender name for emails (defaults to shop name)"
                autoComplete="off"
              />

              <TextField
                label="From Email"
                type="email"
                value={getValue('notifications', 'from_email', '') || ''}
                onChange={(value) => handleChange('notifications', 'from_email', value)}
                placeholder="noreply@yourstore.com"
                helpText="Sender email (must be verified with SendGrid)"
                autoComplete="email"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Contact */}
        <Layout.AnnotatedSection
          id="contact"
          title="Support Contact"
          description="Contact information shown to customers"
        >
          <Card>
            <BlockStack gap="400">
              <TextField
                label="Support Email"
                type="email"
                value={getValue('contact', 'support_email', '') || ''}
                onChange={(value) => handleChange('contact', 'support_email', value)}
                placeholder="support@yourstore.com"
                autoComplete="email"
              />

              <TextField
                label="Support Phone"
                type="tel"
                value={getValue('contact', 'support_phone', '') || ''}
                onChange={(value) => handleChange('contact', 'support_phone', value)}
                placeholder="+1 (555) 123-4567"
                autoComplete="tel"
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Danger Zone */}
        <Layout.AnnotatedSection
          id="danger"
          title="Danger Zone"
          description="Irreversible actions"
        >
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Reset Program Data
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    This will delete all members and trade-in history. This action cannot be undone.
                  </Text>
                </BlockStack>
                <Button variant="primary" tone="critical" disabled>
                  Reset Data
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </Page>
  );
}
