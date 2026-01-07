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
import { ExportIcon, EmailIcon, PlusIcon, SearchIcon } from '@shopify/polaris-icons';
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
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);

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
        content: 'Add Member',
        icon: PlusIcon,
        onAction: () => setAddMemberModalOpen(true),
      }}
      secondaryActions={[
        {
          content: 'Email Members',
          icon: EmailIcon,
          onAction: () => setEmailModalOpen(true),
        },
        {
          content: 'Export',
          icon: ExportIcon,
          disabled: !data?.members?.length,
        },
      ]}
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

      {/* Bulk Email Modal */}
      <BulkEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        shop={shop}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        open={addMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        shop={shop}
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

/**
 * Bulk Email Modal for Tier-Based Communication
 */
interface BulkEmailModalProps {
  open: boolean;
  onClose: () => void;
  shop: string | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  category: string;
}

interface PreviewResponse {
  tier_names: string[];
  member_counts: Record<string, number>;
  total_recipients: number;
}

function BulkEmailModal({ open, onClose, shop }: BulkEmailModalProps) {
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // Fetch email templates
  const { data: templates } = useQuery<{ templates: EmailTemplate[] }>({
    queryKey: ['email-templates', shop],
    queryFn: async () => {
      const response = await authFetch(`${getApiUrl()}/members/email/templates`, shop);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
    enabled: !!shop && open,
  });

  // Preview mutation (get recipient counts)
  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch(`${getApiUrl()}/members/email/preview`, shop, {
        method: 'POST',
        body: JSON.stringify({ tier_names: selectedTiers }),
      });
      if (!response.ok) throw new Error('Failed to preview');
      return response.json() as Promise<PreviewResponse>;
    },
  });

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch(`${getApiUrl()}/members/email/send`, shop, {
        method: 'POST',
        body: JSON.stringify({
          tier_names: selectedTiers,
          subject,
          message,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send emails');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSendSuccess(true);
      setSendResult({ sent: data.sent, failed: data.failed });
    },
  });

  // Preview when tiers change
  const handleTierChange = useCallback((value: string[]) => {
    setSelectedTiers(value);
    if (value.length > 0) {
      previewMutation.mutate();
    }
  }, []);

  // Apply template
  const applyTemplate = useCallback((template: EmailTemplate) => {
    setSubject(template.subject);
    setMessage(template.message);
  }, []);

  // Reset and close
  const handleClose = useCallback(() => {
    setSelectedTiers([]);
    setSubject('');
    setMessage('');
    setSendSuccess(false);
    setSendResult(null);
    onClose();
  }, [onClose]);

  const canSend = selectedTiers.length > 0 && subject.trim() && message.trim();
  const recipientCount = previewMutation.data?.total_recipients || 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Email Members by Tier"
      primaryAction={
        sendSuccess
          ? { content: 'Done', onAction: handleClose }
          : {
              content: `Send to ${recipientCount} ${recipientCount === 1 ? 'Member' : 'Members'}`,
              onAction: () => sendMutation.mutate(),
              disabled: !canSend || recipientCount === 0,
              loading: sendMutation.isPending,
            }
      }
      secondaryActions={
        sendSuccess ? [] : [{ content: 'Cancel', onAction: handleClose }]
      }
      size="large"
    >
      {sendSuccess ? (
        <Modal.Section>
          <Banner tone="success">
            <BlockStack gap="200">
              <Text as="p" variant="headingMd">Email Sent Successfully!</Text>
              <Text as="p">
                Sent {sendResult?.sent} emails
                {sendResult?.failed ? ` (${sendResult.failed} failed)` : ''}.
              </Text>
            </BlockStack>
          </Banner>
        </Modal.Section>
      ) : (
        <>
          <Modal.Section>
            <BlockStack gap="400">
              {sendMutation.isError && (
                <Banner tone="critical">
                  <p>{sendMutation.error?.message || 'Failed to send emails'}</p>
                </Banner>
              )}

              <ChoiceList
                title="Select Tiers to Email"
                choices={[
                  { label: 'Bronze', value: 'BRONZE' },
                  { label: 'Silver', value: 'SILVER' },
                  { label: 'Gold', value: 'GOLD' },
                  { label: 'Platinum', value: 'PLATINUM' },
                ]}
                selected={selectedTiers}
                onChange={handleTierChange}
                allowMultiple
              />

              {previewMutation.data && (
                <Banner>
                  <Text as="p">
                    <strong>{recipientCount}</strong> active members will receive this email:
                    {Object.entries(previewMutation.data.member_counts).map(([tier, count]) => (
                      <span key={tier}> {tier}: {count}</span>
                    ))}
                  </Text>
                </Banner>
              )}
            </BlockStack>
          </Modal.Section>

          <Modal.Section>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Quick Templates</Text>
              <InlineStack gap="200" wrap>
                {templates?.templates.map((t) => (
                  <Button
                    key={t.id}
                    size="slim"
                    onClick={() => applyTemplate(t)}
                  >
                    {t.name}
                  </Button>
                ))}
              </InlineStack>
            </BlockStack>
          </Modal.Section>

          <Modal.Section>
            <FormLayout>
              <TextField
                label="Subject"
                value={subject}
                onChange={setSubject}
                autoComplete="off"
                placeholder="e.g., Exclusive Member Offer!"
                requiredIndicator
              />

              <TextField
                label="Message"
                value={message}
                onChange={setMessage}
                multiline={8}
                autoComplete="off"
                placeholder="Write your message here..."
                helpText="Use {member_name}, {member_number}, and {tier_name} for personalization"
                requiredIndicator
              />
            </FormLayout>
          </Modal.Section>
        </>
      )}
    </Modal>
  );
}

/**
 * Add Member Modal - Search Shopify customers and enroll as members
 */
interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  shop: string | null;
}

interface ShopifyCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders_count: number;
  total_spent: string;
}

function AddMemberModal({ open, onClose, shop }: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<ShopifyCustomer | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [searchResults, setSearchResults] = useState<ShopifyCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch available tiers
  const { data: tiers } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['tiers-list', shop],
    queryFn: async () => {
      const response = await authFetch(`${getApiUrl()}/membership/tiers`, shop);
      if (!response.ok) throw new Error('Failed to fetch tiers');
      return response.json();
    },
    enabled: !!shop && open,
  });

  // Search Shopify customers
  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) return;

    setSearching(true);
    try {
      const response = await authFetch(
        `${getApiUrl()}/shopify/customers/search?q=${encodeURIComponent(searchQuery)}`,
        shop
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.customers || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, shop]);

  // Enroll customer as member
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('No customer selected');

      const response = await authFetch(`${getApiUrl()}/members`, shop, {
        method: 'POST',
        body: JSON.stringify({
          shopify_customer_id: selectedCustomer.id,
          email: selectedCustomer.email,
          first_name: selectedCustomer.first_name,
          last_name: selectedCustomer.last_name,
          phone: selectedCustomer.phone,
          tier_id: selectedTierId ? parseInt(selectedTierId) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enroll member');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedCustomer(null);
    setSelectedTierId('');
    setSearchResults([]);
    setSuccess(false);
    onClose();
  }, [onClose]);

  const tierOptions = [
    { label: 'No Tier (Start at base)', value: '' },
    ...(tiers?.map((t) => ({ label: t.name, value: String(t.id) })) || []),
  ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Member"
      primaryAction={
        success
          ? { content: 'Done', onAction: handleClose }
          : selectedCustomer
          ? {
              content: 'Enroll Member',
              onAction: () => enrollMutation.mutate(),
              loading: enrollMutation.isPending,
            }
          : undefined
      }
      secondaryActions={
        success
          ? []
          : selectedCustomer
          ? [
              {
                content: 'Back',
                onAction: () => setSelectedCustomer(null),
              },
            ]
          : [{ content: 'Cancel', onAction: handleClose }]
      }
    >
      {success ? (
        <Modal.Section>
          <Banner tone="success">
            <BlockStack gap="200">
              <Text as="p" variant="headingMd">Member Enrolled!</Text>
              <Text as="p">
                {selectedCustomer?.first_name} {selectedCustomer?.last_name} has been enrolled
                in your loyalty program.
              </Text>
            </BlockStack>
          </Banner>
        </Modal.Section>
      ) : selectedCustomer ? (
        <Modal.Section>
          <BlockStack gap="400">
            {enrollMutation.isError && (
              <Banner tone="critical">
                <p>{enrollMutation.error?.message || 'Failed to enroll member'}</p>
              </Banner>
            )}

            <Card background="bg-surface-secondary">
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </Text>
                <Text as="p" tone="subdued">
                  {selectedCustomer.email}
                </Text>
                <InlineStack gap="400">
                  <Text as="span" variant="bodySm">
                    {selectedCustomer.orders_count} orders
                  </Text>
                  <Text as="span" variant="bodySm">
                    ${selectedCustomer.total_spent} spent
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Select
              label="Starting Tier"
              options={tierOptions}
              value={selectedTierId}
              onChange={setSelectedTierId}
              helpText="Select an initial tier or leave at base level"
            />
          </BlockStack>
        </Modal.Section>
      ) : (
        <Modal.Section>
          <BlockStack gap="400">
            <InlineStack gap="200">
              <div style={{ flex: 1 }}>
                <TextField
                  label="Search Shopify Customers"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by name or email..."
                  autoComplete="off"
                  onBlur={() => {}}
                  connectedRight={
                    <Button
                      onClick={handleSearch}
                      loading={searching}
                      icon={SearchIcon}
                    >
                      Search
                    </Button>
                  }
                />
              </div>
            </InlineStack>

            {searchResults.length > 0 ? (
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Search Results ({searchResults.length})
                </Text>
                {searchResults.map((customer) => (
                  <Box
                    key={customer.id}
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    as="button"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" fontWeight="semibold">
                          {customer.first_name} {customer.last_name}
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {customer.email}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="050" inlineAlign="end">
                        <Text as="span" variant="bodySm">
                          {customer.orders_count} orders
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          ${customer.total_spent}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            ) : searchQuery.length >= 2 && !searching ? (
              <Text as="p" tone="subdued" alignment="center">
                No customers found. Try a different search.
              </Text>
            ) : (
              <Text as="p" tone="subdued" alignment="center">
                Search for a Shopify customer to enroll as a member.
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      )}
    </Modal>
  );
}
