/**
 * Pending Distributions - Approval Workflow Page
 *
 * Displays pending monthly credit distributions awaiting merchant approval.
 * Key features:
 * - View preview data before approving
 * - Approve/reject distributions
 * - Enable auto-approve for future distributions
 * - Settings management
 */
import {
  Page,
  Layout,
  Card,
  Text,
  InlineStack,
  BlockStack,
  Box,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Banner,
  Modal,
  Checkbox,
  TextField,
  InlineGrid,
  ProgressBar,
  Spinner,
  Divider,
} from '@shopify/polaris';
import { CheckIcon, XIcon, ClockIcon, AlertCircleIcon } from '@shopify/polaris-icons';
import { TitleBar } from '@shopify/app-bridge-react';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl, authFetch } from '../../hooks/useShopifyBridge';

// Hook to detect viewport size
function useResponsive() {
  const [screenSize, setScreenSize] = useState(() => {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false };
    const width = window.innerWidth;
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
    };
  });

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
      });
    };
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return screenSize;
}

interface PendingDistributionsProps {
  shop: string | null;
}

interface TierBreakdown {
  tier: string;
  count: number;
  amount: number;
}

interface MemberPreview {
  id: number;
  name: string;
  email: string;
  tier: string;
  amount: number;
}

interface PreviewData {
  total_members: number;
  total_amount: number;
  processed: number;
  skipped: number;
  by_tier: TierBreakdown[];
  members: MemberPreview[];
  calculated_at: string;
}

interface ExecutionResult {
  credited: number;
  skipped: number;
  errors: number;
  total_amount: number;
  executed_at: string;
}

interface PendingDistribution {
  id: number;
  tenant_id: number;
  distribution_type: string;
  reference_key: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  preview_data: PreviewData;
  created_at: string;
  expires_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  executed_at: string | null;
  execution_result: ExecutionResult | null;
  display_name: string;
  days_until_expiry: number | null;
  is_expired: boolean;
}

interface AutoApproveSettings {
  enabled: boolean;
  eligible: boolean;
  notification_emails: string[];
  auto_approve_threshold: number | null;
}

// API functions
async function fetchPendingDistributions(
  shop: string | null,
  status?: string,
  includeAll?: boolean
): Promise<{ distributions: PendingDistribution[]; pending_count: number }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (includeAll) params.append('include_all', 'true');

  const url = `${getApiUrl()}/pending-distributions${params.toString() ? '?' + params.toString() : ''}`;
  const response = await authFetch(url, shop);
  if (!response.ok) throw new Error('Failed to fetch pending distributions');
  return response.json();
}

async function fetchPendingDistribution(
  shop: string | null,
  id: number,
  includeMembers?: boolean
): Promise<PendingDistribution> {
  const params = includeMembers ? '?include_members=true' : '';
  const response = await authFetch(`${getApiUrl()}/pending-distributions/${id}${params}`, shop);
  if (!response.ok) throw new Error('Failed to fetch pending distribution');
  return response.json();
}

async function approveDistribution(
  shop: string | null,
  id: number,
  enableAutoApprove: boolean
): Promise<{ success: boolean; message: string; result: any }> {
  const response = await authFetch(`${getApiUrl()}/pending-distributions/${id}/approve`, shop, {
    method: 'POST',
    body: JSON.stringify({ enable_auto_approve: enableAutoApprove }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve distribution');
  }
  return response.json();
}

async function rejectDistribution(
  shop: string | null,
  id: number,
  reason: string
): Promise<{ success: boolean; message: string; result: any }> {
  const response = await authFetch(`${getApiUrl()}/pending-distributions/${id}/reject`, shop, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject distribution');
  }
  return response.json();
}

async function fetchAutoApproveSettings(shop: string | null): Promise<AutoApproveSettings> {
  const response = await authFetch(`${getApiUrl()}/pending-distributions/settings`, shop);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

async function updateAutoApproveSettings(
  shop: string | null,
  settings: Partial<AutoApproveSettings>
): Promise<{ success: boolean; settings: AutoApproveSettings }> {
  const response = await authFetch(`${getApiUrl()}/pending-distributions/settings`, shop, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update settings');
  }
  return response.json();
}

export function EmbeddedPendingDistributions({ shop }: PendingDistributionsProps) {
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useResponsive();

  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Selected distribution
  const [selectedDistribution, setSelectedDistribution] = useState<PendingDistribution | null>(null);

  // Form states
  const [enableAutoApprove, setEnableAutoApprove] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Fetch pending distributions
  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['pending-distributions', shop, showHistory],
    queryFn: () => fetchPendingDistributions(shop, showHistory ? undefined : 'pending', showHistory),
    enabled: !!shop,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch auto-approve settings
  const { data: settings } = useQuery({
    queryKey: ['pending-distributions-settings', shop],
    queryFn: () => fetchAutoApproveSettings(shop),
    enabled: !!shop,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => approveDistribution(shop, selectedDistribution!.id, enableAutoApprove),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-distributions-settings'] });
      setApproveModalOpen(false);
      setSelectedDistribution(null);
      setEnableAutoApprove(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectDistribution(shop, selectedDistribution!.id, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-distributions'] });
      setRejectModalOpen(false);
      setSelectedDistribution(null);
      setRejectReason('');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AutoApproveSettings>) => updateAutoApproveSettings(shop, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-distributions-settings'] });
    },
  });

  // Handlers
  const openApproveModal = useCallback((distribution: PendingDistribution) => {
    setSelectedDistribution(distribution);
    setEnableAutoApprove(false);
    setApproveModalOpen(true);
  }, []);

  const openRejectModal = useCallback((distribution: PendingDistribution) => {
    setSelectedDistribution(distribution);
    setRejectReason('');
    setRejectModalOpen(true);
  }, []);

  const openDetailsModal = useCallback((distribution: PendingDistribution) => {
    setSelectedDistribution(distribution);
    setDetailsModalOpen(true);
  }, []);

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (distribution: PendingDistribution) => {
    switch (distribution.status) {
      case 'pending':
        return <Badge tone="attention">Pending Approval</Badge>;
      case 'approved':
        return <Badge tone="success">Approved</Badge>;
      case 'rejected':
        return <Badge tone="critical">Rejected</Badge>;
      case 'expired':
        return <Badge>Expired</Badge>;
      default:
        return <Badge>{distribution.status}</Badge>;
    }
  };

  const getExpiryBadge = (distribution: PendingDistribution) => {
    if (distribution.status !== 'pending') return null;

    const days = distribution.days_until_expiry;
    if (days === null) return null;

    if (days <= 1) {
      return <Badge tone="critical">Expires today</Badge>;
    } else if (days <= 3) {
      return <Badge tone="warning">{`Expires in ${days} days`}</Badge>;
    }
    return <Badge tone="info">{`Expires in ${days} days`}</Badge>;
  };

  if (!shop) {
    return (
      <Page title="Pending Distributions">
        <Banner tone="warning">
          <p>No shop connected. Please install the app from the Shopify App Store.</p>
        </Banner>
      </Page>
    );
  }

  const distributions = pendingData?.distributions || [];
  const pendingCount = pendingData?.pending_count || 0;
  const pendingDistributions = distributions.filter(d => d.status === 'pending');

  return (
    <>
      <TitleBar title="Pending Distributions" />
      <Page
        title="Pending Distributions"
        subtitle="Review and approve monthly credit distributions before they are issued"
        secondaryActions={[
          {
            content: showHistory ? 'Show Pending Only' : 'Show History',
            onAction: () => setShowHistory(!showHistory),
          },
          {
            content: 'Settings',
            onAction: () => setSettingsModalOpen(true),
          },
        ]}
      >
        <Layout>
          {/* Pending Alert Banner */}
          {pendingCount > 0 && !showHistory && (
            <Layout.Section>
              <Banner
                title={`${pendingCount} distribution${pendingCount > 1 ? 's' : ''} awaiting approval`}
                tone="warning"
                action={{
                  content: 'Review Now',
                  onAction: () => pendingDistributions[0] && openDetailsModal(pendingDistributions[0]),
                }}
              >
                <p>
                  Monthly credits have been calculated and are ready for your review.
                  Please approve or reject before they expire.
                </p>
              </Banner>
            </Layout.Section>
          )}

          {/* Auto-Approve Status */}
          {settings && (
            <Layout.Section>
              <Card>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingSm">Auto-Approve Status</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {settings.enabled
                        ? 'Future distributions will be automatically approved'
                        : settings.eligible
                        ? 'Auto-approve is available but not enabled'
                        : 'Complete your first manual approval to enable auto-approve'}
                    </Text>
                  </BlockStack>
                  <Badge tone={settings.enabled ? 'success' : settings.eligible ? 'info' : 'attention'}>
                    {settings.enabled ? 'Enabled' : settings.eligible ? 'Available' : 'Not Yet Eligible'}
                  </Badge>
                </InlineStack>
              </Card>
            </Layout.Section>
          )}

          {/* Distributions List */}
          <Layout.Section>
            <Card>
              {isLoading ? (
                <BlockStack gap="400" align="center">
                  <Box padding="800">
                    <Spinner accessibilityLabel="Loading distributions" size="large" />
                  </Box>
                </BlockStack>
              ) : distributions.length > 0 ? (
                <BlockStack gap="400">
                  {distributions.map((distribution) => (
                    <Card key={distribution.id}>
                      <BlockStack gap="400">
                        {/* Header */}
                        <InlineStack align="space-between" blockAlign="center" wrap={false}>
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                              <Text as="h3" variant="headingMd">{distribution.display_name}</Text>
                              {getStatusBadge(distribution)}
                              {getExpiryBadge(distribution)}
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Created {formatDate(distribution.created_at)}
                            </Text>
                          </BlockStack>
                        </InlineStack>

                        {/* Summary Stats */}
                        <InlineGrid columns={isMobile ? 2 : 4} gap="300">
                          <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="100">
                              <Text as="span" variant="bodySm" tone="subdued">Members</Text>
                              <Text as="p" variant="headingLg">
                                {distribution.preview_data?.total_members || 0}
                              </Text>
                            </BlockStack>
                          </Box>
                          <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="100">
                              <Text as="span" variant="bodySm" tone="subdued">Total Amount</Text>
                              <Text as="p" variant="headingLg" tone="success">
                                {formatCurrency(distribution.preview_data?.total_amount || 0)}
                              </Text>
                            </BlockStack>
                          </Box>
                          <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="100">
                              <Text as="span" variant="bodySm" tone="subdued">Tiers</Text>
                              <Text as="p" variant="headingLg">
                                {distribution.preview_data?.by_tier?.length || 0}
                              </Text>
                            </BlockStack>
                          </Box>
                          <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="100">
                              <Text as="span" variant="bodySm" tone="subdued">Skipped</Text>
                              <Text as="p" variant="headingLg">
                                {distribution.preview_data?.skipped || 0}
                              </Text>
                            </BlockStack>
                          </Box>
                        </InlineGrid>

                        {/* Tier Breakdown */}
                        {distribution.preview_data?.by_tier && distribution.preview_data.by_tier.length > 0 && (
                          <BlockStack gap="200">
                            <Text as="h4" variant="headingSm">Tier Breakdown</Text>
                            <BlockStack gap="100">
                              {distribution.preview_data.by_tier.map((tier) => (
                                <InlineStack key={tier.tier} align="space-between" blockAlign="center">
                                  <InlineStack gap="200" blockAlign="center">
                                    <Badge>{tier.tier}</Badge>
                                    <Text as="span" variant="bodySm">{tier.count} members</Text>
                                  </InlineStack>
                                  <Text as="span" variant="bodySm" fontWeight="semibold">
                                    {formatCurrency(tier.amount)}
                                  </Text>
                                </InlineStack>
                              ))}
                            </BlockStack>
                          </BlockStack>
                        )}

                        {/* Execution Result (for approved/rejected) */}
                        {distribution.execution_result && (
                          <Banner tone="success">
                            <p>
                              Distributed {formatCurrency(distribution.execution_result.total_amount)} to{' '}
                              {distribution.execution_result.credited} members on{' '}
                              {formatDate(distribution.execution_result.executed_at)}
                            </p>
                          </Banner>
                        )}

                        {distribution.rejection_reason && (
                          <Banner tone="critical">
                            <p>Rejected: {distribution.rejection_reason}</p>
                          </Banner>
                        )}

                        {/* Actions */}
                        {distribution.status === 'pending' && (
                          <InlineStack gap="200" align="end">
                            <Button onClick={() => openDetailsModal(distribution)}>
                              View Details
                            </Button>
                            <Button
                              tone="critical"
                              onClick={() => openRejectModal(distribution)}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="primary"
                              icon={CheckIcon}
                              onClick={() => openApproveModal(distribution)}
                            >
                              Approve
                            </Button>
                          </InlineStack>
                        )}

                        {distribution.status !== 'pending' && (
                          <InlineStack gap="200" align="end">
                            <Button onClick={() => openDetailsModal(distribution)}>
                              View Details
                            </Button>
                          </InlineStack>
                        )}
                      </BlockStack>
                    </Card>
                  ))}
                </BlockStack>
              ) : (
                <EmptyState
                  heading={showHistory ? 'No distribution history' : 'No pending distributions'}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {showHistory
                      ? 'Distribution history will appear here after you approve or reject distributions.'
                      : 'Monthly credit distributions will appear here when they are ready for review. Check back on the 1st of the month.'}
                  </p>
                </EmptyState>
              )}
            </Card>
          </Layout.Section>

          {/* How It Works */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">How Distribution Approval Works</Text>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="start">
                    <Badge tone="info">1</Badge>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">Monthly Calculation</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        On the 1st of each month, credits are calculated based on member tiers
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="start">
                    <Badge tone="info">2</Badge>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">Review Period</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        You have 7 days to review the distribution before it expires
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="start">
                    <Badge tone="info">3</Badge>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">Approve or Reject</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Approve to issue credits to Shopify, or reject if there's an issue
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="start">
                    <Badge tone="success">4</Badge>
                    <BlockStack gap="050">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">Auto-Approve (Optional)</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        After your first approval, you can enable auto-approve for future distributions
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Approve Modal */}
        <Modal
          open={approveModalOpen}
          onClose={() => setApproveModalOpen(false)}
          title="Confirm Distribution"
          primaryAction={{
            content: 'Approve & Distribute',
            icon: CheckIcon,
            onAction: () => approveMutation.mutate(),
            loading: approveMutation.isPending,
          }}
          secondaryActions={[
            { content: 'Cancel', onAction: () => setApproveModalOpen(false) },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Banner tone="warning">
                <p>
                  <strong>This action cannot be undone.</strong> Credits will be immediately
                  added to member accounts in Shopify.
                </p>
              </Banner>

              {selectedDistribution && (
                <Card>
                  <BlockStack gap="200">
                    <Text as="h4" variant="headingSm">Distribution Summary</Text>
                    <Divider />
                    <InlineStack align="space-between">
                      <Text as="span">Members to credit:</Text>
                      <Text as="span" fontWeight="semibold">
                        {selectedDistribution.preview_data?.total_members || 0}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Total amount:</Text>
                      <Text as="span" fontWeight="semibold" tone="success">
                        {formatCurrency(selectedDistribution.preview_data?.total_amount || 0)}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </Card>
              )}

              {settings?.eligible && (
                <Checkbox
                  label="Enable auto-approve for future monthly distributions"
                  helpText="After enabling, future distributions will be automatically approved. You can disable this anytime in Settings."
                  checked={enableAutoApprove}
                  onChange={setEnableAutoApprove}
                />
              )}

              {approveMutation.isError && (
                <Banner tone="critical">
                  <p>{(approveMutation.error as Error).message}</p>
                </Banner>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Reject Modal */}
        <Modal
          open={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Distribution"
          primaryAction={{
            content: 'Reject',
            destructive: true,
            onAction: () => rejectMutation.mutate(),
            loading: rejectMutation.isPending,
          }}
          secondaryActions={[
            { content: 'Cancel', onAction: () => setRejectModalOpen(false) },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Banner tone="warning">
                <p>
                  Rejecting this distribution will prevent credits from being issued for this month.
                  You can create a new distribution manually if needed.
                </p>
              </Banner>

              <TextField
                label="Reason for rejection (optional)"
                value={rejectReason}
                onChange={setRejectReason}
                multiline={3}
                autoComplete="off"
                placeholder="e.g., Incorrect tier assignments, waiting for tier updates..."
              />

              {rejectMutation.isError && (
                <Banner tone="critical">
                  <p>{(rejectMutation.error as Error).message}</p>
                </Banner>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>

        {/* Details Modal */}
        <Modal
          open={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={selectedDistribution?.display_name || 'Distribution Details'}
          size="large"
          secondaryActions={[
            { content: 'Close', onAction: () => setDetailsModalOpen(false) },
          ]}
        >
          <Modal.Section>
            {selectedDistribution && (
              <BlockStack gap="400">
                {/* Status */}
                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="bodyMd">Status:</Text>
                  {getStatusBadge(selectedDistribution)}
                  {getExpiryBadge(selectedDistribution)}
                </InlineStack>

                {/* Timestamps */}
                <Card>
                  <BlockStack gap="200">
                    <Text as="h4" variant="headingSm">Timeline</Text>
                    <Divider />
                    <InlineStack align="space-between">
                      <Text as="span" tone="subdued">Created:</Text>
                      <Text as="span">{formatDate(selectedDistribution.created_at)}</Text>
                    </InlineStack>
                    {selectedDistribution.expires_at && selectedDistribution.status === 'pending' && (
                      <InlineStack align="space-between">
                        <Text as="span" tone="subdued">Expires:</Text>
                        <Text as="span">{formatDate(selectedDistribution.expires_at)}</Text>
                      </InlineStack>
                    )}
                    {selectedDistribution.approved_at && (
                      <InlineStack align="space-between">
                        <Text as="span" tone="subdued">Approved:</Text>
                        <Text as="span">
                          {formatDate(selectedDistribution.approved_at)} by {selectedDistribution.approved_by}
                        </Text>
                      </InlineStack>
                    )}
                    {selectedDistribution.rejected_at && (
                      <InlineStack align="space-between">
                        <Text as="span" tone="subdued">Rejected:</Text>
                        <Text as="span">
                          {formatDate(selectedDistribution.rejected_at)} by {selectedDistribution.rejected_by}
                        </Text>
                      </InlineStack>
                    )}
                  </BlockStack>
                </Card>

                {/* Summary */}
                <Card>
                  <BlockStack gap="200">
                    <Text as="h4" variant="headingSm">Summary</Text>
                    <Divider />
                    <InlineGrid columns={isMobile ? 2 : 4} gap="200">
                      <BlockStack gap="050">
                        <Text as="span" variant="bodySm" tone="subdued">Members</Text>
                        <Text as="p" variant="headingMd">
                          {selectedDistribution.preview_data?.total_members || 0}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text as="span" variant="bodySm" tone="subdued">Total Amount</Text>
                        <Text as="p" variant="headingMd" tone="success">
                          {formatCurrency(selectedDistribution.preview_data?.total_amount || 0)}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text as="span" variant="bodySm" tone="subdued">Processed</Text>
                        <Text as="p" variant="headingMd">
                          {selectedDistribution.preview_data?.processed || 0}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text as="span" variant="bodySm" tone="subdued">Skipped</Text>
                        <Text as="p" variant="headingMd">
                          {selectedDistribution.preview_data?.skipped || 0}
                        </Text>
                      </BlockStack>
                    </InlineGrid>
                  </BlockStack>
                </Card>

                {/* Tier Breakdown */}
                {selectedDistribution.preview_data?.by_tier && selectedDistribution.preview_data.by_tier.length > 0 && (
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm">Tier Breakdown</Text>
                      <Divider />
                      <DataTable
                        columnContentTypes={['text', 'numeric', 'numeric']}
                        headings={['Tier', 'Members', 'Amount']}
                        rows={selectedDistribution.preview_data.by_tier.map((tier) => [
                          tier.tier,
                          String(tier.count),
                          formatCurrency(tier.amount),
                        ])}
                        totals={[
                          'Total',
                          String(selectedDistribution.preview_data.total_members),
                          formatCurrency(selectedDistribution.preview_data.total_amount),
                        ]}
                      />
                    </BlockStack>
                  </Card>
                )}

                {/* Execution Result */}
                {selectedDistribution.execution_result && (
                  <Banner tone="success">
                    <BlockStack gap="100">
                      <Text as="p" fontWeight="semibold">Distribution Completed</Text>
                      <Text as="p">
                        {selectedDistribution.execution_result.credited} members credited{' '}
                        {formatCurrency(selectedDistribution.execution_result.total_amount)} total
                      </Text>
                      {selectedDistribution.execution_result.errors > 0 && (
                        <Text as="p" tone="critical">
                          {selectedDistribution.execution_result.errors} errors occurred
                        </Text>
                      )}
                    </BlockStack>
                  </Banner>
                )}

                {selectedDistribution.rejection_reason && (
                  <Banner tone="critical">
                    <p><strong>Rejection reason:</strong> {selectedDistribution.rejection_reason}</p>
                  </Banner>
                )}
              </BlockStack>
            )}
          </Modal.Section>
        </Modal>

        {/* Settings Modal */}
        <Modal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          title="Auto-Approve Settings"
          primaryAction={{
            content: 'Save',
            onAction: () => setSettingsModalOpen(false),
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
              {settings && (
                <>
                  {!settings.eligible && (
                    <Banner tone="info">
                      <p>
                        Auto-approve will be available after you manually approve your first
                        monthly credit distribution. This is a safety measure to ensure you
                        review the initial setup.
                      </p>
                    </Banner>
                  )}

                  <Checkbox
                    label="Enable auto-approve for monthly distributions"
                    helpText="When enabled, future monthly credit distributions will be automatically approved and issued without manual review."
                    checked={settings.enabled}
                    onChange={(checked) => updateSettingsMutation.mutate({ enabled: checked })}
                    disabled={!settings.eligible || updateSettingsMutation.isPending}
                  />

                  {settings.enabled && (
                    <Banner tone="success">
                      <p>
                        Auto-approve is enabled. Future monthly distributions will be
                        automatically processed. You will still receive email notifications.
                      </p>
                    </Banner>
                  )}
                </>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Page>
    </>
  );
}

export default EmbeddedPendingDistributions;
