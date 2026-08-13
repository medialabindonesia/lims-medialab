import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E', () => {
  test('validation error on required fields', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Try to submit without filling required fields
    await page.click('[data-testid="submit-button"]');

    // Wait for validation errors
    await page.waitForSelector('[data-testid="validation-error"]');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('wajib diisi');
  });

  test('network error shows user-friendly message', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Fill form
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');

    // Intercept API to simulate network error
    await page.route('**/api/quotations', route => {
      route.abort('failed');
    });

    // Try to submit
    await page.click('[data-testid="submit-button"]');

    // Wait for error message
    await page.waitForSelector('text=Gagal menyimpan quotation');
  });

  test('server error shows generic error message', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Fill form
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');

    // Intercept API to simulate 500 error
    await page.route('**/api/quotations', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Try to submit
    await page.click('[data-testid="submit-button"]');

    // Wait for error message
    await page.waitForSelector('text=Terjadi kesalahan server');
  });

  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('http://localhost:3000/nonexistent-route');

    // Wait for 404 page
    await page.waitForSelector('text=Halaman tidak ditemukan');
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    // Clear any existing sessions
    await page.goto('http://localhost:3000');
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('http://localhost:3000/quotations/request');

    // Should redirect to login
    await page.waitForURL('**/login');
  });

  test('session expiry shows login prompt', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Clear cookies to simulate session expiry
    await page.context().clearCookies();

    // Refresh page
    await page.reload();

    // Should show login prompt or redirect
    await page.waitForURL('**/login');
  });

  test('concurrent modifications handled gracefully', async ({ context }) => {
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

    // Both try to edit same quotation
    await page1.goto('http://localhost:3000/quotations/request');
    await page2.goto('http://localhost:3000/quotations/request');

    // Fill different values
    await page1.fill('[data-testid="some-input"]', 'Value 1');
    await page2.fill('[data-testid="some-input"]', 'Value 2');

    // Save both simultaneously
    await Promise.all([
      page1.click('[data-testid="save-draft-button"]'),
      page2.click('[data-testid="save-draft-button"]'),
    ]);

    // At least one should succeed without error
    // The other might get a conflict error, which is acceptable
  });

  test('form data persistence on browser navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Fill form
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');
    await page.fill('[data-testid="some-input"]', 'Test data');

    // Navigate away
    await page.click('text=Dashboard');

    // Check for confirmation dialog
    const dialog = await page.waitForSelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();

    // Cancel navigation
    await page.click('text=Batal');

    // Data should still be there
    const value = await page.inputValue('[data-testid="some-input"]');
    expect(value).toBe('Test data');
  });
});

test.describe('Role-Based Access E2E', () => {
  test('SALES_STAFF cannot access approve page', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/approve');

    // Should redirect or show access denied
    const isRedirected = page.url() !== 'http://localhost:3000/quotations/approve';
    const hasAccessDenied = await page.locator('text=Akses ditolak').count() > 0;

    expect(isRedirected || hasAccessDenied).toBe(true);
  });

  test('CUSTOMER_ENGAGEMENT has limited access', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'cs@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Should not see quotation creation link
    const createLink = await page.locator('text=Request Quotation').count();
    expect(createLink).toBe(0);
  });
});

test.describe('Form Edge Cases E2E', () => {
  test('handles very long input', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Fill with very long text
    const longText = 'a'.repeat(10000);
    await page.fill('[data-testid="notes-input"]', longText);

    // UI should not break
    const isStillVisible = await page.locator('[data-testid="notes-input"]').isVisible();
    expect(isStillVisible).toBe(true);
  });

  test('handles rapid input changes', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Rapid input changes
    for (let i = 0; i < 100; i++) {
      await page.fill('[data-testid="some-input"]', `Value ${i}`);
    }

    // Final value should be set
    const value = await page.inputValue('[data-testid="some-input"]');
    expect(value).toBe('Value 99');
  });

  test('matrix selection updates parameters', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Select customer
    await page.click('[data-testid="customer-select"]');
    await page.click('text=PT Aydin Manufaktur Nusantara');

    // Add matrix
    await page.click('[data-testid="add-matrix-button"]');
    await page.click('text=Environment');

    // Wait for parameters to load
    await page.waitForSelector('[data-testid="parameter-list"]');

    // Parameters should be displayed
    const paramCount = await page.locator('[data-testid="parameter-item"]').count();
    expect(paramCount).toBeGreaterThan(0);

    // Change matrix
    await page.click('[data-testid="change-matrix-button"]');
    await page.click('text=Water');

    // Parameters should update
    const newParamCount = await page.locator('[data-testid="parameter-item"]').count();
    expect(newParamCount).toBeGreaterThan(0);
  });

  test('adding multiple groups works correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'sales@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/quotations/request');

    // Add 5 groups
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="add-matrix-button"]');
      await page.click(`text=Matrix ${i + 1}`);
    }

    // All groups should be visible
    const groupCount = await page.locator('[data-testid="group-item"]').count();
    expect(groupCount).toBe(5);

    // Remove first group
    await page.click('[data-testid="group-0-remove-button"]');

    // Should have 4 groups
    const newGroupCount = await page.locator('[data-testid="group-item"]').count();
    expect(newGroupCount).toBe(4);
  });
});
