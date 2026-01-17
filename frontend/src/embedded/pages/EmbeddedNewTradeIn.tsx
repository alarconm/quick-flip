/**
 * TradeUp New Trade-In - Shopify Embedded Version
 *
 * Create new trade-in batches with Shopify customer search, category selection,
 * and item entry. Uses Shopify Polaris for consistent UX.
 */
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  FormLayout,
  Banner,
  Icon,
  Divider,
  ChoiceList,
  Modal,
  Spinner,
} from '@shopify/polaris';
import {
  SearchIcon,
  PlusIcon,
  DeleteIcon,
  CheckIcon,
  AlertCircleIcon,
} from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getApiUrl, authFetch } from '../../hooks/useShopifyBridge';

interface NewTradeInProps {
  shop: string | null;
}

interface TradeInCategory {
  id: string;
  name: string;
  icon: string;
}

interface TradeInItem {
  id: string;
  product_title: string;
  trade_value: string;
  market_value: string;
  notes: string;
}

interface ShopifyCustomer {
  id: string;
  gid?: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  name?: string;
  phone: string | null;
  ordersCount?: number;
  numberOfOrders?: number;
  totalSpent?: number | string;
  amountSpent?: number | string;
  storeCredit?: number;
  is_member?: boolean;
  member_id?: number;
  member_number?: string;
}

// Custom hook for debouncing a value
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Default categories if none are configured (TCGs and collectibles)
const DEFAULT_CATEGORIES: TradeInCategory[] = [
  { id: 'pokemon', name: 'Pokemon', icon: '⚡' },
  { id: 'magic', name: 'Magic: The Gathering', icon: '🔮' },
  { id: 'yugioh', name: 'Yu-Gi-Oh!', icon: '🃏' },
  { id: 'sports', name: 'Sports Cards', icon: '🏈' },
  { id: 'one_piece', name: 'One Piece', icon: '🏴‍☠️' },
  { id: 'disney_lorcana', name: 'Disney Lorcana', icon: '✨' },
  { id: 'tcg_other', name: 'Other TCG', icon: '🎴' },
  { id: 'other', name: 'Other', icon: '📦' },
];

async function fetchCategories(shop: string | null): Promise<{ categories: TradeInCategory[] }> {
  const response = await authFetch(`${getApiUrl()}/trade-ins/categories`, shop);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

async function createTradeInBatch(
  shop: string | null,
  data: { member_id: number; category: string; notes?: string }
): Promise<{ id: number; batch_reference: string }> {
  const response = await authFetch(`${getApiUrl()}/trade-ins`, shop, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create trade-in batch');
  return response.json();
}

async function addTradeInItems(
  shop: string | null,
  batchId: number,
  items: Array<{
    product_title?: string;
    trade_value: number;
    market_value?: number;
    notes?: string;
  }>
): Promise<void> {
  const response = await authFetch(`${getApiUrl()}/trade-ins/${batchId}/items`, shop, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error('Failed to add items');
}

interface CompleteBatchResult {
  success: boolean;
  batch_reference: string;
  trade_value: number;
  bonus?: {
    eligible: boolean;
    bonus_amount: number;
    bonus_percent?: number;
    tier_name?: string;
  };
}

async function completeBatch(shop: string | null, batchId: number): Promise<CompleteBatchResult> {
  const response = await authFetch(`${getApiUrl()}/trade-ins/${batchId}/complete`, shop, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to complete batch' }));
    throw new Error(error.error || 'Failed to complete batch');
  }
  return response.json();
}

export function EmbeddedNewTradeIn({ shop }: NewTradeInProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Customer search state (instant search like Add Member modal)
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<ShopifyCustomer | null>(null);
  const [searchResults, setSearchResults] = useState<ShopifyCustomer[]>([]);
  const [searching, setSearching] = useState(false);

  // Fast debounce for instant search feel (like Shopify POS)
  const debouncedSearch = useDebouncedValue(customerSearch, 150);

  // Create new customer mode
  const [createNewMode, setCreateNewMode] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Category state
  const [selectedCategory, setSelectedCategory] = useState('other');

  // Items state
  const [items, setItems] = useState<TradeInItem[]>([
    { id: '1', product_title: '', trade_value: '', market_value: '', notes: '' },
  ]);

  // Notes
  const [batchNotes, setBatchNotes] = useState('');

  // Form state
  const [error, setError] = useState('');

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', shop],
    queryFn: () => fetchCategories(shop),
    enabled: !!shop,
  });

  const categories = categoriesData?.categories?.length
    ? categoriesData.categories
    : DEFAULT_CATEGORIES;

  // Instant search triggered by debounced query (like Shopify POS)
  useEffect(() => {
    const searchCustomers = async () => {
      // Only search if we have at least 2 characters and no customer selected
      if (!debouncedSearch || debouncedSearch.length < 2 || selectedCustomer) {
        if (!selectedCustomer) setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await authFetch(
          `${getApiUrl()}/members/search-shopify?q=${encodeURIComponent(debouncedSearch)}`,
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
    };

    searchCustomers();
  }, [debouncedSearch, shop, selectedCustomer]);

  // Success state for showing completion result
  const [completionResult, setCompletionResult] = useState<CompleteBatchResult | null>(null);

  // Create new Shopify customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!newEmail) throw new Error('Email is required');

      const response = await authFetch(`${getApiUrl()}/members/create-and-enroll`, shop, {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail,
          first_name: newFirstName || undefined,
          last_name: newLastName || undefined,
          phone: newPhone || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create customer');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Set the new customer as selected
      setSelectedCustomer({
        id: data.shopify_customer_id || data.id,
        email: newEmail,
        firstName: newFirstName,
        lastName: newLastName,
        phone: newPhone || null,
        is_member: true,
        member_number: data.member_number,
      });

      // Reset create mode
      setCreateNewMode(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');

      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Create trade-in mutation - auto-enrolls customer if needed, then creates and completes trade-in
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('Please select a customer');

      const validItems = items.filter((item) => item.trade_value && parseFloat(item.trade_value) > 0);
      if (validItems.length === 0) {
        throw new Error('Please add at least one item with a trade value');
      }

      let memberId: number;

      // If customer is already a member, use their member_id
      if (selectedCustomer.is_member && selectedCustomer.member_id) {
        memberId = selectedCustomer.member_id;
      } else {
        // Enroll the customer as a member first
        const enrollResponse = await authFetch(`${getApiUrl()}/members/enroll`, shop, {
          method: 'POST',
          body: JSON.stringify({
            shopify_customer_id: selectedCustomer.id,
          }),
        });

        if (!enrollResponse.ok) {
          const error = await enrollResponse.json();
          throw new Error(error.error || 'Failed to enroll customer');
        }

        const enrollData = await enrollResponse.json();
        memberId = enrollData.id || enrollData.member_id;

        // Update the selected customer to reflect membership
        setSelectedCustomer({
          ...selectedCustomer,
          is_member: true,
          member_id: memberId,
          member_number: enrollData.member_number,
        });
      }

      // Create batch
      const batch = await createTradeInBatch(shop, {
        member_id: memberId,
        category: selectedCategory,
        notes: batchNotes || undefined,
      });

      // Add items
      await addTradeInItems(
        shop,
        batch.id,
        validItems.map((item) => ({
          product_title: item.product_title || undefined,
          trade_value: parseFloat(item.trade_value),
          market_value: item.market_value ? parseFloat(item.market_value) : undefined,
          notes: item.notes || undefined,
        }))
      );

      // Auto-complete batch to issue store credit immediately
      const result = await completeBatch(shop, batch.id);
      return result;
    },
    onSuccess: (result) => {
      setCompletionResult(result);
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: ShopifyCustomer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setSearchResults([]);
  }, []);

  // Clear customer selection
  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setSearchResults([]);
  }, []);

  // Determine if we can create a new customer
  const canCreateNew = newEmail && newEmail.includes('@') && newEmail.includes('.');

  // Add item
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), product_title: '', trade_value: '', market_value: '', notes: '' },
    ]);
  }, []);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }, []);

  // Update item field
  const updateItem = useCallback((id: string, field: keyof TradeInItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  // Calculate totals
  const totalTradeValue = items.reduce((sum, item) => {
    const val = parseFloat(item.trade_value) || 0;
    return sum + val;
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle form submit
  const handleSubmit = useCallback(() => {
    setError('');
    createMutation.mutate();
  }, [createMutation]);

  if (!shop) {
    return (
      <Page title="New Trade-In">
        <Banner tone="warning">
          <p>No shop connected. Please install the app from the Shopify App Store.</p>
        </Banner>
      </Page>
    );
  }

  // Build category choices for ChoiceList
  // IMPORTANT: Filter out null/undefined categories to prevent "Cannot read properties of undefined" errors
  const categoryChoices = categories.filter(cat => cat && cat.id && cat.name).map((cat) => ({
    label: `${cat.icon || ''} ${cat.name}`,
    value: cat.id,
  }));

  return (
    <Page
      title="New Trade-In"
      subtitle="Create a new trade-in batch for a customer"
      backAction={{ content: 'Trade-Ins', onAction: () => navigate('/app/trade-ins') }}
      primaryAction={{
        content: `Complete Trade-In & Issue ${formatCurrency(totalTradeValue)}`,
        onAction: handleSubmit,
        loading: createMutation.isPending,
        disabled: !selectedCustomer || totalTradeValue <= 0,
      }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError('')}>
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Warning when no customer selected but items added */}
        {!selectedCustomer && totalTradeValue > 0 && (
          <Layout.Section>
            <Banner tone="warning" icon={AlertCircleIcon}>
              <p>Please select a customer before creating the trade-in. Search for an existing customer or create a new one.</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Step 1: Select Customer */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="info">1</Badge>
                <Text as="h2" variant="headingMd">Select Customer</Text>
              </InlineStack>

              {selectedCustomer ? (
                <Box
                  padding="400"
                  background="bg-surface-success"
                  borderRadius="200"
                  borderColor="border-success"
                  borderWidth="025"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Box
                        padding="200"
                        background="bg-fill-success"
                        borderRadius="full"
                      >
                        <Icon source={CheckIcon} tone="success" />
                      </Box>
                      <BlockStack gap="050">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim() || selectedCustomer.email}
                          </Text>
                          {selectedCustomer.is_member && (
                            <Badge tone="success" size="small">Member</Badge>
                          )}
                        </InlineStack>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {selectedCustomer.email}
                          {selectedCustomer.is_member && selectedCustomer.member_number && ` · ${selectedCustomer.member_number}`}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    <Button variant="plain" onClick={clearCustomer}>
                      Change
                    </Button>
                  </InlineStack>
                </Box>
              ) : createNewMode ? (
                <BlockStack gap="400">
                  <Banner tone="info">
                    <Text as="p">
                      Create a new customer in Shopify. They will be automatically enrolled in your loyalty program.
                    </Text>
                  </Banner>

                  <FormLayout>
                    <TextField
                      label="Email"
                      type="email"
                      value={newEmail}
                      onChange={setNewEmail}
                      autoComplete="email"
                      placeholder="customer@example.com"
                      requiredIndicator
                      error={newEmail && !canCreateNew ? 'Please enter a valid email' : undefined}
                    />

                    <FormLayout.Group>
                      <TextField
                        label="First Name"
                        value={newFirstName}
                        onChange={setNewFirstName}
                        autoComplete="given-name"
                        placeholder="John"
                      />
                      <TextField
                        label="Last Name"
                        value={newLastName}
                        onChange={setNewLastName}
                        autoComplete="family-name"
                        placeholder="Doe"
                      />
                    </FormLayout.Group>

                    <TextField
                      label="Phone (optional)"
                      type="tel"
                      value={newPhone}
                      onChange={setNewPhone}
                      autoComplete="tel"
                      placeholder="+1 555-123-4567"
                    />
                  </FormLayout>

                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      onClick={() => createCustomerMutation.mutate()}
                      loading={createCustomerMutation.isPending}
                      disabled={!canCreateNew}
                    >
                      Create Customer
                    </Button>
                    <Button
                      variant="plain"
                      onClick={() => {
                        setCreateNewMode(false);
                        setNewEmail('');
                        setNewFirstName('');
                        setNewLastName('');
                        setNewPhone('');
                      }}
                    >
                      Back to Search
                    </Button>
                  </InlineStack>
                </BlockStack>
              ) : (
                <BlockStack gap="300">
                  <TextField
                    label="Search Shopify Customers"
                    labelHidden
                    value={customerSearch}
                    onChange={setCustomerSearch}
                    placeholder="Type to search by name, email, or phone..."
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setCustomerSearch('')}
                    prefix={<Icon source={SearchIcon} />}
                    suffix={searching ? <Spinner size="small" /> : null}
                    helpText={customerSearch.length > 0 && customerSearch.length < 2 ? "Type at least 2 characters" : undefined}
                  />

                  {searchResults.length > 0 ? (
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Search Results ({searchResults.length})
                      </Text>
                      {searchResults.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomerSelect(customer)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Box
                            padding="300"
                            background="bg-surface-secondary"
                            borderRadius="200"
                          >
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" fontWeight="semibold">
                                    {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown'}
                                  </Text>
                                  {customer.is_member && (
                                    <Badge tone="success" size="small">{`Member ${customer.member_number || ''}`}</Badge>
                                  )}
                                </InlineStack>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {customer.email}
                                </Text>
                              </BlockStack>
                              <BlockStack gap="050" inlineAlign="end">
                                <InlineStack gap="200">
                                  <Text as="span" variant="bodySm">
                                    {customer.numberOfOrders || customer.ordersCount || 0} orders
                                  </Text>
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    ${Number(customer.amountSpent || customer.totalSpent || 0).toFixed(2)} spent
                                  </Text>
                                </InlineStack>
                                {(customer.storeCredit ?? 0) > 0 && (
                                  <Badge tone="info" size="small">
                                    {`$${Number(customer.storeCredit).toFixed(2)} credit`}
                                  </Badge>
                                )}
                              </BlockStack>
                            </InlineStack>
                          </Box>
                        </div>
                      ))}

                      <Divider />
                      <Button
                        variant="plain"
                        onClick={() => setCreateNewMode(true)}
                      >
                        Or create a new customer
                      </Button>
                    </BlockStack>
                  ) : debouncedSearch.length >= 2 && !searching ? (
                    <BlockStack gap="300">
                      <Banner tone="info">
                        <Text as="p">No customers found matching "{debouncedSearch}"</Text>
                      </Banner>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setCreateNewMode(true);
                          // Pre-fill email if search query looks like an email
                          if (customerSearch.includes('@')) {
                            setNewEmail(customerSearch);
                          }
                        }}
                        fullWidth
                      >
                        Create New Customer
                      </Button>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="300">
                      <Text as="p" tone="subdued" alignment="center">
                        {searching ? (
                          <InlineStack gap="200" align="center">
                            <Spinner size="small" />
                            <span>Searching...</span>
                          </InlineStack>
                        ) : (
                          'Start typing to search for Shopify customers, or create a new customer.'
                        )}
                      </Text>
                      <Button
                        variant="plain"
                        onClick={() => setCreateNewMode(true)}
                      >
                        Create new customer instead
                      </Button>
                    </BlockStack>
                  )}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Step 2: Select Category */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="info">2</Badge>
                <Text as="h2" variant="headingMd">Category</Text>
              </InlineStack>

              <ChoiceList
                title="Select category"
                titleHidden
                choices={categoryChoices}
                selected={[selectedCategory]}
                onChange={(value) => setSelectedCategory(value[0])}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Step 3: Add Items */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="info">3</Badge>
                  <Text as="h2" variant="headingMd">Items</Text>
                </InlineStack>
                <Button icon={PlusIcon} onClick={addItem}>
                  Add Item
                </Button>
              </InlineStack>

              <BlockStack gap="300">
                {items.map((item, index) => (
                  <Box
                    key={item.id}
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm" tone="subdued">
                          Item {index + 1}
                        </Text>
                        {items.length > 1 && (
                          <Button
                            icon={DeleteIcon}
                            variant="plain"
                            tone="critical"
                            onClick={() => removeItem(item.id)}
                            accessibilityLabel="Remove item"
                          />
                        )}
                      </InlineStack>

                      <FormLayout>
                        <FormLayout.Group>
                          <TextField
                            label="Product Title"
                            value={item.product_title}
                            onChange={(value) => updateItem(item.id, 'product_title', value)}
                            placeholder="Card name, set, etc."
                            autoComplete="off"
                          />
                        </FormLayout.Group>
                        <FormLayout.Group condensed>
                          <TextField
                            label="Trade Value"
                            type="number"
                            value={item.trade_value}
                            onChange={(value) => updateItem(item.id, 'trade_value', value)}
                            prefix="$"
                            placeholder="0.00"
                            autoComplete="off"
                            requiredIndicator
                          />
                          <TextField
                            label="Market Value"
                            type="number"
                            value={item.market_value}
                            onChange={(value) => updateItem(item.id, 'market_value', value)}
                            prefix="$"
                            placeholder="0.00"
                            autoComplete="off"
                          />
                        </FormLayout.Group>
                      </FormLayout>
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>

              <Divider />

              <Box padding="400" background="bg-surface-info" borderRadius="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    Total Trade Value
                  </Text>
                  <Text as="span" variant="headingLg" fontWeight="bold">
                    {formatCurrency(totalTradeValue)}
                  </Text>
                </InlineStack>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Step 4: Notes */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Badge>4</Badge>
                <Text as="h2" variant="headingMd">Notes (Optional)</Text>
              </InlineStack>

              <TextField
                label="Batch Notes"
                labelHidden
                value={batchNotes}
                onChange={setBatchNotes}
                multiline={3}
                placeholder="Add any notes about this trade-in..."
                autoComplete="off"
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Mobile Submit Button */}
        <Layout.Section>
          <InlineStack align="end" gap="300">
            <Button url="/app/trade-ins">Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={createMutation.isPending}
              disabled={!selectedCustomer || totalTradeValue <= 0}
            >
              Complete Trade-In & Issue {formatCurrency(totalTradeValue)}
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>

      {/* Success Modal - Shows after trade-in is completed */}
      <Modal
        open={!!completionResult}
        onClose={() => navigate('/app/trade-ins')}
        title="Trade-In Complete!"
        primaryAction={{
          content: 'View Trade-Ins',
          onAction: () => navigate('/app/trade-ins'),
        }}
        secondaryActions={[
          {
            content: 'Create Another',
            onAction: () => {
              setCompletionResult(null);
              setSelectedCustomer(null);
              setItems([{ id: '1', product_title: '', trade_value: '', market_value: '', notes: '' }]);
              setBatchNotes('');
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="success">
              <p>Trade-in {completionResult?.batch_reference} has been completed and store credit has been issued.</p>
            </Banner>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="span" tone="subdued">Trade Value</Text>
                  <Text as="span" fontWeight="semibold">{formatCurrency(completionResult?.trade_value || 0)}</Text>
                </InlineStack>

                {completionResult?.bonus?.eligible && (completionResult?.bonus?.bonus_amount || 0) > 0 && (
                  <>
                    <Divider />
                    <InlineStack align="space-between">
                      <Text as="span" tone="subdued">
                        Tier Bonus ({completionResult?.bonus?.tier_name} +{completionResult?.bonus?.bonus_percent}%)
                      </Text>
                      <Badge tone="success">{String(`+${formatCurrency(completionResult?.bonus?.bonus_amount || 0)}`)}</Badge>
                    </InlineStack>
                  </>
                )}

                <Divider />

                <InlineStack align="space-between">
                  <Text as="span" fontWeight="bold">Total Store Credit Issued</Text>
                  <Text as="span" fontWeight="bold" tone="success">
                    {formatCurrency(
                      (completionResult?.trade_value || 0) +
                      (completionResult?.bonus?.bonus_amount || 0)
                    )}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              The member's store credit balance has been updated in Shopify.
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
