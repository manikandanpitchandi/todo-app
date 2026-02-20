import { test, expect } from '@playwright/test';

// Each test gets a fresh browser context (no shared localStorage/sessionStorage)
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('Authentication', () => {
  test('shows login page on first load', async ({ page }) => {
    await expect(page.locator('.auth-wrapper')).toBeVisible();
    await expect(page.locator('.auth-card')).toBeVisible();
    await expect(page.locator('.card')).not.toBeVisible();
  });

  test('register a new user', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    await expect(page.locator('.auth-success')).toBeVisible();
    await expect(page.locator('.auth-success')).toContainText('Account created');
  });

  test('redirects to login tab after registration', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    // Auto-switches after 1200ms
    await page.waitForTimeout(1400);

    await expect(page.locator('button.auth-tab.active')).toHaveText('Log In');
    await expect(page.locator('button.auth-submit')).toHaveText('Log In');
  });

  test('shows error for duplicate username', async ({ page }) => {
    // Register first
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'dupeuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await page.waitForTimeout(200);

    // Register again with same username
    await page.fill('#auth-username', 'dupeuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    await expect(page.locator('.auth-error')).toContainText('already taken');
  });

  test('shows error for short username', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'ab');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    await expect(page.locator('.auth-error')).toContainText('at least 3 characters');
  });

  test('login with valid credentials', async ({ page }) => {
    // Register first
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await page.waitForTimeout(1400); // wait for auto-switch

    // Login
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    await expect(page.locator('.card')).toBeVisible();
    await expect(page.locator('.auth-card')).not.toBeVisible();
  });

  test('shows username and logout button after login', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await page.waitForTimeout(1400);

    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    await expect(page.locator('.app-username')).toHaveText('testuser');
    await expect(page.locator('button.logout-btn')).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await page.waitForTimeout(1400);

    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'wrongpass');
    await page.click('button.auth-submit');

    await expect(page.locator('.auth-error')).toContainText('Invalid username or password');
  });

  test('logout returns to login page', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await page.waitForTimeout(1400);

    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await expect(page.locator('.card')).toBeVisible();

    await page.click('button.logout-btn');

    await expect(page.locator('.auth-wrapper')).toBeVisible();
    await expect(page.locator('.card')).not.toBeVisible();
  });

  test('todos persist across logout and re-login', async ({ page }) => {
    // Register and login
    await page.click('button.auth-tab:has-text("Register")');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');
    await page.waitForTimeout(1400);

    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    // Add a todo
    await page.fill('input.todo-input', 'My persistent task');
    await page.click('button.add-btn');
    await expect(page.locator('.todo-text')).toContainText('My persistent task');

    // Logout
    await page.click('button.logout-btn');
    await expect(page.locator('.auth-wrapper')).toBeVisible();

    // Login again
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await page.click('button.auth-submit');

    // Todo should still be there
    await expect(page.locator('.todo-text')).toContainText('My persistent task');
  });
});
