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
  TextField,
  Filters,
  DataTable,
  Pagination,
  Banner,
  Spinner,
  EmptyState,
  Modal,
  ChoiceList,
  Box,
  Tabs,
} from '@shopify/polaris';
import { ViewIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { getApiUrl, getTenantParam } from '../../hooks/useShopifyBridge';

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
  if (shop) params.set('shop', shop);
  params.set('page', String(page));
  params.set('per_page', '20');
  if (status && status !== 'all') params.set('status', status);

  const response = await fetch(`${getApiUrl()}/trade-ins?${params}`);
  if (!response.ok) throw new Error('Failed to fetch trade-ins');
  return response.json();
}

export function EmbeddedTradeIns({ shop }: TradeInsProps) {
  const [page, setPage] = useState(1);
  const [selectedTab, setSelectedTab] = useState(0);
  const [detailTradeIn, setDetailTradeIn] = useState<TradeIn | null>(null);

  const statusMap = ['all', 'pending', 'approved', 'completed', 'rejected'];
  const currentStatus = statusMap[selectedTab];

  const { data, isLoading, error } = useQuery({
    queryKey: ['trade-ins', shop, page, currentStatus],
    queryFn: () => fetchTradeIns(shop, page, currentStatus),
    enabled: !!shop,
  });

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
    const tones: Record<string, 'success' | 'warning' | 'critical' | 'info' | 'subdued'> = {
      pending: 'warning',
      approved: 'info',
      completed: 'success',
      rejected: 'critical',
    };
    return <Badge tone={tones[status] || 'subdued'}>{status}</Badge>;
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
        large
      >
        {detailTradeIn && (
          <Modal.Section>
            <BlockStack gap="400">
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
