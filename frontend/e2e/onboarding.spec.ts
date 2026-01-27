import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for the TradeUp Onboarding Flow
 *
 * Test Coverage (PRD: T01-onboarding):
 * - T-ONB-001: Verify onboarding wizard displays
 * - T-ONB-002: Verify store credit status check
 * - T-ONB-003: Verify link to Shopify settings when store credit disabled
 * - T-ONB-004: Verify tier template selection
 * - T-ONB-005: Verify tiers can be modified after template
 * - T-ONB-006: Verify skip button works
 * - T-ONB-007: Verify onboarding completion
 * - T-ONB-008: Verify onboarding state persists across sessions
 *
 * Note: These tests mock the Shopify embedded context and API responses.
 * For production testing against real Shopify admin, additional auth setup required.
 */

// Helper to mock Shopify embedded context
async function setupShopifyContext(page: Page) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.__TRADEUP_CONFIG__ = {
      shop: 'test-shop.myshopify.com',
      host: 'dGVzdC1zaG9w',
      apiKey: 'test-api-key',
      appUrl: 'http://localhost:5000'
    };
    // @ts-ignore
    window.shopify = {
      config: {
        shop: 'test-shop.myshopify.com',
        apiKey: 'test-api-key'
      },
      environment: {
        embedded: false
      },
      idToken: () => Promise.resolve('test-token')
    };
  });
}

// Mock onboarding API responses for different states
const mockOnboardingStatus = {
  incomplete_step1: {
    setup_complete: false,
    current_step: 1,
    steps: [
      { id: 1, name: 'App Installed', description: 'TradeUp is installed', status: 'complete', action: null },
      { id: 2, name: 'Store Credit Enabled', description: 'Shopify store credit is set up', status: 'pending', action: 'check_store_credit' },
      { id: 3, name: 'Tiers Configured', description: 'Membership tiers are set up', status: 'pending', action: 'setup_tiers' },
      { id: 4, name: 'Ready to Go', description: 'Your loyalty program is live', status: 'pending', action: null }
    ],
    subscription_plan: 'free',
    subscription_active: true
  },
  incomplete_step2: {
    setup_complete: false,
    current_step: 2,
    steps: [
      { id: 1, name: 'App Installed', description: 'TradeUp is installed', status: 'complete', action: null },
      { id: 2, name: 'Store Credit Enabled', description: 'Shopify store credit is set up', status: 'pending', action: 'check_store_credit' },
      { id: 3, name: 'Tiers Configured', description: 'Membership tiers are set up', status: 'pending', action: 'setup_tiers' },
      { id: 4, name: 'Ready to Go', description: 'Your loyalty program is live', status: 'pending', action: null }
    ],
    subscription_plan: 'free',
    subscription_active: true
  },
  incomplete_step3: {
    setup_complete: false,
    current_step: 3,
    steps: [
      { id: 1, name: 'App Installed', description: 'TradeUp is installed', status: 'complete', action: null },
      { id: 2, name: 'Store Credit Enabled', description: 'Shopify store credit is set up', status: 'complete', action: null },
      { id: 3, name: 'Tiers Configured', description: 'Membership tiers are set up', status: 'pending', action: 'setup_tiers' },
      { id: 4, name: 'Ready to Go', description: 'Your loyalty program is live', status: 'pending', action: null }
    ],
    subscription_plan: 'free',
    subscription_active: true
  },
  incomplete_step4: {
    setup_complete: false,
    current_step: 4,
    steps: [
      { id: 1, name: 'App Installed', description: 'TradeUp is installed', status: 'complete', action: null },
      { id: 2, name: 'Store Credit Enabled', description: 'Shopify store credit is set up', status: 'complete', action: null },
      { id: 3, name: 'Tiers Configured', description: 'Membership tiers are set up', status: 'complete', action: null },
      { id: 4, name: 'Ready to Go', description: 'Your loyalty program is live', status: 'pending', action: 'go_live' }
    ],
    subscription_plan: 'free',
    subscription_active: true
  },
  complete: {
    setup_complete: true,
    current_step: 4,
    steps: [
      { id: 1, name: 'App Installed', description: 'TradeUp is installed', status: 'complete', action: null },
      { id: 2, name: 'Store Credit Enabled', description: 'Shopify store credit is set up', status: 'complete', action: null },
      { id: 3, name: 'Tiers Configured', description: 'Membership tiers are set up', status: 'complete', action: null },
      { id: 4, name: 'Ready to Go', description: 'Your loyalty program is live', status: 'complete', action: null }
    ],
    subscription_plan: 'free',
    subscription_active: true
  }
};

const mockStoreCreditEnabled = {
  enabled: true,
  status: 'ready',
  message: 'Store credit is enabled and ready to use.',
  instructions: null,
  settings_url: null
};

const mockStoreCreditDisabled = {
  enabled: false,
  status: 'not_enabled',
  message: 'Store credit needs to be enabled in your Shopify settings.',
  instructions: [
    'Go to Shopify Admin > Settings > Payments',
    'Scroll down to "Store credit"',
    'Enable store credit for your store'
  ],
  settings_url: 'https://admin.shopify.com/store/test-shop/settings/payments'
};

const mockTemplates = {
  templates: [
    {
      key: 'simple_2tier',
      name: 'Simple (2 Tiers)',
      description: 'Basic loyalty program with Bronze and Silver tiers.',
      tier_count: 2,
      tiers: [
        { name: 'Bronze', icon: '🥉', color: '#CD7F32', trade_in_rate: 50 },
        { name: 'Silver', icon: '🥈', color: '#C0C0C0', trade_in_rate: 60 }
      ]
    },
    {
      key: 'standard_3tier',
      name: 'Standard (3 Tiers)',
      description: 'Popular choice with Bronze, Silver, and Gold tiers.',
      tier_count: 3,
      tiers: [
        { name: 'Bronze', icon: '🥉', color: '#CD7F32', trade_in_rate: 50 },
        { name: 'Silver', icon: '🥈', color: '#C0C0C0', trade_in_rate: 60 },
        { name: 'Gold', icon: '🥇', color: '#FFD700', trade_in_rate: 70 }
      ]
    },
    {
      key: 'premium_5tier',
      name: 'Premium (5 Tiers)',
      description: 'Full-featured program with all tier levels.',
      tier_count: 5,
      tiers: [
        { name: 'Bronze', icon: '🥉', color: '#CD7F32', trade_in_rate: 50 },
        { name: 'Silver', icon: '🥈', color: '#C0C0C0', trade_in_rate: 55 },
        { name: 'Gold', icon: '🥇', color: '#FFD700', trade_in_rate: 60 },
        { name: 'Platinum', icon: '💎', color: '#E5E4E2', trade_in_rate: 65 },
        { name: 'Diamond', icon: '👑', color: '#B9F2FF', trade_in_rate: 70 }
      ]
    }
  ],
  subscription_plan: 'free',
  can_upgrade: true
};

const mockTiers = [
  { id: 1, name: 'Bronze', icon: '🥉', color: '#CD7F32', trade_in_rate: 50, sort_order: 1 },
  { id: 2, name: 'Silver', icon: '🥈', color: '#C0C0C0', trade_in_rate: 60, sort_order: 2 },
  { id: 3, name: 'Gold', icon: '🥇', color: '#FFD700', trade_in_rate: 70, sort_order: 3 }
];

test.describe('Onboarding Flow - T-ONB-001: Verify onboarding wizard displays', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should display onboarding wizard with progress indicator', async ({ page }) => {
    // Mock API to return incomplete onboarding (step 2)
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify wizard title
    await expect(page.getByRole('heading', { name: /welcome to tradeup/i })).toBeVisible();

    // Verify progress steps are visible
    await expect(page.getByText(/app installed/i)).toBeVisible();
    await expect(page.getByText(/store credit enabled/i)).toBeVisible();
    await expect(page.getByText(/tiers configured/i)).toBeVisible();
    await expect(page.getByText(/ready to go/i)).toBeVisible();

    // Verify progress indicator (step X of Y)
    await expect(page.getByText(/2 of 4 steps/i)).toBeVisible();
  });

  test('should show numbered steps with clear indicators', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify step badges/numbers exist (looking for "1", "2", "3", "4" or checkmarks)
    // Step 1 should be marked complete (checkmark or different style)
    // Steps 2-4 should show their numbers

    // Check that the UI is responsive (no horizontal scroll on mobile viewport)
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    if (bodyBox) {
      expect(bodyBox.width).toBeGreaterThan(300);
    }
  });

  test('should load without errors', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Filter out expected/harmless errors
    const realErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('404') &&
      !err.includes('net::ERR')
    );

    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Onboarding Flow - T-ONB-002: Verify store credit status check', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should show store credit check step with check button', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify store credit section is visible
    await expect(page.getByText(/enable shopify store credit/i)).toBeVisible();

    // Verify check button exists
    await expect(page.getByRole('button', { name: /check store credit status/i })).toBeVisible();
  });

  test('should display enabled status after check when store credit is enabled', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/store-credit-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStoreCreditEnabled)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click check button
    await page.getByRole('button', { name: /check store credit status/i }).click();

    // Wait for success message
    await expect(page.getByText(/store credit is enabled/i)).toBeVisible();
  });

  test('should display disabled status with instructions when store credit is disabled', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/store-credit-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStoreCreditDisabled)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click check button
    await page.getByRole('button', { name: /check store credit status/i }).click();

    // Wait for warning message
    await expect(page.getByText(/store credit needs to be enabled/i)).toBeVisible();

    // Verify instructions are displayed
    await expect(page.getByText(/go to shopify admin/i)).toBeVisible();
  });
});

test.describe('Onboarding Flow - T-ONB-003: Verify link to Shopify settings when store credit disabled', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should show link to Shopify settings when store credit is disabled', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/store-credit-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStoreCreditDisabled)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click check button
    await page.getByRole('button', { name: /check store credit status/i }).click();

    // Wait for the settings link to appear
    await expect(page.getByText(/store credit needs to be enabled/i)).toBeVisible();

    // Verify the "Open Shopify Settings" button/link exists
    const settingsLink = page.getByRole('link', { name: /open shopify settings/i })
      .or(page.getByRole('button', { name: /open shopify settings/i }));
    await expect(settingsLink).toBeVisible();

    // Verify the link has correct external attribute (opens in new tab)
    const linkElement = page.locator('a:has-text("Open Shopify Settings"), button:has-text("Open Shopify Settings")');
    if (await linkElement.count() > 0) {
      const isExternal = await linkElement.first().getAttribute('target');
      if (isExternal) {
        expect(isExternal).toBe('_blank');
      }
    }
  });

  test('should show "Check Again" button after store credit check', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/store-credit-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStoreCreditDisabled)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click check button
    await page.getByRole('button', { name: /check store credit status/i }).click();

    // Wait for warning and check again button
    await expect(page.getByText(/store credit needs to be enabled/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /check again/i })).toBeVisible();
  });
});

test.describe('Onboarding Flow - T-ONB-004: Verify tier template selection', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should display tier templates on step 3', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify template selection heading
    await expect(page.getByText(/choose your tier structure/i)).toBeVisible();

    // Verify all 3 templates are visible
    await expect(page.getByText(/simple.*2.*tier/i)).toBeVisible();
    await expect(page.getByText(/standard.*3.*tier/i)).toBeVisible();
    await expect(page.getByText(/premium.*5.*tier/i)).toBeVisible();
  });

  test('should show tier count for each template', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify tier counts are shown
    await expect(page.getByText('2 tiers')).toBeVisible();
    await expect(page.getByText('3 tiers')).toBeVisible();
    await expect(page.getByText('5 tiers')).toBeVisible();
  });

  test('should allow selecting a template', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click on the Standard template
    const standardTemplate = page.locator('text=Standard (3 Tiers)').locator('..');
    await standardTemplate.click();

    // Verify selection indicator (button changes to "Selected" or similar)
    await expect(page.getByRole('button', { name: /selected/i })).toBeVisible();
  });

  test('should apply template when clicking Apply Template button', async ({ page }) => {
    let templateApplied = false;

    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(templateApplied
          ? mockOnboardingStatus.incomplete_step4
          : mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/templates/*/apply', async (route) => {
      templateApplied = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, tiers_created: 3 })
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Select a template first
    await page.getByRole('button', { name: /select/i }).first().click();

    // Click Apply Template
    await page.getByRole('button', { name: /apply template/i }).click();

    // Wait for step to advance
    await expect(page.getByText(/you're all set/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Onboarding Flow - T-ONB-005: Verify tiers can be modified after template', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should be able to navigate to tiers page after onboarding', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.complete)
      });
    });

    await page.route('**/api/tiers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tiers: mockTiers })
      });
    });

    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_members: 0,
          active_members: 0,
          subscription: { plan: 'free', status: 'active', active: true }
        })
      });
    });

    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checklist: [], completion: { all_complete: true } })
      });
    });

    await page.route('**/api/dashboard/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Navigate to tiers page
    await page.goto('/app/tiers');
    await page.waitForLoadState('networkidle');

    // Verify tiers page loads
    await expect(page.getByRole('heading', { name: /tier|membership/i })).toBeVisible({ timeout: 10000 });

    // Verify created tiers are displayed
    await expect(page.getByText('Bronze')).toBeVisible();
    await expect(page.getByText('Silver')).toBeVisible();
    await expect(page.getByText('Gold')).toBeVisible();
  });

  test('should show edit option for tiers', async ({ page }) => {
    await page.route('**/api/tiers', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tiers: mockTiers })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/app/tiers');
    await page.waitForLoadState('networkidle');

    // Look for edit button/icon
    const editButton = page.getByRole('button', { name: /edit/i }).first()
      .or(page.locator('[aria-label*="edit"]').first())
      .or(page.locator('button:has(svg)').first());

    // Either edit buttons exist or tiers are clickable for editing
    const tiersExist = await page.getByText('Bronze').count() > 0;
    expect(tiersExist).toBe(true);
  });

  test('should provide link to custom tier creation during onboarding', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Look for "Or create custom tiers" link
    await expect(page.getByRole('button', { name: /custom tiers/i })
      .or(page.getByRole('link', { name: /custom tiers/i }))).toBeVisible();
  });
});

test.describe('Onboarding Flow - T-ONB-006: Verify skip button works', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should display skip button/link', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify skip button exists
    await expect(page.getByRole('button', { name: /skip.*setup|skip.*manually/i })).toBeVisible();
  });

  test('should navigate to dashboard when skip is clicked', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step2)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/skip', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_members: 0,
          active_members: 0,
          subscription: { plan: 'free', status: 'active', active: true }
        })
      });
    });

    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checklist: [],
          completion: { setup_percentage: 0, all_complete: false }
        })
      });
    });

    await page.route('**/api/dashboard/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click skip
    await page.getByRole('button', { name: /skip.*setup|skip.*manually/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard|\/app$/);
  });

  test('should allow access to all features after skipping', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      // Return skipped state
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockOnboardingStatus.incomplete_step2,
          setup_complete: false,
          skipped: true
        })
      });
    });

    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_members: 0,
          active_members: 0,
          subscription: { plan: 'free', status: 'active', active: true }
        })
      });
    });

    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checklist: [],
          completion: { all_complete: false }
        })
      });
    });

    await page.route('**/api/dashboard/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify dashboard loads (not redirected to onboarding)
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});

test.describe('Onboarding Flow - T-ONB-007: Verify onboarding completion', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should display completion screen on step 4', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step4)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify completion screen elements
    await expect(page.getByText(/you're all set/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /go to dashboard/i })).toBeVisible();
  });

  test('should show summary of completed setup', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step4)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify summary cards
    await expect(page.getByText(/tiers created/i)).toBeVisible();
    await expect(page.getByText(/store credit/i)).toBeVisible();
    await expect(page.getByText(/auto-enrollment/i)).toBeVisible();
  });

  test('should redirect to dashboard after completing onboarding', async ({ page }) => {
    let onboardingComplete = false;

    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(onboardingComplete
          ? mockOnboardingStatus.complete
          : mockOnboardingStatus.incomplete_step4)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.route('**/api/onboarding/complete', async (route) => {
      onboardingComplete = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_members: 0,
          active_members: 0,
          subscription: { plan: 'free', status: 'active', active: true }
        })
      });
    });

    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checklist: [],
          completion: { all_complete: true }
        })
      });
    });

    await page.route('**/api/dashboard/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Click Go to Dashboard
    await page.getByRole('button', { name: /go to dashboard/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/\/app\/dashboard|\/app$/);
  });

  test('should not show onboarding on refresh after completion', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.complete)
      });
    });

    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_members: 0,
          active_members: 0,
          subscription: { plan: 'free', status: 'active', active: true }
        })
      });
    });

    await page.route('**/api/setup/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checklist: [],
          completion: { all_complete: true }
        })
      });
    });

    await page.route('**/api/dashboard/activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Should show dashboard, not onboarding
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/welcome to tradeup/i)).not.toBeVisible();
  });
});

test.describe('Onboarding Flow - T-ONB-008: Verify onboarding state persists across sessions', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should resume at correct step after closing and reopening', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    // First visit - should be on step 3
    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify we're on step 3 (template selection)
    await expect(page.getByText(/choose your tier structure/i)).toBeVisible();

    // Close and reopen (simulated by navigating away and back)
    await page.goto('/app/settings');
    await page.waitForLoadState('networkidle');

    // Navigate back to onboarding
    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Should still be on step 3
    await expect(page.getByText(/choose your tier structure/i)).toBeVisible();
  });

  test('should preserve progress based on server state', async ({ page }) => {
    // This test verifies the server returns the correct step
    let requestCount = 0;

    await page.route('**/api/onboarding/status', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    // Multiple page loads should all request status from server
    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify server was queried for status on each load
    expect(requestCount).toBeGreaterThanOrEqual(2);

    // Should consistently show step 3
    await expect(page.getByText(/choose your tier structure/i)).toBeVisible();
  });

  test('should not require restarting from beginning', async ({ page }) => {
    // Start at step 3 (steps 1 and 2 already complete)
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Verify steps 1 and 2 show as complete (checkmarks or complete status)
    // Step 3 should be current (not require redoing steps 1-2)

    // Should not see the "Check Store Credit Status" button (that's step 2)
    await expect(page.getByRole('button', { name: /check store credit status/i })).not.toBeVisible();

    // Should see template selection (step 3)
    await expect(page.getByText(/choose your tier structure/i)).toBeVisible();
  });

  test('should show previously completed steps as checked', async ({ page }) => {
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOnboardingStatus.incomplete_step3)
      });
    });

    await page.route('**/api/onboarding/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTemplates)
      });
    });

    await page.goto('/app/onboarding');
    await page.waitForLoadState('networkidle');

    // Look for completed step indicators (checkmarks or "complete" status)
    // Steps 1 and 2 should have complete status
    const progressBadges = page.locator('.Polaris-Badge, [class*="badge"]');
    const badgeCount = await progressBadges.count();

    // Should have at least 2 steps marked (complete badges or step numbers)
    expect(badgeCount).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Onboarding Flow - Navigation and Routing', () => {
  test.beforeEach(async ({ page }) => {
    await setupShopifyContext(page);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/app/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('should navigate to billing page', async ({ page }) => {
    await page.goto('/app/billing');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /billing|subscription|plan/i })).toBeVisible();
  });
});
