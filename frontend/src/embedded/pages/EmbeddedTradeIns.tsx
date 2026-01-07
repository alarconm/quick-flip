/**
 * TradeUp Trade-Ins - Shopify Embedded Version
 *
 * View and manage trade-in submissions.
 */
import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  InlineStack,
  BlockStack,
  Badge,
  Button,
  DataTable,
  Pagination,
  Banner,
  Spinner,
  EmptyState,
  Modal,
  Box,
  Tabs,
} from '@shopify/polaris';
import { ViewIcon, PlusIcon, CheckIcon, XIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl, authFetch } from '../../hooks/useShopifyBridge';

interface TradeInsProps {
  shop: string | null;
}

interface TradeInItem {
  id: number;
  name: string;
  quantity: number;
  market_value: number;
  offered_value: number;
}

interface TradeIn {
  id: number;
  member: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  items: TradeInItem[];
  total_market_value: number;
  total_offered_value: number;
  trade_in_rate: number;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

interface TradeInsResponse {
  trade_ins: TradeIn[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

async function fetchTradeIns(
  shop: string | null,
  page: number,
  status: string
): Promise<TradeInsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', '20');
  if (status && status !== 'all') params.set('status', status);

  const response = await authFetch(`${getApiUrl()}/trade-ins?${params}`, shop);
  if (!response.ok) throw new Error('Failed to fetch trade-ins');
  return response.json();
}

async function updateTradeInStatus(
  shop: string | null,
  tradeInId: number,
  status: string
): Promise<void> {
  const response = await authFetch(`${getApiUrl()}/trade-ins/${tradeInId}/status`, shop, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error(`Failed to ${status} trade-in`);
}

export function EmbeddedTradeIns({ shop }: TradeInsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState(0);
  const [detailTradeIn, setDetailTradeIn] = useState<TradeIn | null>(null);
  const [actionError, setActionError] = useState('');

  const statusMap = ['all', 'pending', 'approved', 'completed', 'rejected'];
  const currentStatus = statusMap[selectedTab];

  const { data, isLoading, error } = useQuery({
    queryKey: ['trade-ins', shop, page, currentStatus],
    queryFn: () => fetchTradeIns(shop, page, currentStatus),
    enabled: !!shop,
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ tradeInId, newStatus }: { tradeInId: number; newStatus: string }) =>
      updateTradeInStatus(shop, tradeInId, newStatus),
    onSuccess: (_, variables) => {
      // Update local state
      if (detailTradeIn) {
        setDetailTradeIn({ ...detailTradeIn, status: variables.newStatus });
      }
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] });
      setActionError('');
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (detailTradeIn) {
        statusMutation.mutate({ tradeInId: detailTradeIn.id, newStatus });
      }
    },
    [detailTradeIn, statusMutation]
  );

  const handleTabChange = useCallback((index: number) => {
    setSelectedTab(index);
    setPage(1);
  }, []);

  if (!shop) {
    return (
      <Page title="Trade-Ins">
        <Banner tone="warning">
          <p>No shop connected. Please install the app from the Shopify App Store.</p>
        </Banner>
      </Page>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const tones: Record<string, 'success' | 'warning' | 'critical' | 'info' | undefined> = {
      pending: 'warning',
      approved: 'info',
      completed: 'success',
      rejected: 'critical',
    };
    return <Badge tone={tones[status]}>{status}</Badge>;
  };

  const tabs = [
    { id: 'all', content: 'All', accessibilityLabel: 'All trade-ins' },
    { id: 'pending', content: 'Pending', accessibilityLabel: 'Pending trade-ins' },
    { id: 'approved', content: 'Approved', accessibilityLabel: 'Approved trade-ins' },
    { id: 'completed', content: 'Completed', accessibilityLabel: 'Completed trade-ins' },
    { id: 'rejected', content: 'Rejected', accessibilityLabel: 'Rejected trade-ins' },
  ];

  return (
    <Page
      title="Trade-Ins"
      subtitle={`${data?.total || 0} total trade-ins`}
      primaryAction={{
        content: 'New Trade-In',
        icon: PlusIcon,
        onAction: () => navigate('/app/trade-ins/new'),
      }}
      secondaryActions={[
        {
          content: 'Manage Categories',
          onAction: () => navigate('/app/trade-ins/categories'),
        },
      ]}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Failed to load trade-ins. Please try refreshing the page.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
              {isLoading ? (
                <Box padding="1600">
                  <InlineStack align="center">
                    <Spinner size="large" />
                  </InlineStack>
                </Box>
              ) : data?.trade_ins && data.trade_ins.length > 0 ? (
                <>
                  <DataTable
                    columnContentTypes={[
                      'text',
                      'text',
                      'numeric',
                      'numeric',
                      'text',
                      'text',
                    ]}
                    headings={[
                      'Member',
                      'Items',
                      'Market Value',
                      'Offered',
                      'Status',
                      '',
                    ]}
                    rows={data.trade_ins.map((tradeIn) => [
                      <BlockStack gap="100" key={tradeIn.id}>
                        <Text as="span" fontWeight="bold">
                          {tradeIn.member.first_name} {tradeIn.member.last_name}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {formatDate(tradeIn.created_at)}
                        </Text>
                      </BlockStack>,
                      `${tradeIn.items.length} items`,
                      formatCurrency(tradeIn.total_market_value),
                      formatCurrency(tradeIn.total_offered_value),
                      getStatusBadge(tradeIn.status),
                      <Button
                        key={`view-${tradeIn.id}`}
                        icon={ViewIcon}
                        variant="plain"
                        onClick={() => setDetailTradeIn(tradeIn)}
                      >
                        View
                      </Button>,
                    ])}
                  />

                  <Box padding="400">
                    <InlineStack align="center">
                      <Pagination
                        hasPrevious={page > 1}
                        onPrevious={() => setPage(page - 1)}
                        hasNext={page < (data?.pages || 1)}
                        onNext={() => setPage(page + 1)}
                      />
                    </InlineStack>
                  </Box>
                </>
              ) : (
                <Box padding="1600">
                  <EmptyState
                    heading="No trade-ins found"
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Trade-ins will appear here when members submit items.
                    </p>
                  </EmptyState>
                </Box>
              )}
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Trade-In Detail Modal */}
      <Modal
        open={detailTradeIn !== null}
        onClose={() => setDetailTradeIn(null)}
        title={`Trade-In #${detailTradeIn?.id || ''}`}
        secondaryActions={[
          { content: 'Close', onAction: () => setDetailTradeIn(null) },
        ]}
        size="large"
      >
        {detailTradeIn && (
          <Modal.Section>
            <BlockStack gap="400">
              {actionError && (
                <Banner tone="critical" onDismiss={() => setActionError('')}>
                  <p>{actionError}</p>
                </Banner>
              )}

              <InlineStack gap="800">
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Member
                  </Text>
                  <Text as="span">
                    {detailTradeIn.member.first_name}{' '}
                    {detailTradeIn.member.last_name}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Status
                  </Text>
                  {getStatusBadge(detailTradeIn.status)}
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Rate
                  </Text>
                  <Text as="span">{detailTradeIn.trade_in_rate}%</Text>
                </BlockStack>
              </InlineStack>

              {/* Status Action Buttons */}
              {detailTradeIn.status !== 'completed' && detailTradeIn.status !== 'rejected' && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingSm">
                      Actions
                    </Text>
                    <InlineStack gap="300">
                      {detailTradeIn.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            icon={CheckIcon}
                            onClick={() => handleStatusChange('approved')}
                            loading={statusMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            tone="critical"
                            icon={XIcon}
                            onClick={() => handleStatusChange('rejected')}
                            loading={statusMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {detailTradeIn.status === 'approved' && (
                        <>
                          <Button
                            variant="primary"
                            tone="success"
                            icon={CheckIcon}
                            onClick={() => handleStatusChange('completed')}
                            loading={statusMutation.isPending}
                          >
                            Complete & Issue Credit
                          </Button>
                          <Button
                            tone="critical"
                            icon={XIcon}
                            onClick={() => handleStatusChange('rejected')}
                            loading={statusMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </InlineStack>
                  </BlockStack>
                </Card>
              )}

              <Card>
                <Text as="h3" variant="headingSm">
                  Items
                </Text>
                <DataTable
                  columnContentTypes={['text', 'numeric', 'numeric', 'numeric']}
                  headings={['Item', 'Qty', 'Market Value', 'Offered']}
                  rows={detailTradeIn.items.map((item) => [
                    item.name,
                    item.quantity,
                    formatCurrency(item.market_value),
                    formatCurrency(item.offered_value),
                  ])}
                  totals={[
                    'Total',
                    '',
                    formatCurrency(detailTradeIn.total_market_value),
                    formatCurrency(detailTradeIn.total_offered_value),
                  ]}
                />
              </Card>

              {detailTradeIn.notes && (
                <Card>
                  <Text as="h3" variant="headingSm">
                    Notes
                  </Text>
                  <Text as="p">{detailTradeIn.notes}</Text>
                </Card>
              )}
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>
    </Page>
  );
}
