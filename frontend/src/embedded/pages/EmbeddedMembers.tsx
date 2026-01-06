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
  FormLayout,
  Select,
} from '@shopify/polaris';
import { ExportIcon } from '@shopify/polaris-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl, authFetch } from '../../hooks/useShopifyBridge';

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
  params.set('page', String(page));
  params.set('per_page', '20');
  if (search) params.set('search', search);
  if (tier) params.set('tier', tier);

  const response = await authFetch(`${getApiUrl()}/members?${params}`, shop);
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
                      tone={member.status === 'active' ? 'success' : undefined}
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
      <MemberDetailModal
        member={detailMember}
        shop={shop}
        onClose={() => setDetailMember(null)}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
    </Page>
  );
}

/**
 * Member Detail Modal with Tier Management
 */
interface MemberDetailModalProps {
  member: Member | null;
  shop: string | null;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateStr: string | null) => string;
}

interface TierOption {
  id: number;
  name: string;
}

interface TierHistoryItem {
  id: number;
  previous_tier: string | null;
  new_tier: string | null;
  change_type: string;
  source_type: string;
  reason: string | null;
  created_at: string;
  created_by: string | null;
}

function MemberDetailModal({
  member,
  shop,
  onClose,
  formatCurrency,
  formatDate,
}: MemberDetailModalProps) {
  const [changeTierOpen, setChangeTierOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [tierReason, setTierReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available tiers
  const { data: tiers } = useQuery<TierOption[]>({
    queryKey: ['tiers-list', shop],
    queryFn: async () => {
      const response = await authFetch(`${getApiUrl()}/membership/tiers`, shop);
      if (!response.ok) throw new Error('Failed to fetch tiers');
      return response.json();
    },
    enabled: !!shop && !!member,
  });

  // Fetch tier history
  const { data: history, isLoading: historyLoading } = useQuery<{ history: TierHistoryItem[] }>({
    queryKey: ['tier-history', shop, member?.id],
    queryFn: async () => {
      const response = await authFetch(
        `${getApiUrl()}/membership/tiers/history/${member?.id}`,
        shop
      );
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    enabled: !!shop && !!member && showHistory,
  });

  // Change tier mutation
  const changeTierMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch(`${getApiUrl()}/membership/tiers/assign`, shop, {
        method: 'POST',
        body: JSON.stringify({
          member_id: member?.id,
          tier_id: selectedTierId ? parseInt(selectedTierId) : null,
          reason: tierReason || 'Staff assigned',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change tier');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['tier-history', shop, member?.id] });
      setChangeTierOpen(false);
      setSelectedTierId('');
      setTierReason('');
    },
  });

  if (!member) return null;

  const tierOptions = [
    { label: 'No Tier', value: '' },
    ...(tiers?.map((t) => ({ label: t.name, value: String(t.id) })) || []),
  ];

  return (
    <>
      <Modal
        open={member !== null}
        onClose={onClose}
        title={`${member.first_name} ${member.last_name}`}
        primaryAction={{
          content: 'Change Tier',
          onAction: () => setChangeTierOpen(true),
        }}
        secondaryActions={[
          { content: 'Close', onAction: onClose },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <InlineStack gap="400">
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Email
                </Text>
                <Text as="span">{member.email}</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Tier
                </Text>
                <Badge tone="info">{member.tier?.name || 'None'}</Badge>
              </BlockStack>
            </InlineStack>

            <InlineStack gap="400">
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Total Trade-Ins
                </Text>
                <Text as="span">{member.trade_in_count}</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Trade-In Value
                </Text>
                <Text as="span">
                  {formatCurrency(member.total_trade_in_value)}
                </Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Credits Issued
                </Text>
                <Text as="span">
                  {formatCurrency(member.total_credits_issued)}
                </Text>
              </BlockStack>
            </InlineStack>

            <InlineStack gap="400">
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Member Since
                </Text>
                <Text as="span">{formatDate(member.created_at)}</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="span" variant="bodySm" tone="subdued">
                  Last Activity
                </Text>
                <Text as="span">
                  {formatDate(member.last_trade_in_at)}
                </Text>
              </BlockStack>
            </InlineStack>
          </BlockStack>
        </Modal.Section>

        <Modal.Section>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h3" variant="headingSm">Tier History</Text>
              <Button
                variant="plain"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
            </InlineStack>

            {showHistory && (
              historyLoading ? (
                <InlineStack align="center">
                  <Spinner size="small" />
                </InlineStack>
              ) : history?.history && history.history.length > 0 ? (
                <BlockStack gap="200">
                  {history.history.slice(0, 5).map((item) => (
                    <Box
                      key={item.id}
                      padding="200"
                      background="bg-surface-secondary"
                      borderRadius="100"
                    >
                      <InlineStack align="space-between">
                        <BlockStack gap="050">
                          <Text as="span" variant="bodySm">
                            {item.previous_tier || 'None'} → {item.new_tier || 'None'}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {item.change_type} • {item.source_type}
                          </Text>
                        </BlockStack>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {formatDate(item.created_at)}
                        </Text>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              ) : (
                <Text as="p" tone="subdued">No tier changes recorded</Text>
              )
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Change Tier Modal */}
      <Modal
        open={changeTierOpen}
        onClose={() => setChangeTierOpen(false)}
        title="Change Member Tier"
        primaryAction={{
          content: 'Save',
          onAction: () => changeTierMutation.mutate(),
          loading: changeTierMutation.isPending,
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setChangeTierOpen(false) },
        ]}
      >
        <Modal.Section>
          {changeTierMutation.isError && (
            <Box paddingBlockEnd="400">
              <Banner tone="critical">
                <p>{changeTierMutation.error?.message || 'Failed to change tier'}</p>
              </Banner>
            </Box>
          )}
          <FormLayout>
            <Select
              label="New Tier"
              options={tierOptions}
              value={selectedTierId}
              onChange={setSelectedTierId}
            />
            <TextField
              label="Reason (optional)"
              value={tierReason}
              onChange={setTierReason}
              placeholder="e.g., VIP upgrade, loyalty reward"
              autoComplete="off"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </>
  );
}
