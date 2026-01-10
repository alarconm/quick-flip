# TradeUp User Stories for Testing

This document contains comprehensive user stories for testing all TradeUp functionality. Use these for manual QA testing and automated browser testing.

---

## 1. ONBOARDING & SETUP

### 1.1 Complete Onboarding Flow
**As a new store owner**, I want to complete the onboarding flow in under 5 minutes, so that I can quickly go live with TradeUp

**Acceptance Criteria:**
- [ ] Onboarding shows 4 steps (app installed, store credit enabled, tiers configured, ready to go)
- [ ] Each step shows status (pending/complete) with clear actions
- [ ] Can skip onboarding and configure manually
- [ ] Can apply pre-built templates (3+ options available)

### 1.2 View Tier Templates
**As a new store owner**, I want to see available tier templates, so that I can quickly set up membership tiers without manual configuration

**Acceptance Criteria:**
- [ ] Can preview tier structure before applying
- [ ] Can see what tiers, prices, and benefits each template includes
- [ ] Templates match store type (collectibles, general retail, etc.)
- [ ] Can still customize after applying template

### 1.3 Verify Store Credit
**As a new store owner**, I want to verify Shopify store credit is enabled, so that I can ensure customers can redeem store credit

**Acceptance Criteria:**
- [ ] Check endpoint returns enabled/not_enabled status
- [ ] If not enabled, provides direct link to Shopify payment settings
- [ ] Shows clear instructions for enabling store credit
- [ ] Retests after merchant enables the feature

### 1.4 Mark Onboarding Complete
**As a new store owner**, I want to mark onboarding complete, so that my loyalty program goes live

**Acceptance Criteria:**
- [ ] Can mark complete even if templates weren't applied
- [ ] Updates tenant settings to reflect completion
- [ ] Subsequent logins show completed state

---

## 2. MEMBER MANAGEMENT

### 2.1 Search for Customers
**As a store staff member**, I want to search for existing Shopify customers by name, email, phone, or partner ID, so that I can enroll them as members

**Acceptance Criteria:**
- [ ] Search requires minimum 2 characters
- [ ] Returns customer enrollment status (already member or not)
- [ ] Shows member number and tier if already enrolled
- [ ] Case-insensitive search
- [ ] Handles special characters in names/emails

### 2.2 Enroll Existing Customer
**As a store staff member**, I want to enroll an existing Shopify customer as a TradeUp member, so that they can start earning rewards

**Acceptance Criteria:**
- [ ] Requires valid Shopify customer ID
- [ ] Generates unique member number (TU1001, TU1002, etc.)
- [ ] Automatically pulls customer name/email/phone from Shopify
- [ ] Can optionally assign tier on enrollment
- [ ] Can optionally assign partner customer ID (e.g., ORB#1050)
- [ ] Returns confirmation with member number and tier
- [ ] Prevents duplicate enrollments (same customer)

### 2.3 Create New Member Manually
**As a store staff member**, I want to manually create a new member with email, name, phone, so that I can enroll customers who may not have Shopify accounts yet

**Acceptance Criteria:**
- [ ] Email is required
- [ ] Name and phone are optional
- [ ] Can optionally assign tier and Shopify customer ID
- [ ] Generates unique member number
- [ ] Email must be unique per tenant

### 2.4 Update Member Details
**As a store staff member**, I want to update member details (name, email, phone, status, notes), so that I can keep member information current

**Acceptance Criteria:**
- [ ] Can update any allowed field
- [ ] Changes reflected immediately in system
- [ ] Email changes validated for uniqueness
- [ ] Audit trail records who changed what and when

### 2.5 List Members with Pagination
**As a store staff member**, I want to list all members with pagination, so that I can manage large member databases

**Acceptance Criteria:**
- [ ] Default 50 members per page, max 100
- [ ] Can filter by status (pending, active, paused, cancelled, expired)
- [ ] Sorted by most recent first
- [ ] Shows member count and page info
- [ ] Can adjust per_page parameter

### 2.6 View Member Details
**As a store staff member**, I want to get a member's full details including stats, so that I can see their membership history and engagement

**Acceptance Criteria:**
- [ ] Shows member number, email, name, phone, tier
- [ ] Shows total bonus earned, total trade-ins, total trade value
- [ ] Shows tier assignment info (who assigned, when, expiration if any)
- [ ] Shows subscription status if applicable

### 2.7 Lookup by Member Number
**As a store staff member**, I want to retrieve a member by their member number (e.g., TU1001), so that I can quickly access member records

**Acceptance Criteria:**
- [ ] Accepts TU prefix or just the number (1001 → TU1001)
- [ ] Supports legacy QF prefix for backward compatibility
- [ ] Returns 404 if member not found
- [ ] Tenant-scoped (only returns members from requesting tenant)

---

## 3. MEMBERSHIP TIERS

### 3.1 Create New Tier
**As a store owner**, I want to create new membership tiers with custom names, pricing, and benefits, so that I can structure my loyalty program

**Acceptance Criteria:**
- [ ] Can specify monthly and yearly pricing (yearly optional)
- [ ] Can set trade-in bonus rate (e.g., 5%, 10%)
- [ ] Can set purchase cashback percentage (e.g., 1%, 2%, 3%)
- [ ] Can set monthly store credit reward amount
- [ ] Can optionally set credit expiration days
- [ ] Can add custom benefits as JSON
- [ ] Sets display order for UI presentation
- [ ] Default tiers auto-seed if none exist

### 3.2 Update Tier Configuration
**As a store owner**, I want to update tier configuration (pricing, benefits, display order), so that I can adjust my tier structure

**Acceptance Criteria:**
- [ ] Can update any tier property
- [ ] Changes apply to new members immediately
- [ ] Can update active status (soft delete)
- [ ] Cannot delete tier if active members use it

### 3.3 Delete Tier (Soft Delete)
**As a store owner**, I want to delete a tier (soft delete), so that I can retire old tier offerings

**Acceptance Criteria:**
- [ ] Sets is_active=False
- [ ] Returns error if active members in tier
- [ ] Tier still visible in history but not available for new assignments

### 3.4 Reorder Tiers
**As a store owner**, I want to reorder tiers for display, so that I can show them in priority order on storefront

**Acceptance Criteria:**
- [ ] Accepts ordered list of tier IDs
- [ ] Updates display_order for each tier
- [ ] Returns reordered tier list

### 3.5 List Active Tiers
**As a store owner**, I want to list all active membership tiers, so that I can view my tier structure

**Acceptance Criteria:**
- [ ] Returns only is_active=True tiers
- [ ] Ordered by display_order
- [ ] Shows all tier details (name, prices, benefits, bonus rates)
- [ ] Shows Shopify selling plan ID if configured

### 3.6 Assign Tier to Single Member
**As a store staff member**, I want to assign a tier to a single member, so that I can grant membership status

**Acceptance Criteria:**
- [ ] Member becomes active upon tier assignment
- [ ] Records who assigned and when
- [ ] Can optionally set tier expiration date
- [ ] Can remove tier by passing tier_id=null
- [ ] Syncs tier tag to Shopify customer tags (tu-{tier_name_lowercase})
- [ ] Returns updated member info

### 3.7 Bulk Tier Assignment
**As a store staff member**, I want to assign the same tier to multiple members at once, so that I can bulk promote members

**Acceptance Criteria:**
- [ ] Accepts array of member IDs and single tier_id
- [ ] Updates all specified members
- [ ] Sets tier_assigned_by and tier_assigned_at
- [ ] Can optionally set expiration for all
- [ ] Returns count of updated members
- [ ] Returns summary of assignment

### 3.8 Process Expired Tiers
**As a store staff member**, I want to process expired tiers automatically, so that time-limited memberships are revoked

**Acceptance Criteria:**
- [ ] Finds all members where tier_expires_at has passed
- [ ] Removes tier from expired members
- [ ] Sets status to inactive
- [ ] Removes Shopify tier tag
- [ ] Returns count of processed memberships
- [ ] Can be called manually or scheduled

### 3.9 View Tier Assignment History
**As a store owner**, I want to see tier assignment history for a member, so that I can audit tier changes

**Acceptance Criteria:**
- [ ] Returns list of all tier changes with timestamps
- [ ] Shows who assigned the tier and reason
- [ ] Shows previous and new tier
- [ ] Paginated (default 20 records)
- [ ] Ordered by most recent first

---

## 4. TRADE-IN MANAGEMENT

### 4.1 Create Trade-In Batch
**As a store staff member**, I want to create a new trade-in batch for a member, so that I can record traded-in items

**Acceptance Criteria:**
- [ ] Can create for member OR guest (non-member)
- [ ] Generates unique batch reference (TI-YYYYMMDD-###)
- [ ] Sets category (sports, pokemon, magic, riftbound, tcg_other, other)
- [ ] Records staff member who created it
- [ ] Sets initial status to "pending"
- [ ] Returns batch with batch_reference

### 4.2 Add Items to Batch
**As a store staff member**, I want to add items to a trade-in batch, so that I can record each individual item being traded in

**Acceptance Criteria:**
- [ ] Each item has product title, SKU, trade value, market value (optional)
- [ ] Can add listing price and listed date later
- [ ] Batch totals automatically update (total_items, total_trade_value)
- [ ] Can add notes to each item
- [ ] Returns updated batch with items

### 4.3 List Trade-In Batches
**As a store staff member**, I want to list all trade-in batches with filtering, so that I can manage trade-ins

**Acceptance Criteria:**
- [ ] Can filter by status (pending, listed, completed, cancelled)
- [ ] Can filter by member_id
- [ ] Can view guest-only trade-ins
- [ ] Supports pagination (default 50, max 100)
- [ ] Shows both member and guest trade-ins
- [ ] Ordered by most recent first

### 4.4 View Trade-In Details
**As a store staff member**, I want to get full trade-in batch details including all items, so that I can see the complete trade-in record

**Acceptance Criteria:**
- [ ] Returns batch info + all items with details
- [ ] Shows trade values, listing prices, sale prices
- [ ] Shows days-to-sell calculation if item has been sold
- [ ] Shows profit calculation if applicable

### 4.5 Complete Trade-In and Issue Credit
**As a store staff member**, I want to complete a trade-in batch and issue bonus credit, so that I can pay the customer

**Acceptance Criteria:**
- [ ] For member trade-ins, calculates tier bonus (e.g., 5% for Gold)
- [ ] Records completion timestamp and staff member
- [ ] Updates member's total_trade_ins and total_trade_value
- [ ] Issues store credit for trade value + bonus
- [ ] Sync credit to Shopify native store credit

### 4.6 Mark Items as Listed
**As a store staff member**, I want to mark items as listed in inventory, so that I can track when items go to sale

**Acceptance Criteria:**
- [ ] Records listing_price and listed_date
- [ ] Updates batch status if all items listed

### 4.7 Mark Items as Sold
**As a store staff member**, I want to mark items as sold and record sale price, so that I can track profit

**Acceptance Criteria:**
- [ ] Records sold_date, sold_price, optionally shopify_order_id
- [ ] Calculates days_to_sell automatically
- [ ] Calculates profit (sold_price - trade_value)

### 4.8 Cancel Trade-In
**As a store staff member**, I want to cancel a trade-in batch, so that I can remove trades that don't happen

**Acceptance Criteria:**
- [ ] Sets status to "cancelled"
- [ ] Prevents credit from being issued
- [ ] Can include cancel reason in notes

---

## 5. STORE CREDIT & PROMOTIONS

### 5.1 Add Manual Credit
**As a store staff member**, I want to add manual store credit to a member, so that I can adjust for special circumstances

**Acceptance Criteria:**
- [ ] Requires amount (positive number)
- [ ] Optional description (defaults to "Manual credit")
- [ ] Can optionally set expiration date
- [ ] Creates ledger entry with source_type='manual'
- [ ] Syncs to Shopify native store credit
- [ ] Returns new balance after transaction

### 5.2 Deduct Credit
**As a store staff member**, I want to deduct store credit from a member, so that I can reverse incorrect credits

**Acceptance Criteria:**
- [ ] Requires amount (positive number)
- [ ] Validates member has sufficient balance
- [ ] Optional description (defaults to "Manual deduction")
- [ ] Returns error if insufficient balance
- [ ] Syncs to Shopify
- [ ] Returns new balance

### 5.3 View Credit Balance
**As a store staff member**, I want to view a member's store credit balance, so that I can see current rewards status

**Acceptance Criteria:**
- [ ] Shows total balance and available balance
- [ ] Shows both local and Shopify balance (if synced)
- [ ] Indicates if balances are in sync
- [ ] Shows currency

### 5.4 View Credit History
**As a store staff member**, I want to view member's credit transaction history, so that I can audit credit activity

**Acceptance Criteria:**
- [ ] Paginated (default 50 records)
- [ ] Shows all transaction types (trade_in, purchase, promotion, adjustment, expiration, redemption)
- [ ] Shows source (trade-in ID, order ID, promotion ID, etc.)
- [ ] Shows running balance after each transaction
- [ ] Shows created_by and created_at
- [ ] Ordered by most recent first

### 5.5 Create Promotion
**As a store owner**, I want to create a promotion with specific bonus types, so that I can run special offers

**Acceptance Criteria:**
- [ ] Can select promo type (trade_in_bonus, purchase_cashback, flat_bonus, multiplier)
- [ ] Can set bonus percentage or flat amount or multiplier
- [ ] Can specify date range (starts_at, ends_at)
- [ ] Can specify daily time window (e.g., 6-9pm) and active days (Mon-Fri)
- [ ] Can restrict to channel (all, in_store, online)
- [ ] Returns confirmation with promotion ID

### 5.6 Create Promotion with Product Filters
**As a store owner**, I want to create a promotion with product filters, so that I can run category-specific bonuses

**Acceptance Criteria:**
- [ ] Can filter by Shopify collections
- [ ] Can filter by vendor (e.g., "Pokemon", "Magic")
- [ ] Can filter by product type (e.g., "Sealed Product", "Singles")
- [ ] Can filter by product tags (e.g., "preorder", "exclusive")
- [ ] Supports multiple filters with AND logic (all must match)
- [ ] All filters optional (null = no restriction)

### 5.7 Create Promotion with Tier Restrictions
**As a store owner**, I want to create a promotion with member tier restrictions, so that I can give exclusive bonuses to premium members

**Acceptance Criteria:**
- [ ] Can restrict to specific tiers (e.g., ["GOLD", "PLATINUM"])
- [ ] Null = applies to all tiers
- [ ] Can set minimum trade value or minimum item count
- [ ] Shows which tiers are eligible

### 5.8 Configure Promotion Limits
**As a store owner**, I want to configure promotion limits, so that I can control promotion budget

**Acceptance Criteria:**
- [ ] Can set max_uses (total across all members)
- [ ] Can set max_uses_per_member
- [ ] Tracks current_uses
- [ ] Returns error if promotion maxed out
- [ ] Null = unlimited

### 5.9 View All Promotions
**As a store owner**, I want to view all active and inactive promotions, so that I can manage my promotion calendar

**Acceptance Criteria:**
- [ ] Lists all promotions with full details
- [ ] Shows promotion type, bonus amount, date range, active status
- [ ] Shows is_active_now (current real-time status)
- [ ] Shows usage counts
- [ ] Filterable by status (active/inactive)

### 5.10 Update/Delete Promotion
**As a store owner**, I want to update or delete a promotion, so that I can adjust offers on the fly

**Acceptance Criteria:**
- [ ] Can modify any promotion field
- [ ] Can deactivate (soft delete) without losing history
- [ ] Changes apply immediately to new transactions

### 5.11 Create Bulk Credit Operation
**As a store owner**, I want to create a bulk credit operation for a specific group, so that I can issue bonuses to multiple members

**Acceptance Criteria:**
- [ ] Can target members by tier
- [ ] Can target members by status
- [ ] Can specify amount per member
- [ ] Shows preview of member count and total amount before executing
- [ ] Can execute or cancel
- [ ] Tracks operation status (pending, processing, completed, failed)

### 5.12 Execute Bulk Credit
**As a store owner**, I want to execute a bulk credit operation, so that I can issue bonuses at scale

**Acceptance Criteria:**
- [ ] Creates ledger entries for each member
- [ ] Creates bulk operation record for audit
- [ ] Shows total amount issued
- [ ] Records who created the operation and when
- [ ] Handles failures gracefully

### 5.13 View Promotion Statistics
**As a store owner**, I want to view promotion statistics, so that I can see how promotions perform

**Acceptance Criteria:**
- [ ] Shows total credit issued from promotions
- [ ] Shows count of transactions using each promotion
- [ ] Shows top performing promotions
- [ ] Shows promotion usage by tier, channel, product category

---

## 6. REFERRAL PROGRAM

### 6.1 Get Referral Code
**As a new member**, I want to receive a unique referral code, so that I can share with friends

**Acceptance Criteria:**
- [ ] Code generated automatically on member creation
- [ ] 8-character alphanumeric code
- [ ] Unique across entire system
- [ ] Returned to member via GET endpoint

### 6.2 View Referral Stats
**As a member**, I want to view my referral code and referral stats, so that I can track my referral earnings

**Acceptance Criteria:**
- [ ] Shows referral code
- [ ] Shows referral_url (customizable by store)
- [ ] Shows referral_count (how many people they've referred)
- [ ] Shows referral_earnings (total credit earned)

### 6.3 Validate Referral Code
**As a new member**, I want to validate a referral code before signup, so that I can confirm the code is valid

**Acceptance Criteria:**
- [ ] Public endpoint (no auth required)
- [ ] Accepts code in request body
- [ ] Returns valid/invalid
- [ ] If valid, shows referrer name and referee credit amount
- [ ] Case-insensitive code matching

### 6.4 Apply Referral Code
**As a new member**, I want to apply a referral code during enrollment, so that I can complete the referral chain

**Acceptance Criteria:**
- [ ] Links new member to referrer
- [ ] Prevents self-referral (can't use own code)
- [ ] Prevents double referral (member already has referrer)
- [ ] Updates referrer's referral_count
- [ ] Issues store credit to both referrer and referee if configured
- [ ] Returns success with credit amounts issued

### 6.5 View Referral Program Stats
**As a store owner**, I want to view referral program statistics, so that I can see how referrals perform

**Acceptance Criteria:**
- [ ] Shows total referrals generated
- [ ] Shows total credit issued for referrals
- [ ] Shows referrer/referee reward amounts
- [ ] Shows top 10 referrers with their referral counts and earnings
- [ ] Shows recent referrals with names and dates

### 6.6 View Referral Program Config
**As a store owner**, I want to view referral program configuration, so that I can see reward amounts and rules

**Acceptance Criteria:**
- [ ] Shows referrer credit amount
- [ ] Shows referee credit amount
- [ ] Shows when credit is granted (signup, first purchase, first trade-in)
- [ ] Shows monthly referral limit
- [ ] Shows credit expiration settings

### 6.7 Public Referral Info
**As a public visitor**, I want to see referral program info on storefront, so that I understand the offer

**Acceptance Criteria:**
- [ ] Public endpoint returns program name, reward amounts, description
- [ ] No auth required
- [ ] Shows what referrer gets and what referee gets

---

## 7. BILLING & SUBSCRIPTIONS

### 7.1 View Available Plans
**As a store owner**, I want to view available subscription plans, so that I can choose the right tier

**Acceptance Criteria:**
- [ ] Lists all plans (Free, Starter, Growth, Pro)
- [ ] Shows pricing, max members, max tiers for each plan
- [ ] Shows features included in each plan
- [ ] Ordered by price

### 7.2 Subscribe to Plan
**As a store owner**, I want to subscribe to a plan, so that I can upgrade from free

**Acceptance Criteria:**
- [ ] Accepts plan key (starter, growth, pro)
- [ ] Validates Shopify connection
- [ ] Returns confirmation URL to redirect for merchant approval
- [ ] Prevents double subscription (returns error if already subscribed)
- [ ] Shows current plan if already subscribed

### 7.3 Cancel Subscription
**As a store owner**, I want to cancel my subscription, so that I can downgrade or stop using paid features

**Acceptance Criteria:**
- [ ] Handles cancellation via Shopify Billing API
- [ ] Updates tenant subscription_active status
- [ ] Records cancellation date
- [ ] Prevents access to plan features after cancellation

---

## 8. CUSTOMER-FACING FEATURES

### 8.1 Customer Account - View Rewards
**As a customer**, I want to view my rewards balance in my Shopify customer account, so that I can see my store credit

**Acceptance Criteria:**
- [ ] Shopify customer account extension shows balance
- [ ] Shows tier (if member)
- [ ] Shows referral code (if member)
- [ ] Shows recent trade-in activity

### 8.2 Customer Account - View Trade-In History
**As a customer**, I want to view my trade-in history, so that I can see what I've traded in

**Acceptance Criteria:**
- [ ] Shows recent trade-ins with dates and amounts
- [ ] Shows items in each batch
- [ ] Shows status (pending, listed, sold, etc.)

### 8.3 Theme Block - Membership Signup
**As a store owner**, I want to add a membership signup block to storefront, so that customers can join loyalty program

**Acceptance Criteria:**
- [ ] Liquid block displays tier options
- [ ] Shows pricing (monthly/yearly)
- [ ] Shows tier benefits
- [ ] Allows customers to sign up

### 8.4 Theme Block - Store Credit Balance
**As a store owner**, I want to add a store credit balance block to storefront, so that members see their credit

**Acceptance Criteria:**
- [ ] Displays current balance (requires authentication)
- [ ] Shows last transaction date
- [ ] Offers link to detailed history

### 8.5 Theme Block - Trade-In CTA
**As a store owner**, I want to add a trade-in CTA block to storefront, so that customers can start trade-ins

**Acceptance Criteria:**
- [ ] Shows trade-in process overview
- [ ] Links to trade-in submission
- [ ] Shows trade-in bonus for tiers

### 8.6 Theme Block - Referral
**As a store owner**, I want to add a referral block to storefront, so that members can share their code

**Acceptance Criteria:**
- [ ] Shows referral code (members only)
- [ ] Shows program rewards
- [ ] Provides share link/copy button

---

## 9. SETTINGS & ADMIN CONFIGURATION

### 9.1 View/Update App Settings
**As a store owner**, I want to view and update app settings, so that I can configure TradeUp behavior

**Acceptance Criteria:**
- [ ] Can update configuration options
- [ ] Changes apply immediately
- [ ] Persisted to tenant settings

### 9.2 View Email Templates
**As a store owner**, I want to view email templates, so that I can customize member communications

**Acceptance Criteria:**
- [ ] Can preview templates (promotion announcement, new arrivals, tier benefits, events)
- [ ] Shows available personalization variables ({member_name}, {member_number}, {tier_name})
- [ ] Can use templates for bulk member emails

---

## 10. BULK OPERATIONS & COMMUNICATIONS

### 10.1 Send Tier Email
**As a store owner**, I want to send email to members in specific tiers, so that I can run targeted campaigns

**Acceptance Criteria:**
- [ ] Can select one or more tier names
- [ ] Can provide subject and message
- [ ] Supports HTML message (optional)
- [ ] Supports personalization variables
- [ ] Preview shows recipient count before sending
- [ ] Returns send results (sent count, failed count)

### 10.2 Preview Email Recipients
**As a store owner**, I want to preview tier email recipients, so that I can verify before sending

**Acceptance Criteria:**
- [ ] Returns member counts by tier
- [ ] Shows total recipients
- [ ] Returns error if no matching tiers found

### 10.3 Use Email Templates
**As a store owner**, I want to use pre-built email templates, so that I can quickly send professional emails

**Acceptance Criteria:**
- [ ] Lists 4+ templates (promotion, new arrivals, events, benefits reminder)
- [ ] Shows template subject and body
- [ ] Can customize template content
- [ ] Can send using customized template

---

## 11. MEMBER IMPORT

### 11.1 Bulk Import Members
**As a store owner**, I want to bulk import members from CSV/Excel, so that I can migrate existing loyalty members

**Acceptance Criteria:**
- [ ] Accepts CSV file with email, name, phone, tier
- [ ] Validates each row before import
- [ ] Reports success/failure for each row
- [ ] Prevents duplicate enrollments
- [ ] Creates member numbers automatically

---

## 12. ANALYTICS & REPORTING

### 12.1 View Dashboard Statistics
**As a store owner**, I want to view dashboard statistics, so that I can understand program performance

**Acceptance Criteria:**
- [ ] Shows total members (by status)
- [ ] Shows active members this month
- [ ] Shows total trade-in volume
- [ ] Shows total credit issued/redeemed
- [ ] Shows promotion performance
- [ ] Shows referral stats
- [ ] Filterable by date range

### 12.2 View Member Analytics
**As a store owner**, I want to view member analytics, so that I can see engagement metrics

**Acceptance Criteria:**
- [ ] Average trade-in value
- [ ] Average credit per member
- [ ] Member lifetime value
- [ ] Activity trends over time

---

## 13. ERROR HANDLING & EDGE CASES

### 13.1 Clear Error Messages
**As any user**, I want to see clear error messages, so that I understand what went wrong

**Acceptance Criteria:**
- [ ] All 4xx errors return descriptive messages
- [ ] Includes actionable suggestions
- [ ] No 500 errors without logging
- [ ] Graceful error handling in list endpoints

### 13.2 Concurrent Operations
**As a staff member**, I want the system to handle concurrent operations safely, so that I can run bulk operations without data corruption

**Acceptance Criteria:**
- [ ] Bulk operations use database transactions
- [ ] All-or-nothing semantics (no partial successes)
- [ ] Proper rollback on errors

### 13.3 Input Validation
**As any user**, I want the system to validate all inputs, so that bad data doesn't corrupt the database

**Acceptance Criteria:**
- [ ] All numeric fields validated as numbers
- [ ] All required fields validated
- [ ] Email addresses validated
- [ ] Dates validated as ISO 8601
- [ ] Percentages validated (0-100)
- [ ] Monetary amounts validated (positive, 2 decimals)

### 13.4 Multi-Tenant Isolation
**As a member**, I want multi-tenant isolation, so that my data isn't leaked to other stores

**Acceptance Criteria:**
- [ ] All queries filtered by tenant_id
- [ ] Can't access members from other tenants
- [ ] Can't view/modify tiers from other tenants
- [ ] Can't see promotions from other tenants

### 13.5 Shopify API Failures
**As the system**, I want to handle Shopify API failures gracefully, so that the app continues working

**Acceptance Criteria:**
- [ ] Graceful degradation if Shopify API is down
- [ ] Retries on temporary failures
- [ ] Local fallback data if needed
- [ ] Clear error messages for Shopify connectivity issues

---

## 14. INTEGRATION TEST SCENARIOS

### Scenario 1: Complete Onboarding Flow
1. User installs app
2. Checks store credit enabled
3. Applies tier template
4. Marks complete
5. Program goes live

### Scenario 2: Enroll and Trade-In
1. Staff searches/enrolls customer
2. Customer trades in items
3. Staff records items
4. Staff completes trade-in
5. Credit issued to member and synced to Shopify

### Scenario 3: Tier Bonus Calculation
1. Create trade-in for Gold member
2. System calculates 5% bonus
3. Issues trade value + bonus as store credit
4. Updates member stats

### Scenario 4: Promotion Application
1. Create Pokemon-only promotion for Gold/Platinum members
2. Member trades in Pokemon cards
3. System applies promotion bonus
4. Member receives credit + bonus

### Scenario 5: Referral Chain
1. Member A gets referral code
2. Member B uses code to sign up
3. Member A gets $10 credit
4. Member B gets $5 credit
5. Both credits appear in history

### Scenario 6: Bulk Credit Operation
1. Create bulk operation for $5 to all active Gold members
2. Preview shows 50 members, $250 total
3. Execute
4. 50 ledger entries created
5. Member balances updated

### Scenario 7: Tier Expiration
1. Assign 30-day tier to member
2. Run expiration job after 31 days
3. Tier removed
4. Status set to inactive
5. Shopify tag removed

### Scenario 8: Store Credit Sync
1. Add store credit via API
2. Verify local balance updated
3. Verify Shopify native credit synced
4. Check member can redeem at checkout

### Scenario 9: Member Email Campaign
1. Create bulk email to Gold tier
2. Preview shows 50 recipients
3. Send email with personalization
4. Verify {member_name}, {member_number}, {tier_name} populated

### Scenario 10: Subscription Upgrade
1. Start with Free plan (50 members max)
2. Enroll 45 members
3. Try to subscribe to Starter
4. Confirm
5. Limit increases to 200 members

---

## Testing Priority

### P0 - Critical Path (Test First)
- Member enrollment
- Trade-in creation and completion
- Store credit issuance
- Tier assignment
- Shopify sync

### P1 - Core Features
- Promotions
- Referrals
- Bulk operations
- Email campaigns

### P2 - Supporting Features
- Analytics
- Settings
- Import/Export
- Theme blocks

### P3 - Edge Cases
- Error handling
- Concurrent operations
- API failures
- Multi-tenant isolation
