import { test, expect } from '@playwright/test';

test.describe('Quotation Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login');
  });

  test('sales staff can create quotation', async ({ page }) => {
    // Login as sales staff
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard');

    // Navigate to quotation request
    await page.click('text=Request Quotation');
    await page.waitForURL('**/quotations/request');

    // Select customer
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');

    // Wait for form to load
    await page.waitForSelector('[data-testid="quotation-form"]');

    // Add matrix
    await page.click('[data-testid="add-matrix-button"]');
    await page.click('text=Environment');

    // Add regulation
    await page.click('[data-testid="add-regulation-button"]');

    // Add parameters (pre-selected)
    await page.waitForSelector('[data-testid="parameter-item"]');

    // Set prices
    const priceInputs = await page.locator('[data-testid="price-input"]');
    const count = await priceInputs.count();
    for (let i = 0; i < count; i++) {
      await priceInputs.nth(i).fill('150000');
    }

    // Save draft
    await page.click('[data-testid="save-draft-button"]');
    await page.waitForSelector('text=Isian tersimpan otomatis');

    // Submit for verification
    await page.click('[data-testid="submit-button"]');
    await page.waitForSelector('text=Quotation berhasil dibuat');
  });

  test('supervisor can verify quotation', async ({ page }) => {
    // Login as supervisor
    await page.fill('input[name="email"]', 'supervisor@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to verify page
    await page.goto('http://localhost:3000/quotations/verify');
    await page.waitForSelector('[data-testid="quotation-list"]');

    // Click first quotation
    await page.click('[data-testid="quotation-card"]:first-child');

    // Verify
    await page.click('[data-testid="verify-button"]');
    await page.waitForSelector('text=Quotation berhasil diverifikasi');
  });

  test('manager can approve quotation', async ({ page }) => {
    // Login as manager
    await page.fill('input[name="email"]', 'manager@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to approve page
    await page.goto('http://localhost:3000/quotations/approve');
    await page.waitForSelector('[data-testid="quotation-list"]');

    // Click first quotation
    await page.click('[data-testid="quotation-card"]:first-child');

    // Check all prices are filled
    const priceFields = await page.locator('[data-testid="price-display"]');
    const count = await priceFields.count();
    for (let i = 0; i < count; i++) {
      const text = await priceFields.nth(i).textContent();
      expect(text).not.toContain('-');
    }

    // Approve
    await page.click('[data-testid="approve-button"]');
    await page.waitForSelector('text=Quotation berhasil disetujui');
  });

  test('reject quotation with reason', async ({ page }) => {
    // Login as manager
    await page.fill('input[name="email"]', 'manager@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to approve page
    await page.goto('http://localhost:3000/quotations/approve');

    // Click first quotation
    await page.click('[data-testid="quotation-card"]:first-child');

    // Click reject
    await page.click('[data-testid="reject-button"]');

    // Fill reason
    await page.fill('[data-testid="reject-reason"]', 'Harga terlalu tinggi');

    // Confirm reject
    await page.click('[data-testid="confirm-reject-button"]');
    await page.waitForSelector('text=Quotation ditolak');
  });
});

test.describe('Auto-save Feature E2E', () => {
  test('auto-saves draft while typing', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');
    await page.waitForSelector('[data-testid="quotation-form"]');

    // Select customer
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');

    // Type in field
    await page.fill('[data-testid="some-input"]', 'Test value');

    // Wait for auto-save indicator
    await page.waitForSelector('text=Isian tersimpan otomatis', { timeout: 5000 });
  });

  test('restores draft on page reload', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Fill form
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');
    await page.fill('[data-testid="some-input"]', 'Test value');

    // Reload page
    await page.reload();

    // Check draft restored
    await page.waitForSelector('text=Isian sebelumnya dipulihkan');
    await page.waitForSelector('text=Test value');
  });

  test('multiple tabs can create separate drafts', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Login both pages
    for (const page of [page1, page2]) {
      await page.goto('http://localhost:3000/login');
      await page.fill('input[name="email"]', 'sales@example.com');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    }

    // Create different quotations in each
    await page1.goto('http://localhost:3000/quotations/request');
    await page2.goto('http://localhost:3000/quotations/request');

    await page1.fill('[data-testid="some-input"]', 'Value from tab 1');
    await page2.fill('[data-testid="some-input"]', 'Value from tab 2');

    // Reload both
    await page1.reload();
    await page2.reload();

    // Check they maintained separate values
    const value1 = await page1.inputValue('[data-testid="some-input"]');
    const value2 = await page2.inputValue('[data-testid="some-input"]');

    expect(value1).toBe('Value from tab 1');
    expect(value2).toBe('Value from tab 2');
  });
});

test.describe('Email Workflow E2E', () => {
  test('send quotation email with popup feedback', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to approved quotation
    await page.goto('http://localhost:3000/quotations/home');
    await page.click('text=APPROVED');
    await page.click('[data-testid="quotation-card"]:first-child');

    // Click send email
    await page.click('[data-testid="send-email-button"]');

    // Wait for email dialog
    await page.waitForSelector('[data-testid="email-dialog"]');

    // Click send
    await page.click('[data-testid="send-email-confirm-button"]');

    // Wait for success popup
    await page.waitForSelector('text=Email berhasil dikirim');
    await page.click('text=Mengerti');
  });

  test('email send fails with invalid address', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to approved quotation
    await page.goto('http://localhost:3000/quotations/home');
    await page.click('text=APPROVED');
    await page.click('[data-testid="quotation-card"]:first-child');

    // Click send email
    await page.click('[data-testid="send-email-button"]');

    // Modify email to invalid
    await page.fill('[data-testid="email-to-input"]', 'invalid-email');

    // Click send
    await page.click('[data-testid="send-email-confirm-button"]');

    // Wait for error popup
    await page.waitForSelector('text=Gagal mengirim email');
  });
});
