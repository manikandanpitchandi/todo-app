import { test, expect } from '@playwright/test';

// Helper: register and log in before each test so we start on the todo page
test.beforeEach(async ({ page }) => {
  await page.goto('/');

  await page.click('button.auth-tab:has-text("Register")');
  await page.fill('#auth-username', 'todouser');
  await page.fill('#auth-password', 'pass1234');
  await page.click('button.auth-submit');
  await page.waitForTimeout(1400); // wait for auto-switch to login tab

  await page.fill('#auth-username', 'todouser');
  await page.fill('#auth-password', 'pass1234');
  await page.click('button.auth-submit');

  await expect(page.locator('.card')).toBeVisible();
});

test.describe('Todo CRUD', () => {
  test('shows empty state when no todos', async ({ page }) => {
    await expect(page.locator('.empty-message')).toBeVisible();
    await expect(page.locator('.todo-footer')).not.toBeVisible();
  });

  test('adds a todo via button click', async ({ page }) => {
    await page.fill('input.todo-input', 'Buy groceries');
    await page.click('button.add-btn');

    await expect(page.locator('.todo-text')).toContainText('Buy groceries');
    await expect(page.locator('.empty-message')).not.toBeVisible();
  });

  test('adds a todo via Enter key', async ({ page }) => {
    await page.fill('input.todo-input', 'Press Enter task');
    await page.keyboard.press('Enter');

    await expect(page.locator('.todo-text')).toContainText('Press Enter task');
  });

  test('clears input after adding a todo', async ({ page }) => {
    await page.fill('input.todo-input', 'Clear me');
    await page.click('button.add-btn');

    await expect(page.locator('input.todo-input')).toHaveValue('');
  });

  test('does not add empty todo', async ({ page }) => {
    await page.click('button.add-btn');

    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('marks a todo as complete', async ({ page }) => {
    await page.fill('input.todo-input', 'Complete me');
    await page.click('button.add-btn');

    await page.locator('.todo-item input[type="checkbox"]').click();

    await expect(page.locator('.todo-item.completed')).toHaveCount(1);
    await expect(page.locator('.todo-item.completed .todo-text')).toContainText('Complete me');
  });

  test('unchecks a completed todo', async ({ page }) => {
    await page.fill('input.todo-input', 'Toggle me');
    await page.click('button.add-btn');

    const checkbox = page.locator('.todo-item input[type="checkbox"]');
    await checkbox.click(); // complete
    await checkbox.click(); // undo

    await expect(page.locator('.todo-item.completed')).toHaveCount(0);
  });

  test('deletes a todo on hover', async ({ page }) => {
    await page.fill('input.todo-input', 'Delete me');
    await page.click('button.add-btn');

    const item = page.locator('.todo-item');
    await item.hover();
    await item.locator('.delete-btn').click();

    await expect(page.locator('.todo-item')).toHaveCount(0);
    await expect(page.locator('.empty-message')).toBeVisible();
  });

  test('updates item count in footer', async ({ page }) => {
    await page.fill('input.todo-input', 'Task 1');
    await page.click('button.add-btn');
    await page.fill('input.todo-input', 'Task 2');
    await page.click('button.add-btn');

    await expect(page.locator('.item-count')).toContainText('2');

    // Complete one
    await page.locator('.todo-item input[type="checkbox"]').first().click();
    await expect(page.locator('.item-count')).toContainText('1');
  });
});

test.describe('Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Add two tasks and complete one
    await page.fill('input.todo-input', 'Active task');
    await page.click('button.add-btn');
    await page.fill('input.todo-input', 'Done task');
    await page.click('button.add-btn');

    await page.locator('.todo-item input[type="checkbox"]').last().click();
  });

  test('All filter shows every todo', async ({ page }) => {
    await page.click('button.filter-btn:has-text("All")');
    await expect(page.locator('.todo-item')).toHaveCount(2);
  });

  test('Active filter hides completed todos', async ({ page }) => {
    await page.click('button.filter-btn:has-text("Active")');
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-text')).toContainText('Active task');
  });

  test('Completed filter shows only completed todos', async ({ page }) => {
    await page.click('button.filter-btn:has-text("Completed")');
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-text')).toContainText('Done task');
  });

  test('active filter button gets active class', async ({ page }) => {
    await page.click('button.filter-btn:has-text("Active")');
    await expect(page.locator('button.filter-btn.active')).toHaveText('Active');
  });
});

test.describe('Clear Completed', () => {
  test('clear completed button removes done todos', async ({ page }) => {
    await page.fill('input.todo-input', 'Keep me');
    await page.click('button.add-btn');
    await page.fill('input.todo-input', 'Remove me');
    await page.click('button.add-btn');

    await page.locator('.todo-item input[type="checkbox"]').last().click();
    await page.click('button.clear-btn');

    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-text')).toContainText('Keep me');
  });

  test('clear completed button is hidden when no completed todos', async ({ page }) => {
    await page.fill('input.todo-input', 'Active only');
    await page.click('button.add-btn');

    await expect(page.locator('button.clear-btn')).not.toBeVisible();
  });

  test('clear completed button appears when a todo is completed', async ({ page }) => {
    await page.fill('input.todo-input', 'Complete me');
    await page.click('button.add-btn');
    await page.locator('.todo-item input[type="checkbox"]').click();

    await expect(page.locator('button.clear-btn')).toBeVisible();
  });
});
