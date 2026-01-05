/**
 * TradeUp Members - Shopify Embedded Version
 *
 * View and manage program members.
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
} from '@shopify/polaris';
import { SearchIcon, ExportIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { getApiUrl, getTenantParam } from '../../hooks/useShopifyBridge';

interface MembersProps {
  shop: string | null;
}

interface Member {
  id: number;
  shopify_customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tier: {
    id: number;
    name: string;
    color: string;
  };
  total_trade_in_value: number;
  total_credits_issued: number;
  trade_in_count: number;
  status: string;
  created_at: string;
  last_trade_in_at: string | null;
}

interface MembersResponse {
  members: Member[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

async function fetchMembers(
  shop: string | null,
  page: number,
  search: string,
  tier: string
): Promise<MembersResponse> {
  const params = new URLSearchParams();
  if (shop) params.set('shop', shop);
  params.set('page', String(page));
  params.set('per_page', '20');
  if (search) params.set('search', search);
  if (tier) params.set('tier', tier);

  const response = await fetch(`${getApiUrl()}/members?${params}`);
  if (!response.ok) throw new Error('Failed to fetch members');
  return response.json();
}

export function EmbeddedMembers({ shop }: MembersProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string[]>([]);
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['members', shop, page, search, selectedTier[0]],
    queryFn: () => fetchMembers(shop, page, search, selectedTier[0] || ''),
    enabled: !!shop,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleTierChange = useCallback((value: string[]) => {
    setSelectedTier(value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setSelectedTier([]);
    setPage(1);
  }, []);

  if (!shop) {
    return (
      <Page title="Members">
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const filters = [
    {
      key: 'tier',
      label: 'Tier',
      filter: (
        <ChoiceList
          title="Tier"
          titleHidden
          choices={[
            { label: 'Bronze', value: 'bronze' },
            { label: 'Silver', value: 'silver' },
            { label: 'Gold', value: 'gold' },
            { label: 'Platinum', value: 'platinum' },
          ]}
          selected={selectedTier}
          onChange={handleTierChange}
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = selectedTier.length > 0
    ? [
        {
          key: 'tier',
          label: `Tier: ${selectedTier[0]}`,
          onRemove: () => setSelectedTier([]),
        },
      ]
    : [];

  return (
    <Page
      title="Members"
      subtitle={`${data?.total || 0} total members`}
      primaryAction={{
        content: 'Export',
        icon: ExportIcon,
        disabled: !data?.members?.length,
      }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Failed to load members. Please try refreshing the page.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            <Box padding="400">
              <Filters
                queryValue={search}
                queryPlaceholder="Search by name or email"
                onQueryChange={handleSearchChange}
                onQueryClear={() => setSearch('')}
                filters={filters}
                appliedFilters={appliedFilters}
                onClearAll={handleClearFilters}
              />
            </Box>

            {isLoading ? (
              <Box padding="1600">
                <InlineStack align="center">
                  <Spinner size="large" />
                </InlineStack>
              </Box>
            ) : data?.members && data.members.length > 0 ? (
              <>
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                    'numeric',
                    'numeric',
                    'text',
                  ]}
                  headings={[
                    'Member',
                    'Tier',
                    'Status',
                    'Trade-Ins',
                    'Credits Issued',
                    'Last Activity',
                  ]}
                  rows={data.members.map((member) => [
                    <BlockStack gap="100" key={member.id}>
                      <Button
                        variant="plain"
                        onClick={() => setDetailMember(member)}
                      >
                        {member.first_name} {member.last_name}
                      </Button>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {member.email}
                      </Text>
                    </BlockStack>,
                    <Badge key={`tier-${member.id}`} tone="info">
                      {member.tier?.name || 'None'}
                    </Badge>,
                    <Badge
                      key={`status-${member.id}`}
                      tone={member.status === 'active' ? 'success' : 'subdued'}
                    >
                      {member.status}
                    </Badge>,
                    member.trade_in_count,
                    formatCurrency(member.total_credits_issued),
                    formatDate(member.last_trade_in_at),
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
                  heading="No members found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    {search || selectedTier.length > 0
                      ? 'Try adjusting your search or filters.'
                      : 'Members will appear here when customers join your program.'}
                  </p>
                </EmptyState>
              </Box>
            )}
          </Card>
        </Layout.Section>
      </Layout>

      {/* Member Detail Modal */}
      <Modal
        open={detailMember !== null}
        onClose={() => setDetailMember(null)}
        title={
          detailMember
            ? `${detailMember.first_name} ${detailMember.last_name}`
            : ''
        }
        secondaryActions={[
          { content: 'Close', onAction: () => setDetailMember(null) },
        ]}
      >
        {detailMember && (
          <Modal.Section>
            <BlockStack gap="400">
              <InlineStack gap="400">
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Email
                  </Text>
                  <Text as="span">{detailMember.email}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Tier
                  </Text>
                  <Badge tone="info">{detailMember.tier?.name || 'None'}</Badge>
                </BlockStack>
              </InlineStack>

              <InlineStack gap="400">
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Total Trade-Ins
                  </Text>
                  <Text as="span">{detailMember.trade_in_count}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Trade-In Value
                  </Text>
                  <Text as="span">
                    {formatCurrency(detailMember.total_trade_in_value)}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Credits Issued
                  </Text>
                  <Text as="span">
                    {formatCurrency(detailMember.total_credits_issued)}
                  </Text>
                </BlockStack>
              </InlineStack>

              <InlineStack gap="400">
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Member Since
                  </Text>
                  <Text as="span">{formatDate(detailMember.created_at)}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Last Activity
                  </Text>
                  <Text as="span">
                    {formatDate(detailMember.last_trade_in_at)}
                  </Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Modal.Section>
        )}
      </Modal>
    </Page>
  );
}
