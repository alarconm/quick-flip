/**
 * TradeUp Settings - Shopify Embedded Version
 *
 * Configure program settings.
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
} from '@shopify/polaris';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl, authFetch } from '../../hooks/useShopifyBridge';

interface SettingsProps {
  shop: string | null;
}

interface Settings {
  program_name: string;
  default_tier_id: number | null;
  auto_approve_under: number;
  require_review_over: number;
  notification_email: string;
  send_member_emails: boolean;
  send_admin_notifications: boolean;
  currency: string;
  timezone: string;
}

async function fetchSettings(shop: string | null): Promise<Settings> {
  const response = await authFetch(
    `${getApiUrl()}/settings`,
    shop
  );
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

async function updateSettings(
  shop: string | null,
  settings: Partial<Settings>
): Promise<Settings> {
  const response = await authFetch(
    `${getApiUrl()}/settings`,
    shop,
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    }
  );
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
}

export function EmbeddedSettings({ shop }: SettingsProps) {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Partial<Settings>>({});

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings', shop],
    queryFn: () => fetchSettings(shop),
    enabled: !!shop,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Settings>) => updateSettings(shop, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHasChanges(false);
    },
  });

  const handleChange = useCallback(
    (field: keyof Settings, value: string | number | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    updateMutation.mutate(formData);
  }, [formData, updateMutation]);

  const handleDiscard = useCallback(() => {
    setFormData({});
    setHasChanges(false);
  }, []);

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

  const currentValue = (field: keyof Settings) => {
    return formData[field] !== undefined
      ? formData[field]
      : settings?.[field];
  };

  return (
    <Page
      title="Settings"
      subtitle="Configure your TradeUp membership program"
    >
      {hasChanges && (
        <Box paddingBlockEnd="400">
          <Banner
            title="Unsaved changes"
            action={{ content: 'Save', onAction: handleSave, loading: updateMutation.isPending }}
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

        {/* General Settings */}
        <Layout.AnnotatedSection
          id="general"
          title="General"
          description="Basic program configuration"
        >
          <Card>
            <BlockStack gap="400">
              <TextField
                label="Program Name"
                value={String(currentValue('program_name') || '')}
                onChange={(value) => handleChange('program_name', value)}
                helpText="Shown to customers in their membership dashboard"
                autoComplete="off"
              />

              <Select
                label="Currency"
                options={[
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'CAD (C$)', value: 'CAD' },
                  { label: 'EUR (€)', value: 'EUR' },
                  { label: 'GBP (£)', value: 'GBP' },
                ]}
                value={String(currentValue('currency') || 'USD')}
                onChange={(value) => handleChange('currency', value)}
              />

              <Select
                label="Timezone"
                options={[
                  { label: 'Pacific Time (US)', value: 'America/Los_Angeles' },
                  { label: 'Mountain Time (US)', value: 'America/Denver' },
                  { label: 'Central Time (US)', value: 'America/Chicago' },
                  { label: 'Eastern Time (US)', value: 'America/New_York' },
                  { label: 'UTC', value: 'UTC' },
                ]}
                value={String(currentValue('timezone') || 'America/Los_Angeles')}
                onChange={(value) => handleChange('timezone', value)}
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
              <TextField
                label="Auto-Approve Under"
                type="number"
                value={String(currentValue('auto_approve_under') || 0)}
                onChange={(value) =>
                  handleChange('auto_approve_under', parseFloat(value))
                }
                prefix="$"
                helpText="Trade-ins under this amount will be automatically approved"
                autoComplete="off"
              />

              <TextField
                label="Require Review Over"
                type="number"
                value={String(currentValue('require_review_over') || 0)}
                onChange={(value) =>
                  handleChange('require_review_over', parseFloat(value))
                }
                prefix="$"
                helpText="Trade-ins over this amount will require manual review"
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
              <TextField
                label="Admin Notification Email"
                type="email"
                value={String(currentValue('notification_email') || '')}
                onChange={(value) => handleChange('notification_email', value)}
                helpText="Receive trade-in notifications at this email"
                autoComplete="email"
              />

              <Checkbox
                label="Send member confirmation emails"
                checked={Boolean(currentValue('send_member_emails'))}
                onChange={(value) => handleChange('send_member_emails', value)}
                helpText="Email members when their trade-in status changes"
              />

              <Checkbox
                label="Send admin notifications"
                checked={Boolean(currentValue('send_admin_notifications'))}
                onChange={(value) =>
                  handleChange('send_admin_notifications', value)
                }
                helpText="Receive email notifications for new trade-ins"
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
                    This will delete all members and trade-in history.
                    This action cannot be undone.
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
