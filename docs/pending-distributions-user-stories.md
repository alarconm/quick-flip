# Pending Distribution Approval - User Stories & Test Plan

## Overview
This document defines user stories and acceptance criteria for the Pending Distribution Approval feature, which allows merchants to review and approve monthly store credit distributions before they are issued.

---

## User Stories

### US-PD-001: View Pending Distributions List
**As a** merchant
**I want to** see a list of pending distributions awaiting my approval
**So that** I can review and take action on them before credits are issued

**Acceptance Criteria:**
- [ ] Page displays at `/app/pending-distributions`
- [ ] Shows all pending distributions with status badges
- [ ] Displays summary stats: members count, total amount, tier count
- [ ] Shows expiration warning badges (urgent for < 3 days)
- [ ] Empty state shown when no pending distributions exist
- [ ] Loading spinner shown while data is fetching

---

### US-PD-002: View Distribution Details
**As a** merchant
**I want to** view detailed information about a pending distribution
**So that** I can make an informed decision before approving

**Acceptance Criteria:**
- [ ] "View Details" button opens modal with full information
- [ ] Shows timeline: created date, expiration date
- [ ] Shows summary: members, total amount, processed, skipped
- [ ] Shows tier breakdown table with counts and amounts
- [ ] Shows totals row in tier breakdown
- [ ] For approved/rejected: shows execution result or rejection reason

---

### US-PD-003: Approve Distribution
**As a** merchant
**I want to** approve a pending distribution
**So that** store credits are issued to eligible members

**Acceptance Criteria:**
- [ ] "Approve" button opens confirmation modal
- [ ] Modal shows warning that action cannot be undone
- [ ] Modal shows distribution summary (members, amount)
- [ ] "Approve & Distribute" button triggers approval
- [ ] Loading state shown during API call
- [ ] Success: distribution marked as approved, list refreshes
- [ ] Error: displays error message in banner

---

### US-PD-004: Reject Distribution
**As a** merchant
**I want to** reject a pending distribution
**So that** I can prevent incorrect credits from being issued

**Acceptance Criteria:**
- [ ] "Reject" button opens rejection modal
- [ ] Modal shows warning about rejection consequences
- [ ] Optional reason text field available
- [ ] "Reject" button triggers rejection
- [ ] Loading state shown during API call
- [ ] Success: distribution marked as rejected, list refreshes
- [ ] Rejection reason displayed in distribution card

---

### US-PD-005: Enable Auto-Approve
**As a** merchant
**I want to** enable auto-approve for future distributions
**So that** I don't have to manually approve every month

**Acceptance Criteria:**
- [ ] Checkbox shown in approval modal: "Enable auto-approve for future monthly distributions"
- [ ] Checkbox only enabled after first manual approval (eligible = true)
- [ ] If not eligible, checkbox is disabled with explanation
- [ ] Checking box and approving enables auto-approve setting
- [ ] Settings modal shows current auto-approve status

---

### US-PD-006: View Auto-Approve Status
**As a** merchant
**I want to** see the current auto-approve status
**So that** I know whether future distributions will be automatic

**Acceptance Criteria:**
- [ ] Status card shows auto-approve state: Enabled, Available, Not Yet Eligible
- [ ] Badge color indicates status (green=enabled, blue=available, yellow=not eligible)
- [ ] Descriptive text explains current state
- [ ] Settings button opens settings modal

---

### US-PD-007: Manage Auto-Approve Settings
**As a** merchant
**I want to** manage my auto-approve settings
**So that** I can enable or disable automatic approvals

**Acceptance Criteria:**
- [ ] "Settings" button opens settings modal
- [ ] Checkbox to enable/disable auto-approve
- [ ] Checkbox disabled if not eligible (first approval not completed)
- [ ] Info banner explains eligibility requirements
- [ ] Success banner shown when auto-approve is enabled
- [ ] Changes saved immediately on checkbox toggle

---

### US-PD-008: View Distribution History
**As a** merchant
**I want to** view past distributions (approved, rejected, expired)
**So that** I can review what was distributed previously

**Acceptance Criteria:**
- [ ] "Show History" toggle button switches between pending-only and all
- [ ] History view shows approved, rejected, and expired distributions
- [ ] Status badges differentiate between statuses
- [ ] Approved distributions show execution results
- [ ] Rejected distributions show rejection reason

---

### US-PD-009: Receive Pending Alert
**As a** merchant
**I want to** see an alert when distributions are pending
**So that** I don't miss the approval window

**Acceptance Criteria:**
- [ ] Warning banner shown when pending count > 0
- [ ] Banner shows count and "Review Now" action
- [ ] Clicking "Review Now" opens first pending distribution details
- [ ] Banner hidden when showing history or no pending items

---

### US-PD-010: Responsive Mobile Experience
**As a** merchant using a mobile device
**I want to** review and approve distributions on my phone
**So that** I can manage my store from anywhere

**Acceptance Criteria:**
- [ ] Page renders correctly on mobile (375px width)
- [ ] Stats grid stacks to 2 columns on mobile
- [ ] All modals are usable on mobile
- [ ] Buttons are tap-friendly (minimum 44px target)
- [ ] No horizontal scrolling required
- [ ] Text remains readable without zooming

---

## API Test Cases

### API-PD-001: List Pending Distributions
```
GET /api/pending-distributions
Expected: 200 OK with { distributions: [...], pending_count: N }
```

### API-PD-002: List with Status Filter
```
GET /api/pending-distributions?status=pending
Expected: 200 OK with only pending distributions
```

### API-PD-003: List with History
```
GET /api/pending-distributions?include_all=true
Expected: 200 OK with all distributions including expired
```

### API-PD-004: Get Single Distribution
```
GET /api/pending-distributions/:id
Expected: 200 OK with full distribution details
```

### API-PD-005: Get Distribution with Members
```
GET /api/pending-distributions/:id?include_members=true
Expected: 200 OK with member list in preview_data
```

### API-PD-006: Approve Distribution
```
POST /api/pending-distributions/:id/approve
Body: { enable_auto_approve: false }
Expected: 200 OK with execution result
```

### API-PD-007: Approve with Auto-Enable
```
POST /api/pending-distributions/:id/approve
Body: { enable_auto_approve: true }
Expected: 200 OK, auto_approve setting updated
```

### API-PD-008: Reject Distribution
```
POST /api/pending-distributions/:id/reject
Body: { reason: "Incorrect tier assignments" }
Expected: 200 OK with rejection confirmation
```

### API-PD-009: Get Settings
```
GET /api/pending-distributions/settings
Expected: 200 OK with { enabled, eligible, notification_emails, threshold }
```

### API-PD-010: Update Settings
```
PUT /api/pending-distributions/settings
Body: { enabled: true }
Expected: 200 OK with updated settings
```

---

## E2E Test Scenarios

### E2E-PD-001: Desktop - View Empty State
1. Navigate to /app/pending-distributions
2. Verify empty state message displayed
3. Verify "How It Works" section visible

### E2E-PD-002: Desktop - View Pending Distribution
1. Navigate to /app/pending-distributions (with pending data)
2. Verify warning banner displayed
3. Verify distribution card with stats
4. Click "View Details"
5. Verify modal opens with tier breakdown

### E2E-PD-003: Desktop - Approve Distribution
1. Navigate to /app/pending-distributions
2. Click "Approve" on pending distribution
3. Verify confirmation modal
4. Click "Approve & Distribute"
5. Verify success and list refresh

### E2E-PD-004: Desktop - Reject Distribution
1. Navigate to /app/pending-distributions
2. Click "Reject" on pending distribution
3. Enter rejection reason
4. Click "Reject"
5. Verify rejection displayed

### E2E-PD-005: Mobile - Responsive Layout
1. Set viewport to 375x812
2. Navigate to /app/pending-distributions
3. Verify 2-column stats grid
4. Verify all content visible
5. Verify no horizontal scroll

### E2E-PD-006: Mobile - Modal Interaction
1. Set viewport to 375x812
2. Navigate to /app/pending-distributions
3. Click "View Details"
4. Verify modal fills screen appropriately
5. Verify all buttons tappable

---

## Test Data Requirements

### Mock Pending Distribution
```json
{
  "id": 1,
  "tenant_id": 1,
  "distribution_type": "monthly_credit",
  "reference_key": "monthly-2026-01",
  "status": "pending",
  "preview_data": {
    "total_members": 145,
    "total_amount": 2875.50,
    "processed": 150,
    "skipped": 5,
    "by_tier": [
      { "tier": "Gold", "count": 50, "amount": 1250.00 },
      { "tier": "Silver", "count": 75, "amount": 1125.00 },
      { "tier": "Bronze", "count": 20, "amount": 500.50 }
    ],
    "calculated_at": "2026-01-01T06:00:00Z"
  },
  "created_at": "2026-01-01T06:00:00Z",
  "expires_at": "2026-01-08T06:00:00Z",
  "display_name": "January 2026 Monthly Credits",
  "days_until_expiry": 5,
  "is_expired": false
}
```
