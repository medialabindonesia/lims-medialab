# Marketing LIMS Testing Plan

**Date:** 2026-08-13
**Environment:** VPS marketing (port 3012)
**Focus:** Edge cases & error handling

---

## 1. Testing Framework & Setup

### Frameworks
- **Unit & Integration:** Vitest (fast, Vite-native, great DX for Next.js)
- **E2E:** Playwright (browser testing)

### Test Structure
```
src/
  __tests__/
    unit/
      quotation/
        quotation-content.test.ts      # pricing, calculations
        quotation-access.test.ts       # permission checks
        customer-labels.test.ts        # status labels
        order-code.test.ts             # code generation
        sampling-duration-catalog.test.ts # duration parsing
      marketing/
        customer-code.test.ts          # customer code gen
        marketing-number.test.ts       # lead/survey numbers
    integration/
      api/
        quotations/
          create.test.ts               # POST /api/quotations
          update.test.ts               # PATCH /api/quotations/[id]
          verify.test.ts               # PATCH /api/quotations/[id]/verify
          approve.test.ts              # PATCH /api/quotations/[id]/approve
          reject.test.ts               # PATCH /api/quotations/[id]/reject
          drafts.test.ts               # GET/PUT/DELETE /api/quotations/drafts
          email.test.ts                # POST /api/quotations/[id]/email/send
        customers/
          create.test.ts               # POST /api/master/customers
          search.test.ts               # GET /api/master/customers/search
        marketing/
          import.test.ts               # POST /api/master/marketing/import
    e2e/
      quotation-flow.spec.ts           # Full quotation workflow
      quotation-error.spec.ts          # Error scenarios
```

---

## 2. Unit Test Coverage (Edge Cases & Error Handling)

### 2.1 Quotation Calculations (quotation-content.ts)
- [ ] Price calculation with zero prices
- [ ] Price calculation with null prices (missing items)
- [ ] Total with multiple groups, multiple items each
- [ ] Rounding edge cases (decimal precision)
- [ ] Empty group handling
- [ ] Single-item group

### 2.2 Quotation Access (quotation-access.ts)
- [ ] Role SUPER_ADMIN: full access
- [ ] Role SALES_STAFF: can create, can verify, cannot approve
- [ ] Role SALES_MANAGER_DIRECTOR: can approve, can verify
- [ ] Role CUSTOMER_ENGAGEMENT: limited access
- [ ] No role: denied
- [ ] Multiple roles: highest permission wins

### 2.3 Customer Labels (customer-labels.ts)
- [ ] All status enum values map to correct labels
- [ ] Invalid/unknown status returns fallback
- [ ] Null/undefined status handling
- [ ] Date formatting edge cases (invalid dates, timezone)

### 2.4 Order Code Generation (order-code.ts)
- [ ] Sequential code generation
- [ ] Code generation on year boundary
- [ ] Code uniqueness guarantee
- [ ] Code format validation (matches expected pattern)

### 2.5 Sampling Duration Catalog (sampling-duration-catalog.ts)
- [ ] "Grab (Sesaat)" → instant duration
- [ ] "Grab" vs "Grab (Sesaat)" distinction
- [ ] Duration with units (1x24 jam, 7 hari)
- [ ] Invalid duration formats
- [ ] Duration parsing from various input formats

### 2.6 Customer Code Generation (customer-code.ts)
- [ ] DIRECT customer code format (DC.XXX.YYNNNN)
- [ ] CONSULTANT customer code format (CC.XXX.YYNNNNNN)
- [ ] Code generation with consultant relationship
- [ ] Sequence number increment
- [ ] Duplicate prevention

### 2.7 Marketing Number Generation (marketing-number.ts)
- [ ] Lead number format (LD.001.YY-XXXXX)
- [ ] Survey number format
- [ ] Sequence increment
- [ ] Year rollover

---

## 3. Integration Test Coverage (API + Database)

### 3.1 Quotation API Error Handling

#### Create (POST /api/quotations)
- [ ] Missing required fields → 400 with specific message
- [ ] Invalid customer ID → 400 with "customer not found"
- [ ] Invalid matrix/regulation → 400 with validation error
- [ ] Empty groups → 400 with "at least one group required"
- [ ] Groups with no parameters → 400 with validation error
- [ ] Unauthorized request → 401
- [ ] Database connection error → 500 with generic message

#### Update (PATCH /api/quotations/[id])
- [ ] Update quotation in terminal status (REJECTED) → 400
- [ ] Update quotation owned by different user → 403
- [ ] Update with invalid status transition → 400
- [ ] Update with corrupted data → 400 with validation error
- [ ] Concurrent updates (race condition) → handled gracefully

#### Verify (PATCH /api/quotations/[id]/verify)
- [ ] Verify already verified quotation → 400
- [ ] Verify as non-authorized role → 403
- [ ] Verify without all required fields → 400
- [ ] Verify with database error → 500 handled

#### Approve (PATCH /api/quotations/[id]/approve)
- [ ] Approve with null prices → 400 "harap isi harga"
- [ ] Approve already approved → 400
- [ ] Approve without authority → 403
- [ ] Approve with pricing gate failure → 400 with specific message

#### Reject (PATCH /api/quotations/[id]/reject)
- [ ] Reject without reason → 400
- [ ] Reject already rejected → 400
- [ ] Reject by unauthorized user → 403

#### Drafts (GET/PUT/DELETE /api/quotations/drafts)
- [ ] GET with invalid scope → 400
- [ ] PUT payload > 512KB → 413
- [ ] PUT with malformed JSON → 400
- [ ] DELETE non-existent draft → 200 (idempotent)
- [ ] GET/PUT/DELETE without session → 401

#### Email Send (POST /api/quotations/[id]/email/send)
- [ ] Send to invalid email → 400
- [ ] Send with attachment > limit → 413
- [ ] Send when email service down → 500 with retry info
- [ ] Send duplicate → idempotent or warning

### 3.2 Customer API Error Handling

#### Create (POST /api/master/customers)
- [ ] Duplicate email → 400 with specific message
- [ ] Invalid customerType → 400
- [ ] Missing required fields → 400
- [ ] Very long strings → 400 (validation)

#### Search (GET /api/master/customers/search)
- [ ] Empty query → returns empty array
- [ ] SQL injection attempt → sanitized
- [ ] Special characters in query → handled

### 3.3 Marketing Import (POST /api/master/marketing/import)
- [ ] Invalid Excel format → 400
- [ ] Empty file → 400
- [ ] Corrupted file → 500 handled
- [ ] File too large → 413

---

## 4. E2E Test Scenarios (Playwright)

### 4.1 Critical Path with Errors
- [ ] Create quotation → leave required field empty → see validation error
- [ ] Create quotation → save draft → close → reopen → verify data persists
- [ ] Create quotation → verify → approve with missing prices → see error
- [ ] Create quotation → verify → approve → send email → verify success popup

### 4.2 Auto-Save Edge Cases
- [ ] Type rapidly → auto-save triggers → no data loss
- [ ] Type → close browser → reopen → draft restored
- [ ] Create new quotation → auto-save → reload → form empty (new)
- [ ] Auto-save concurrent with manual save

### 4.3 Form Edge Cases
- [ ] Select matrix with 0 regulations → appropriate message
- [ ] Select regulation with 0 parameters → appropriate message
- [ ] Select parameter → change matrix → parameters update correctly
- [ ] Add 10+ groups → UI remains responsive
- [ ] Remove all groups → UI handles gracefully
- [ ] Enter very long text in text fields → no layout break

### 4.4 Navigation & State
- [ ] Navigate away with unsaved changes → confirmation prompt
- [ ] Browser back/forward → correct state
- [ ] Direct URL to quotation in wrong status → appropriate redirect

### 4.5 Email Workflow
- [ ] Send email → popup shows success
- [ ] Send email to invalid address → popup shows error
- [ ] Send email when service unavailable → error message

### 4.6 Role-Based Access
- [ ] SALES_STAFF: can create/verify, cannot approve
- [ ] SALES_MANAGER_DIRECTOR: can approve, can verify
- [ ] CUSTOMER_ENGAGEMENT: limited view
- [ ] Unauthenticated: redirect to login

---

## 5. Test Data Strategy

### On VPS Marketing (port 3012)
- Use existing UAT customers (DC/CC codes)
- Create test quotations with various states
- Test email with real Resend domain

### Test Data Fixtures
- Valid quotation payloads
- Invalid quotation payloads (missing fields, bad data)
- Customer fixtures (DIRECT, CONSULTANT)
- Status transition sequences

---

## 6. Implementation Order

### Phase 1: Setup & Unit Tests (Day 1)
1. Install Vitest, configure test environment
2. Create test helpers (PrismaClient mock, API mock)
3. Write unit tests for helper functions
4. Verify all unit tests pass

### Phase 2: Integration Tests (Day 2)
1. Setup API test client
2. Write API route tests with error scenarios
3. Test database interactions
4. Verify error handling

### Phase 3: E2E Tests (Day 3)
1. Install Playwright, configure browser
2. Write E2E tests for critical paths
3. Test error scenarios in browser
4. Run full test suite

### Phase 4: Bug Report (Day 4)
1. Execute all tests
2. Document failures
3. Identify root causes
4. Propose fixes

---

## 7. Deliverables

1. **Test files** committed to repository
2. **Test reports** with pass/fail status
3. **Bug report** listing any issues found
4. **Improvement recommendations** based on testing
