/**
 * TradeUp Rewards - Customer Account Extension
 *
 * Displays member tier status, store credit balance, and trade-in history
 * in the Shopify customer account page.
 */
import {
  reactExtension,
  useApi,
  useCustomer,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Divider,
  Icon,
  Heading,
  SkeletonText,
  Banner,
  List,
  ListItem,
  Link,
  useSettings,
} from '@shopify/ui-extensions-react/customer-account';
import { useState, useEffect } from 'react';

// Extension entry point
export default reactExtension(
  'customer-account.order-index.block.render',
  () => <TradeUpRewards />
);

// Also render in profile
reactExtension(
  'customer-account.profile.block.render',
  () => <TradeUpRewards />
);

function TradeUpRewards() {
  const { shop, sessionToken } = useApi();
  const customer = useCustomer();
  const settings = useSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!customer?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get session token for authenticated request
        const token = await sessionToken.get();

        // Extract numeric customer ID from GID
        const customerId = customer.id.replace('gid://shopify/Customer/', '');

        // Fetch member data from TradeUp API
        const response = await fetch(
          `https://app.cardflowlabs.com/api/customer/extension/data`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Shop-Domain': shop.domain,
            },
            body: JSON.stringify({
              customer_id: customerId,
              shop: shop.domain,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch rewards data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('TradeUp Extension Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [customer?.id, sessionToken, shop.domain]);

  // Loading state
  if (loading) {
    return (
      <Card>
        <BlockStack spacing="loose">
          <Heading level={2}>TradeUp Rewards</Heading>
          <SkeletonText lines={3} />
        </BlockStack>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <Banner status="warning" title="Could not load rewards">
          <Text>Unable to load your rewards information. Please try again later.</Text>
        </Banner>
      </Card>
    );
  }

  // Not a member
  if (!data?.is_member) {
    return (
      <Card>
        <BlockStack spacing="loose">
          <Heading level={2}>TradeUp Rewards</Heading>
          <Text>
            Join our rewards program to earn bonus store credit on trade-ins!
          </Text>
          <Text appearance="subdued">
            Make a purchase to automatically enroll.
          </Text>
        </BlockStack>
      </Card>
    );
  }

  // Member view
  const { member, stats, recent_trade_ins } = data;

  return (
    <Card>
      <BlockStack spacing="loose">
        {/* Header */}
        <InlineStack spacing="loose" blockAlignment="center">
          <Heading level={2}>TradeUp Rewards</Heading>
          {member.tier && (
            <Badge tone="success">{member.tier.name}</Badge>
          )}
        </InlineStack>

        <Divider />

        {/* Member Info */}
        <BlockStack spacing="tight">
          <InlineStack spacing="base" blockAlignment="center">
            <Text appearance="subdued">Member #:</Text>
            <Text emphasis="bold">{member.member_number}</Text>
          </InlineStack>

          {member.tier && (
            <InlineStack spacing="base" blockAlignment="center">
              <Text appearance="subdued">Trade-in Bonus:</Text>
              <Text emphasis="bold" tone="success">
                {member.tier.bonus_percent}%
              </Text>
            </InlineStack>
          )}
        </BlockStack>

        <Divider />

        {/* Stats */}
        <BlockStack spacing="tight">
          <Text emphasis="bold">Your Stats</Text>

          <InlineStack spacing="loose">
            <BlockStack spacing="extraTight">
              <Text appearance="subdued" size="small">Store Credit</Text>
              <Text emphasis="bold" size="large">
                ${stats.store_credit_balance.toFixed(2)}
              </Text>
            </BlockStack>

            <BlockStack spacing="extraTight">
              <Text appearance="subdued" size="small">Trade-ins</Text>
              <Text emphasis="bold" size="large">
                {stats.total_trade_ins}
              </Text>
            </BlockStack>

            <BlockStack spacing="extraTight">
              <Text appearance="subdued" size="small">Bonus Earned</Text>
              <Text emphasis="bold" size="large" tone="success">
                ${stats.total_bonus_earned.toFixed(2)}
              </Text>
            </BlockStack>
          </InlineStack>
        </BlockStack>

        {/* Trade-in History */}
        {settings.show_trade_history !== false && recent_trade_ins?.length > 0 && (
          <>
            <Divider />

            <BlockStack spacing="tight">
              <Text emphasis="bold">Recent Trade-ins</Text>

              <List>
                {recent_trade_ins.map((tradeIn) => (
                  <ListItem key={tradeIn.batch_reference}>
                    <InlineStack spacing="loose" blockAlignment="center">
                      <Text>{tradeIn.batch_reference}</Text>
                      <Badge
                        tone={tradeIn.status === 'completed' ? 'success' : 'info'}
                      >
                        {tradeIn.status}
                      </Badge>
                      <Text>${tradeIn.trade_value.toFixed(2)}</Text>
                      {tradeIn.bonus_amount > 0 && (
                        <Text tone="success">
                          +${tradeIn.bonus_amount.toFixed(2)} bonus
                        </Text>
                      )}
                    </InlineStack>
                  </ListItem>
                ))}
              </List>
            </BlockStack>
          </>
        )}

        {/* Tier Benefits */}
        {member.tier?.benefits && Object.keys(member.tier.benefits).length > 0 && (
          <>
            <Divider />

            <BlockStack spacing="tight">
              <Text emphasis="bold">Your {member.tier.name} Benefits</Text>

              <List>
                {member.tier.benefits.discount_percent && (
                  <ListItem>
                    <InlineStack spacing="tight" blockAlignment="center">
                      <Icon source="discount" />
                      <Text>{member.tier.benefits.discount_percent}% discount on purchases</Text>
                    </InlineStack>
                  </ListItem>
                )}
                {member.tier.benefits.free_shipping && (
                  <ListItem>
                    <InlineStack spacing="tight" blockAlignment="center">
                      <Icon source="delivery" />
                      <Text>Free shipping on all orders</Text>
                    </InlineStack>
                  </ListItem>
                )}
                {member.tier.benefits.free_shipping_threshold && (
                  <ListItem>
                    <InlineStack spacing="tight" blockAlignment="center">
                      <Icon source="delivery" />
                      <Text>
                        Free shipping on orders over ${member.tier.benefits.free_shipping_threshold}
                      </Text>
                    </InlineStack>
                  </ListItem>
                )}
              </List>
            </BlockStack>
          </>
        )}
      </BlockStack>
    </Card>
  );
}
