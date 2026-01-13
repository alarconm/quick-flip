# TradeUp Merchant User Stories

> **Total: 200 User Stories**
> **Last Updated:** January 13, 2026
> **Purpose:** Complete feature coverage for Shopify App Store launch

---

## Table of Contents

1. [App Discovery & Installation](#1-app-discovery--installation) (4 stories)
2. [Onboarding & Initial Setup](#2-onboarding--initial-setup) (8 stories)
3. [Billing & Subscription Management](#3-billing--subscription-management) (11 stories)
4. [Member Management](#4-member-management) (17 stories)
5. [Tier System Configuration](#5-tier-system-configuration) (15 stories)
6. [Trade-In Management](#6-trade-in-management) (20 stories)
7. [Store Credit Operations](#7-store-credit-operations) (12 stories)
8. [Points System](#8-points-system) (8 stories)
9. [Rewards Catalog](#9-rewards-catalog) (14 stories)
10. [Referral Program](#10-referral-program) (8 stories)
11. [Bulk Operations](#11-bulk-operations) (6 stories)
12. [Analytics & Reporting](#12-analytics--reporting) (10 stories)
13. [Settings & Configuration](#13-settings--configuration) (22 stories)
14. [Promotions & Tier Rules](#14-promotions--tier-rules) (9 stories)
15. [Shopify Integration](#15-shopify-integration) (7 stories)
16. [Theme Extensions (Storefront)](#16-theme-extensions-storefront) (6 stories)
17. [Customer Account Extension](#17-customer-account-extension) (4 stories)
18. [App Proxy (Customer Rewards Page)](#18-app-proxy-customer-rewards-page) (4 stories)
19. [Day-to-Day Operations](#19-day-to-day-operations) (10 stories)
20. [Error Handling & Support](#20-error-handling--support) (5 stories)

---

## 1. App Discovery & Installation

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-1.1 | **As a** collectibles store owner, **I want to** find a loyalty and trade-in management app in the Shopify App Store **so that** I can modernize my customer retention strategy. | App listing visible in Shopify App Store with correct category tags |
| US-1.2 | **As a** prospective merchant, **I want to** view screenshots, pricing, and feature descriptions **so that** I can determine if the app meets my business needs. | App store listing has screenshots, pricing table, feature list |
| US-1.3 | **As a** merchant, **I want to** click "Install" and authorize the app **so that** it connects to my Shopify store and accesses required data. | OAuth flow completes, app installs, tenant created |
| US-1.4 | **As a** merchant, **I want to** review and approve the permissions TradeUp requests **so that** I understand what store data the app will access. | Permissions screen shows required scopes clearly |

---

## 2. Onboarding & Initial Setup

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-2.1 | **As a** new merchant, **I want to** be guided through a step-by-step setup wizard **so that** I can configure the app correctly without confusion. | Onboarding wizard displays with clear steps |
| US-2.2 | **As a** merchant, **I want to** verify that Shopify store credit is enabled on my store **so that** the app can issue credits to customers. | Store credit check endpoint returns status |
| US-2.3 | **As a** merchant, **I want to** be directed to Shopify settings to enable store credit **so that** I can complete the prerequisite setup. | Link to Shopify settings provided when store credit disabled |
| US-2.4 | **As a** merchant, **I want to** select from pre-built tier templates (2-tier, 3-tier, 5-tier) **so that** I can quickly set up a membership structure. | Template selection UI works, templates apply correctly |
| US-2.5 | **As a** merchant, **I want to** modify the names, pricing, and benefits of template tiers **so that** they match my brand and business model. | Tiers editable after template applied |
| US-2.6 | **As an** experienced merchant, **I want to** skip the onboarding wizard **so that** I can configure everything manually at my own pace. | Skip button works, redirects to dashboard |
| US-2.7 | **As a** merchant, **I want to** mark onboarding as complete **so that** I can access the full dashboard and start using the app. | Completion marks tenant as onboarded |
| US-2.8 | **As a** merchant, **I want to** resume onboarding where I left off **so that** I can complete setup across multiple sessions. | Onboarding state persists, resumes correctly |

---

## 3. Billing & Subscription Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-3.1 | **As a** merchant, **I want to** see all subscription plans with features and limits **so that** I can choose the right plan for my business. | Plans endpoint returns all 4 plans with details |
| US-3.2 | **As a** merchant, **I want to** use the Free plan (50 members, 2 tiers) **so that** I can test the app before committing financially. | Free plan enforces limits correctly |
| US-3.3 | **As a** growing merchant, **I want to** subscribe to Starter ($19/mo, 200 members) **so that** I can access trade-in management and more tiers. | Starter subscription creates Shopify charge |
| US-3.4 | **As a** scaling merchant, **I want to** subscribe to Growth ($49/mo, 1,000 members) **so that** I can unlock bulk operations and advanced analytics. | Growth subscription creates Shopify charge |
| US-3.5 | **As a** high-volume merchant, **I want to** subscribe to Pro ($99/mo, unlimited) **so that** I have no limits on members or tiers. | Pro subscription creates Shopify charge |
| US-3.6 | **As a** merchant, **I want to** start a 7-day free trial of a paid plan **so that** I can evaluate premium features risk-free. | Trial period tracked, features unlocked |
| US-3.7 | **As a** merchant, **I want to** upgrade my plan immediately **so that** I can access higher limits when I hit capacity. | Upgrade flow works mid-cycle |
| US-3.8 | **As a** merchant, **I want to** downgrade to a lower plan at billing cycle end **so that** I can reduce costs if my usage decreases. | Downgrade scheduled for cycle end |
| US-3.9 | **As a** merchant, **I want to** cancel my subscription **so that** I stop being charged if I no longer need the app. | Cancel endpoint works, subscription ends |
| US-3.10 | **As a** merchant, **I want to** see my payment history and invoices **so that** I can track expenses and reconcile accounting. | Billing history accessible |
| US-3.11 | **As a** merchant, **I want to** be notified when I'm approaching plan limits **so that** I can upgrade before hitting capacity. | Usage warnings displayed at 80%, 90%, 100% |

---

## 4. Member Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-4.1 | **As a** merchant, **I want to** see a paginated list of all loyalty members **so that** I can manage my customer base. | GET /api/members returns paginated list |
| US-4.2 | **As a** merchant, **I want to** search members by name, email, phone, or member number **so that** I can quickly find specific customers. | Search query parameter works |
| US-4.3 | **As a** merchant, **I want to** filter members by their tier assignment **so that** I can see all Gold members, for example. | Tier filter works |
| US-4.4 | **As a** merchant, **I want to** filter by active/cancelled/suspended status **so that** I can manage member lifecycle. | Status filter works |
| US-4.5 | **As a** merchant, **I want to** search my Shopify customers and enroll them as members **so that** I can add existing customers to the loyalty program. | Shopify customer search works, enrollment creates member |
| US-4.6 | **As a** merchant, **I want to** create a new customer record and enroll them simultaneously **so that** I can sign up walk-in customers at POS. | Create-and-enroll endpoint works |
| US-4.7 | **As a** merchant, **I want to** view a member's full profile including tier, trade-ins, credit balance, and history **so that** I can understand their engagement. | Member detail page shows all data |
| US-4.8 | **As a** merchant, **I want to** update member name, email, phone, and notes **so that** I can keep records accurate. | PUT /api/members/{id} works |
| US-4.9 | **As a** merchant, **I want to** add external partner IDs (e.g., ORB#) to members **so that** I can cross-reference with other systems. | Partner ID field saves correctly |
| US-4.10 | **As a** merchant, **I want to** manually change a member's tier **so that** I can upgrade loyal customers or fix assignment errors. | Manual tier assignment works |
| US-4.11 | **As a** merchant, **I want to** see when and why a member's tier changed **so that** I can audit membership changes. | Tier history endpoint returns changes |
| US-4.12 | **As a** merchant, **I want to** suspend a member's account **so that** they temporarily lose access to benefits. | Suspend status change works |
| US-4.13 | **As a** merchant, **I want to** reactivate a suspended member **so that** they can resume using their benefits. | Reactivate status change works |
| US-4.14 | **As a** merchant, **I want to** cancel a member's membership **so that** they are removed from the program. | Cancel status change works |
| US-4.15 | **As a** merchant, **I want to** permanently delete a member **so that** I can comply with data deletion requests. | DELETE /api/members/{id} works |
| US-4.16 | **As a** merchant, **I want to** export member data to CSV **so that** I can analyze it externally or backup records. | Export endpoint returns CSV |
| US-4.17 | **As a** merchant, **I want to** see a member's recent activity (trades, purchases, credits) **so that** I can understand their engagement pattern. | Activity feed on member detail |

---

## 5. Tier System Configuration

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-5.1 | **As a** merchant, **I want to** see all configured membership tiers **so that** I can manage my tier structure. | GET /api/tiers returns all tiers |
| US-5.2 | **As a** merchant, **I want to** create a new membership tier with name, pricing, and benefits **so that** I can expand my loyalty program. | POST /api/tiers creates tier |
| US-5.3 | **As a** merchant, **I want to** set a monthly subscription price for a tier **so that** customers can pay monthly. | Monthly price field saves |
| US-5.4 | **As a** merchant, **I want to** set a yearly subscription price (typically discounted) **so that** customers can commit annually. | Yearly price field saves |
| US-5.5 | **As a** merchant, **I want to** set a bonus percentage (e.g., 10%) for trade-ins **so that** tier members get extra credit on trades. | Bonus rate applies to trade-ins |
| US-5.6 | **As a** merchant, **I want to** set a cashback percentage on purchases **so that** members earn credit when they buy. | Cashback percentage saves and applies |
| US-5.7 | **As a** merchant, **I want to** grant a fixed monthly credit amount to tier members **so that** they receive recurring value. | Monthly credit reward field works |
| US-5.8 | **As a** merchant, **I want to** add custom text benefits (e.g., "Early access to new releases") **so that** I can differentiate tiers. | Custom benefits JSON field saves |
| US-5.9 | **As a** merchant, **I want to** modify an existing tier's settings **so that** I can adjust benefits over time. | PUT /api/tiers/{id} works |
| US-5.10 | **As a** merchant, **I want to** drag-and-drop reorder tiers **so that** they display in the correct hierarchy. | Reorder endpoint works |
| US-5.11 | **As a** merchant, **I want to** deactivate a tier (hide from new signups) **so that** I can phase it out without affecting current members. | Active flag toggles correctly |
| US-5.12 | **As a** merchant, **I want to** delete an unused tier **so that** I can clean up my tier structure. | DELETE /api/tiers/{id} works |
| US-5.13 | **As a** merchant, **I want to** see how many members are in each tier **so that** I can understand program composition. | Tier stats show member counts |
| US-5.14 | **As a** merchant, **I want to** configure automatic tier upgrades based on spend or trade-in thresholds **so that** members are rewarded automatically. | Eligibility rules engine works |
| US-5.15 | **As a** merchant, **I want to** assign a tier to multiple members at once **so that** I can migrate customers efficiently. | Bulk assign endpoint works |

---

## 6. Trade-In Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-6.1 | **As a** merchant, **I want to** see all trade-in batches with status and value **so that** I can manage incoming inventory. | GET /api/trade-ins returns list |
| US-6.2 | **As a** merchant, **I want to** filter by pending/approved/listed/completed **so that** I can focus on specific workflow stages. | Status filter works |
| US-6.3 | **As a** merchant, **I want to** filter by category (Pokemon, MTG, Sports Cards) **so that** I can manage by product type. | Category filter works |
| US-6.4 | **As a** merchant, **I want to** start a new trade-in batch for a member **so that** I can record items they're selling. | POST /api/trade-ins creates batch |
| US-6.5 | **As a** merchant, **I want to** create a trade-in for a non-member (guest) **so that** I can accept trades from anyone. | Guest trade-in works |
| US-6.6 | **As a** merchant, **I want to** add individual items with title, SKU, and value **so that** I can itemize the trade. | POST /api/trade-ins/{id}/items works |
| US-6.7 | **As a** merchant, **I want to** set the trade value I'm paying for each item **so that** I can track costs. | Trade value field saves |
| US-6.8 | **As a** merchant, **I want to** record market reference value **so that** I can analyze margins later. | Market value field saves |
| US-6.9 | **As a** merchant, **I want to** add notes about condition or special circumstances **so that** I can document details. | Notes field saves |
| US-6.10 | **As a** merchant, **I want to** see the calculated tier bonus before completing **so that** I can verify the credit amount. | Preview bonus endpoint works |
| US-6.11 | **As a** merchant, **I want to** approve a pending trade-in **so that** it moves to the listing stage. | Approve status change works |
| US-6.12 | **As a** merchant, **I want to** reject a trade-in with reason **so that** I can decline unsuitable submissions. | Reject with reason works |
| US-6.13 | **As a** merchant, **I want to** mark items as listed in Shopify **so that** I can track inventory status. | Listed status change works |
| US-6.14 | **As a** merchant, **I want to** complete a batch and automatically issue store credit **so that** the member receives their payment. | Complete issues credit correctly |
| US-6.15 | **As a** merchant, **I want to** view all items in a batch with values and status **so that** I can review the trade. | Trade-in detail shows items |
| US-6.16 | **As a** merchant, **I want to** modify items or values before completing **so that** I can correct errors. | Edit items before completion works |
| US-6.17 | **As a** merchant, **I want to** search trade-ins by member name or reference number **so that** I can find specific batches. | Search parameter works |
| US-6.18 | **As a** merchant, **I want to** see status change history for a batch **so that** I can audit the workflow. | Timeline/history shown |
| US-6.19 | **As a** merchant, **I want to** auto-approve trade-ins under $X **so that** small trades process automatically. | Auto-approve threshold setting works |
| US-6.20 | **As a** merchant, **I want to** require manual review for trade-ins over $X **so that** I verify large transactions. | Manual review threshold works |

---

## 7. Store Credit Operations

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-7.1 | **As a** merchant, **I want to** see all store credit transactions **so that** I can track credits issued and used. | Credit ledger displays |
| US-7.2 | **As a** merchant, **I want to** manually add credit to a member's account **so that** I can reward them or correct errors. | POST /api/store-credit/add works |
| US-7.3 | **As a** merchant, **I want to** deduct credit from a member **so that** I can correct over-issuance. | POST /api/store-credit/deduct works |
| US-7.4 | **As a** merchant, **I want to** set expiration dates on issued credit **so that** I can encourage timely redemption. | Expiration field saves and enforces |
| US-7.5 | **As a** merchant, **I want to** see a member's current credit balance **so that** I can answer their questions. | Balance displayed on member detail |
| US-7.6 | **As a** merchant, **I want to** see all credit transactions for a specific member **so that** I can audit their account. | Member credit history shows |
| US-7.7 | **As a** merchant, **I want to** filter by trade-in/purchase/referral/manual **so that** I can analyze credit sources. | Event type filter works |
| US-7.8 | **As a** merchant, **I want to** run a store-wide credit event (e.g., "10% credit on all orders today") **so that** I can drive sales. | Bulk credit event runs |
| US-7.9 | **As a** merchant, **I want to** preview how many members and how much credit an event will affect **so that** I can verify before running. | Preview endpoint works |
| US-7.10 | **As a** merchant, **I want to** schedule a credit event for a future date/time **so that** promotions run automatically. | Scheduled events work |
| US-7.11 | **As a** merchant, **I want to** select from event templates (Trade Night, Grand Opening) **so that** I can quickly configure common promotions. | Templates available and apply |
| US-7.12 | **As a** merchant, **I want to** choose how credit is delivered (native store credit, discount codes, gift cards) **so that** it fits my workflow. | Delivery method setting works |

---

## 8. Points System

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-8.1 | **As a** merchant, **I want to** toggle the points system on or off **so that** I can choose whether to use it. | Points toggle in settings works |
| US-8.2 | **As a** merchant, **I want to** set how many points members earn per dollar spent **so that** I control earning velocity. | Points per dollar setting saves |
| US-8.3 | **As a** merchant, **I want to** give higher tiers bonus point multipliers (e.g., Gold = 1.5x) **so that** premium members earn faster. | Tier multipliers apply correctly |
| US-8.4 | **As a** merchant, **I want to** see a member's current points balance **so that** I can answer inquiries. | Points balance displayed |
| US-8.5 | **As a** merchant, **I want to** see all points earned/redeemed by a member **so that** I can audit their account. | Points history endpoint works |
| US-8.6 | **As a** merchant, **I want to** add or remove points from a member **so that** I can correct issues or give bonuses. | Manual points adjustment works |
| US-8.7 | **As a** merchant, **I want to** set points expiration rules (e.g., 365 days) **so that** I encourage redemption. | Points expiration setting works |
| US-8.8 | **As a** merchant, **I want to** award bonus points for signup, referral, or birthday **so that** I incentivize engagement. | Bonus points rules work |

---

## 9. Rewards Catalog

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-9.1 | **As a** merchant, **I want to** see all configured rewards **so that** I can manage what members can redeem. | GET /api/rewards returns list |
| US-9.2 | **As a** merchant, **I want to** create a reward that gives a fixed or percentage discount **so that** members can redeem points for savings. | Discount reward type works |
| US-9.3 | **As a** merchant, **I want to** create a reward for a free product **so that** members can redeem points for merchandise. | Product reward type works |
| US-9.4 | **As a** merchant, **I want to** create a reward that grants store credit **so that** members can convert points to credit. | Store credit reward type works |
| US-9.5 | **As a** merchant, **I want to** create a free shipping reward **so that** members can redeem points for shipping. | Free shipping reward type works |
| US-9.6 | **As a** merchant, **I want to** set how many points a reward costs **so that** I control redemption economics. | Points cost field saves |
| US-9.7 | **As a** merchant, **I want to** limit rewards to specific tiers (e.g., Platinum only) **so that** premium members get exclusive rewards. | Tier restriction works |
| US-9.8 | **As a** merchant, **I want to** limit total redemptions for a reward **so that** limited-edition rewards stay exclusive. | Stock quantity enforced |
| US-9.9 | **As a** merchant, **I want to** limit how many times one member can redeem **so that** I prevent abuse. | Per-member limit enforced |
| US-9.10 | **As a** merchant, **I want to** set start/end dates for rewards **so that** I can run time-limited promotions. | Date range restriction works |
| US-9.11 | **As a** merchant, **I want to** modify reward details **so that** I can update offers over time. | PUT /api/rewards/{id} works |
| US-9.12 | **As a** merchant, **I want to** deactivate a reward **so that** it's no longer available for redemption. | Active flag toggles |
| US-9.13 | **As a** merchant, **I want to** see all redemptions across members **so that** I can track reward popularity. | Redemption history endpoint works |
| US-9.14 | **As a** merchant, **I want to** cancel a redemption and restore points **so that** I can handle customer issues. | Cancel redemption works |

---

## 10. Referral Program

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-10.1 | **As a** merchant, **I want to** toggle referrals on or off **so that** I can choose whether to run a referral program. | Referrals toggle works |
| US-10.2 | **As a** merchant, **I want to** set the credit amount referrers receive **so that** I incentivize sharing. | Referrer reward setting saves |
| US-10.3 | **As a** merchant, **I want to** set the credit amount new signups receive **so that** I incentivize joining. | Referee reward setting saves |
| US-10.4 | **As a** merchant, **I want to** grant rewards on signup or first purchase **so that** I control when rewards are issued. | Trigger setting works |
| US-10.5 | **As a** merchant, **I want to** cap referrals per member per month **so that** I prevent abuse. | Monthly limit enforced |
| US-10.6 | **As a** merchant, **I want to** see total referrals, earnings, and top referrers **so that** I can measure program success. | Referral stats endpoint works |
| US-10.7 | **As a** merchant, **I want to** see a member's unique referral code **so that** I can share it with them if needed. | Referral code displayed |
| US-10.8 | **As a** merchant, **I want to** see who referred whom **so that** I can understand viral growth. | Referral chain visible |

---

## 11. Bulk Operations

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-11.1 | **As a** merchant, **I want to** email all members in a specific tier **so that** I can communicate tier-specific promotions. | Bulk email by tier works |
| US-11.2 | **As a** merchant, **I want to** preview who will receive a bulk email **so that** I can verify the audience. | Email preview endpoint works |
| US-11.3 | **As a** merchant, **I want to** select from pre-built email templates **so that** I can send professional communications quickly. | Email templates available |
| US-11.4 | **As a** merchant, **I want to** use {member_name}, {tier_name} variables **so that** emails feel personal. | Variable substitution works |
| US-11.5 | **As a** merchant, **I want to** assign a tier to multiple selected members **so that** I can migrate groups efficiently. | Bulk tier assign works |
| US-11.6 | **As a** merchant, **I want to** issue credit to all members matching criteria **so that** I can run promotions. | Bulk credit issuance works |

---

## 12. Analytics & Reporting

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-12.1 | **As a** merchant, **I want to** see key metrics at a glance (members, trades, credits) **so that** I understand program health. | Dashboard shows key stats |
| US-12.2 | **As a** merchant, **I want to** see member count over time **so that** I can track growth. | Member growth trend displays |
| US-12.3 | **As a** merchant, **I want to** see trade-in count and value over time **so that** I can track acquisition. | Trade-in trend displays |
| US-12.4 | **As a** merchant, **I want to** see credits issued over time **so that** I can track loyalty investment. | Credit trend displays |
| US-12.5 | **As a** merchant, **I want to** compare this month to last month **so that** I can identify trends. | Period comparison works |
| US-12.6 | **As a** merchant, **I want to** analyze any date range **so that** I can investigate specific periods. | Custom date range works |
| US-12.7 | **As a** merchant, **I want to** see members ranked by trade-in value **so that** I can identify VIPs. | Top members report works |
| US-12.8 | **As a** merchant, **I want to** see detailed trade-in performance (by category, by status) **so that** I can optimize operations. | Trade-in report works |
| US-12.9 | **As a** merchant, **I want to** see a live feed of recent trades and credits **so that** I can monitor in real-time. | Activity feed displays |
| US-12.10 | **As a** merchant, **I want to** see how much of my plan limits I'm using **so that** I can plan for upgrades. | Usage stats displayed |

---

## 13. Settings & Configuration

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-13.1 | **As a** merchant, **I want to** set app name, logo, and colors **so that** the loyalty program matches my brand. | Branding settings save |
| US-13.2 | **As a** merchant, **I want to** select a visual theme (glass, solid, minimal) **so that** the app matches my aesthetic. | Theme selection works |
| US-13.3 | **As a** merchant, **I want to** hide advanced features **so that** the interface is simpler for my needs. | Advanced features toggle works |
| US-13.4 | **As a** merchant, **I want to** choose rounding mode (down, up, nearest) **so that** cashback calculations match my preference. | Rounding mode applies |
| US-13.5 | **As a** merchant, **I want to** set a minimum threshold for issuing cashback **so that** I don't issue tiny amounts. | Min cashback threshold works |
| US-13.6 | **As a** merchant, **I want to** toggle purchase cashback on or off **so that** I can control this benefit. | Purchase cashback toggle works |
| US-13.7 | **As a** merchant, **I want to** toggle trade-in credit bonuses **so that** I can control this benefit. | Trade-in credit toggle works |
| US-13.8 | **As a** merchant, **I want to** apply tier benefits to the membership purchase itself **so that** members get immediate value. | Same-transaction bonus works |
| US-13.9 | **As a** merchant, **I want to** set trial days for new memberships **so that** customers can try before committing. | Trial days setting saves |
| US-13.10 | **As a** merchant, **I want to** set grace period for failed payments **so that** members have time to fix payment issues. | Grace period setting saves |
| US-13.11 | **As a** merchant, **I want to** send automatic welcome emails on enrollment **so that** new members feel welcomed. | Welcome email toggle works |
| US-13.12 | **As a** merchant, **I want to** notify members when trade-in status changes **so that** they're informed. | Trade-in email toggle works |
| US-13.13 | **As a** merchant, **I want to** notify members of tier upgrades/downgrades **so that** they know their status. | Tier change email toggle works |
| US-13.14 | **As a** merchant, **I want to** notify members when they receive credit **so that** they're aware of rewards. | Credit email toggle works |
| US-13.15 | **As a** merchant, **I want to** set sender name and email for notifications **so that** emails come from my brand. | Sender settings save |
| US-13.16 | **As a** merchant, **I want to** auto-enroll customers after their first purchase **so that** they join automatically. | Auto-enrollment toggle works |
| US-13.17 | **As a** merchant, **I want to** specify which tier auto-enrolled members join **so that** I control the starting point. | Default tier setting works |
| US-13.18 | **As a** merchant, **I want to** require a minimum order value for auto-enrollment **so that** only real customers qualify. | Min order threshold works |
| US-13.19 | **As a** merchant, **I want to** exclude customers with certain tags **so that** wholesale or staff don't auto-enroll. | Excluded tags setting works |
| US-13.20 | **As a** merchant, **I want to** let customers sign up themselves on the storefront **so that** enrollment scales. | Self-signup toggle works |
| US-13.21 | **As a** merchant, **I want to** configure my store's currency **so that** amounts display correctly. | Currency setting saves |
| US-13.22 | **As a** merchant, **I want to** set my timezone **so that** dates and scheduled events are accurate. | Timezone setting saves |

---

## 14. Promotions & Tier Rules

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-14.1 | **As a** merchant, **I want to** create a promo code (e.g., SUMMER2025) for tier upgrades **so that** I can run campaigns. | Promo code creation works |
| US-14.2 | **As a** merchant, **I want to** limit total uses of a promo code **so that** I control promotion scope. | Usage limit enforced |
| US-14.3 | **As a** merchant, **I want to** limit promo uses per member **so that** individuals can't abuse codes. | Per-member limit enforced |
| US-14.4 | **As a** merchant, **I want to** set when a promo code expires **so that** promotions are time-limited. | Expiration date enforced |
| US-14.5 | **As a** merchant, **I want to** restrict promos to upgrades only **so that** members can't use them to downgrade. | Upgrade-only flag works |
| US-14.6 | **As a** merchant, **I want to** auto-upgrade members who spend $500/year to Gold **so that** top customers are rewarded. | Spend-based rules work |
| US-14.7 | **As a** merchant, **I want to** auto-upgrade members with 10+ trade-ins to Silver **so that** active traders are recognized. | Trade-in count rules work |
| US-14.8 | **As a** merchant, **I want to** evaluate rules over a rolling 365-day period **so that** eligibility stays current. | Time window calculation works |
| US-14.9 | **As a** merchant, **I want to** see how many members used a promo **so that** I can measure campaign success. | Promo usage stats displayed |

---

## 15. Shopify Integration

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-15.1 | **As a** merchant, **I want to** auto-create Shopify customer segments for TradeUp members **so that** I can use Shopify marketing tools. | Segment creation works |
| US-15.2 | **As a** merchant, **I want to** have segments like "TradeUp Gold Members" **so that** I can target by tier. | Per-tier segments created |
| US-15.3 | **As a** merchant, **I want to** auto-create purchasable membership products **so that** customers can subscribe on my storefront. | Membership products created |
| US-15.4 | **As a** merchant, **I want to** use the product wizard to set up membership products **so that** setup is guided. | Product wizard UI works |
| US-15.5 | **As a** merchant, **I want to** product variants to reflect my tier pricing **so that** customers see correct prices. | Variant pricing syncs |
| US-15.6 | **As a** merchant, **I want to** publish products to my storefront **so that** customers can buy memberships. | Publish action works |
| US-15.7 | **As a** merchant, **I want to** store tier and credit data in customer metafields **so that** I can use it in Liquid templates. | Metafield sync works |

---

## 16. Theme Extensions (Storefront)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-16.1 | **As a** merchant, **I want to** add a "Join Our Loyalty Program" block to my storefront **so that** visitors can sign up. | Membership signup block renders |
| US-16.2 | **As a** merchant, **I want to** display customer's credit balance on the storefront **so that** logged-in members see their rewards. | Credit badge block works |
| US-16.3 | **As a** merchant, **I want to** add a "Start Trade-In" button **so that** customers can submit trade-ins online. | Trade-in CTA block works |
| US-16.4 | **As a** merchant, **I want to** display member's referral code and sharing options **so that** they can invite friends. | Referral block works |
| US-16.5 | **As a** merchant, **I want to** place blocks anywhere in my theme **so that** they fit my site design. | Blocks configurable in theme editor |
| US-16.6 | **As a** merchant, **I want to** blocks to inherit my theme's styling **so that** they look native. | Blocks use CSS variables |

---

## 17. Customer Account Extension

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-17.1 | **As a** merchant, **I want to** display member's rewards info in their Shopify account **so that** they can check status. | Account extension renders balance |
| US-17.2 | **As a** merchant, **I want to** show members their past trade-ins **so that** they can track submissions. | Trade-in history displays |
| US-17.3 | **As a** merchant, **I want to** display current tier and benefits **so that** members understand their perks. | Tier info displays |
| US-17.4 | **As a** merchant, **I want to** show referral stats in the account **so that** members see their impact. | Referral stats display |

---

## 18. App Proxy (Customer Rewards Page)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-18.1 | **As a** merchant, **I want to** have a `/apps/rewards` page on my store **so that** customers can view the loyalty program. | Proxy route serves HTML |
| US-18.2 | **As a** merchant, **I want to** expose balance via JSON API **so that** I can build custom integrations. | /proxy/balance returns JSON |
| US-18.3 | **As a** merchant, **I want to** expose available rewards via API **so that** custom apps can show them. | /proxy/rewards returns JSON |
| US-18.4 | **As a** merchant, **I want to** expose tier benefits via API **so that** I can show comparison tables. | /proxy/tiers returns JSON |

---

## 19. Day-to-Day Operations

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-19.1 | **As a** merchant at POS, **I want to** quickly create a trade-in batch, add items, and complete **so that** I can serve customers efficiently. | Full trade-in flow < 2 min |
| US-19.2 | **As a** merchant, **I want to** search for a member by phone or email **so that** I can apply their benefits. | Quick search works |
| US-19.3 | **As a** merchant, **I want to** quickly look up a member's credit balance **so that** I can answer customer inquiries. | Balance lookup < 5 sec |
| US-19.4 | **As a** merchant, **I want to** view credit history for a member **so that** I can troubleshoot missing credits. | Credit history accessible |
| US-19.5 | **As a** merchant, **I want to** manually issue credit with a note **so that** I can resolve customer complaints. | Manual credit with note works |
| US-19.6 | **As a** merchant, **I want to** manually upgrade a member's tier **so that** I can handle special requests. | Manual tier upgrade works |
| US-19.7 | **As a** merchant, **I want to** verify a member's subscription is active **so that** I can confirm benefits eligibility. | Subscription status visible |
| US-19.8 | **As a** merchant, **I want to** review today's trade-ins and credits **so that** I can reconcile cash and inventory. | Daily report accessible |
| US-19.9 | **As a** merchant, **I want to** schedule a bulk credit event **so that** trade night promotions run automatically. | Scheduled events work |
| US-19.10 | **As a** merchant, **I want to** show staff how to use core features **so that** they can serve customers. | UI intuitive for training |

---

## 20. Error Handling & Support

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-20.1 | **As a** merchant, **I want to** be notified of critical errors **so that** I can address issues promptly. | Sentry captures errors |
| US-20.2 | **As a** merchant, **I want to** see recent errors and warnings **so that** I can troubleshoot problems. | Error feedback in UI |
| US-20.3 | **As a** merchant, **I want to** easily access support contact info **so that** I can get help when needed. | Support link visible |
| US-20.4 | **As a** merchant, **I want to** read help docs within the app **so that** I can learn features independently. | Help accessible |
| US-20.5 | **As a** merchant, **I want to** submit bug reports **so that** issues get fixed. | Bug report mechanism exists |

---

## Summary by Category

| Category | Count |
|----------|-------|
| App Discovery & Installation | 4 |
| Onboarding & Initial Setup | 8 |
| Billing & Subscription Management | 11 |
| Member Management | 17 |
| Tier System Configuration | 15 |
| Trade-In Management | 20 |
| Store Credit Operations | 12 |
| Points System | 8 |
| Rewards Catalog | 14 |
| Referral Program | 8 |
| Bulk Operations | 6 |
| Analytics & Reporting | 10 |
| Settings & Configuration | 22 |
| Promotions & Tier Rules | 9 |
| Shopify Integration | 7 |
| Theme Extensions (Storefront) | 6 |
| Customer Account Extension | 4 |
| App Proxy (Customer Rewards Page) | 4 |
| Day-to-Day Operations | 10 |
| Error Handling & Support | 5 |
| **TOTAL** | **200** |
