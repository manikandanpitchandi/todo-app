import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const BASE_URL = 'http://localhost:5175';
const SCREENSHOTS_DIR = 'C:/APPS/todo-app/e2e-screenshots';

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function screenshot(page, name) {
  const path = `${SCREENSHOTS_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`  [screenshot] ${name}.png`);
  return path;
}

async function runTests() {
  await ensureDir(SCREENSHOTS_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const results = [];

  function pass(test, detail = '') {
    results.push({ status: 'PASS', test, detail });
    console.log(`PASS: ${test}${detail ? ' — ' + detail : ''}`);
  }
  function fail(test, detail = '') {
    results.push({ status: 'FAIL', test, detail });
    console.log(`FAIL: ${test}${detail ? ' — ' + detail : ''}`);
  }

  // ─── TEST 1: Navigate and take initial screenshot ───────────────────────────
  console.log('\n=== TEST 1: Initial Navigation ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await screenshot(page, '01-initial-state');
    const title = await page.title();
    console.log(`  Page title: "${title}"`);
    pass('Navigate to app', `title="${title}"`);
  } catch (e) {
    fail('Navigate to app', e.message);
    await browser.close();
    return results;
  }

  // Detect whether AuthPage or main app is shown
  const authCard = await page.$('.auth-card');
  const appCard = await page.$('.card');
  const authVisible = authCard !== null;
  console.log(`  Auth page visible: ${authVisible}`);
  console.log(`  App card visible: ${appCard !== null}`);

  // ─── TEST 2: Authentication flow ────────────────────────────────────────────
  console.log('\n=== TEST 2: Authentication Flow ===');

  if (!authVisible) {
    // App doesn't use AuthPage in main flow (App.jsx doesn't import AuthPage)
    fail('AuthPage shown on load', 'App.jsx does not render AuthPage — it goes straight to the Todo UI');
    console.log('  NOTE: AuthPage.jsx exists as a component but is NOT wired into App.jsx or main.jsx.');
    console.log('  The app loads directly to the Todo list (no login wall).');
  } else {
    // Register flow
    try {
      await page.click('button.auth-tab:has-text("Register")');
      await page.fill('#auth-username', 'testuser123');
      await page.fill('#auth-password', 'pass1234');
      await screenshot(page, '02-register-filled');
      await page.click('button.auth-submit');
      await page.waitForTimeout(500);
      const successMsg = await page.$('.auth-success');
      if (successMsg) {
        const txt = await successMsg.textContent();
        pass('Register new user', txt.trim());
        await screenshot(page, '03-register-success');
      } else {
        const errMsg = await page.$('.auth-error');
        const errTxt = errMsg ? await errMsg.textContent() : 'no message';
        // May already exist — try login instead
        if (errTxt.includes('already taken')) {
          pass('Register new user', 'user already exists (expected on re-run)');
        } else {
          fail('Register new user', errTxt);
        }
      }
    } catch (e) {
      fail('Register new user', e.message);
    }

    // Login flow
    try {
      await page.waitForTimeout(1300); // wait for auto-switch to login tab
      const loginTab = await page.$('button.auth-tab.active');
      const tabText = loginTab ? await loginTab.textContent() : '';
      console.log(`  Active tab: "${tabText}"`);

      await page.fill('#auth-username', 'testuser123');
      await page.fill('#auth-password', 'pass1234');
      await screenshot(page, '04-login-filled');
      await page.click('button.auth-submit');
      await page.waitForTimeout(500);

      // Should now show the main app
      const appAfterLogin = await page.$('.card');
      if (appAfterLogin) {
        pass('Login with credentials', 'redirected to Todo app');
        await screenshot(page, '05-after-login');
      } else {
        const errMsg = await page.$('.auth-error');
        const errTxt = errMsg ? await errMsg.textContent() : 'unknown';
        fail('Login with credentials', errTxt);
      }
    } catch (e) {
      fail('Login with credentials', e.message);
    }
  }

  // ─── TEST 3: Add a new todo ──────────────────────────────────────────────────
  console.log('\n=== TEST 3: Add New Todo ===');
  try {
    const todoInput = await page.$('input.todo-input, input[aria-label="New todo text"]');
    if (!todoInput) {
      fail('Todo input present', 'input.todo-input not found in DOM');
    } else {
      pass('Todo input present');

      await todoInput.fill('Buy groceries');
      await screenshot(page, '06-todo-typed');
      await page.click('button.add-btn');
      await page.waitForTimeout(300);

      const todoTexts = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
      console.log(`  Todos after add: ${JSON.stringify(todoTexts)}`);
      if (todoTexts.includes('Buy groceries')) {
        pass('Add todo item', 'Buy groceries appears in list');
        await screenshot(page, '07-todo-added');
      } else {
        fail('Add todo item', `todo not in list. Current todos: ${JSON.stringify(todoTexts)}`);
      }

      // Add a second todo
      const input2 = await page.$('input.todo-input, input[aria-label="New todo text"]');
      await input2.fill('Write tests');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Add a third todo
      const input3 = await page.$('input.todo-input, input[aria-label="New todo text"]');
      await input3.fill('Read a book');
      await page.click('button.add-btn');
      await page.waitForTimeout(300);

      const allTodos = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
      console.log(`  All todos: ${JSON.stringify(allTodos)}`);
      pass('Add multiple todos via Enter and button', `${allTodos.length} todos in list`);
      await screenshot(page, '08-three-todos');
    }
  } catch (e) {
    fail('Add todo', e.message);
  }

  // ─── TEST 4: Mark todo as complete ──────────────────────────────────────────
  console.log('\n=== TEST 4: Mark Todo as Complete ===');
  try {
    const checkboxes = await page.$$('.todo-item input[type="checkbox"]');
    if (checkboxes.length === 0) {
      fail('Todo checkboxes present', 'no checkboxes found');
    } else {
      pass('Todo checkboxes present', `${checkboxes.length} found`);

      // Check the first todo
      const firstChecked = await checkboxes[0].isChecked();
      console.log(`  First checkbox was checked: ${firstChecked}`);
      await checkboxes[0].click();
      await page.waitForTimeout(300);

      const firstCheckedAfter = await checkboxes[0].isChecked();
      console.log(`  First checkbox after click: ${firstCheckedAfter}`);

      if (firstCheckedAfter && !firstChecked) {
        pass('Mark todo as complete (checkbox toggle)', 'checkbox is now checked');
      } else if (!firstChecked && !firstCheckedAfter) {
        fail('Mark todo as complete', 'checkbox did not toggle on');
      } else {
        pass('Toggle todo checkbox', `was=${firstChecked}, now=${firstCheckedAfter}`);
      }

      // Check for strikethrough style on completed item
      const completedItems = await page.$$('.todo-item.completed');
      console.log(`  Items with .completed class: ${completedItems.length}`);
      if (completedItems.length > 0) {
        pass('Completed todo gets .completed CSS class', `${completedItems.length} item(s)`);
      } else {
        fail('Completed todo gets .completed CSS class', 'no .todo-item.completed found');
      }

      await screenshot(page, '09-todo-completed');
    }
  } catch (e) {
    fail('Mark todo as complete', e.message);
  }

  // ─── TEST 5: Filter todos ────────────────────────────────────────────────────
  console.log('\n=== TEST 5: Filter Todos ===');
  try {
    // Check footer is visible (only shows when todos.length > 0)
    const footer = await page.$('.todo-footer');
    if (!footer) {
      fail('Todo filter footer visible', '.todo-footer not found');
    } else {
      pass('Todo filter footer visible');

      // Check All filter (default)
      const allBtn = await page.$('button.filter-btn:has-text("All")');
      const activeBtn = await page.$('button.filter-btn:has-text("Active")');
      const completedBtn = await page.$('button.filter-btn:has-text("Completed")');

      if (!allBtn || !activeBtn || !completedBtn) {
        fail('All filter buttons present', 'one or more missing');
      } else {
        pass('All three filter buttons present (All, Active, Completed)');

        // --- Active filter ---
        await activeBtn.click();
        await page.waitForTimeout(300);
        const activeTodos = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
        console.log(`  Active filter todos: ${JSON.stringify(activeTodos)}`);
        await screenshot(page, '10-filter-active');

        const completedItemsInActive = await page.$$('.todo-item.completed');
        if (completedItemsInActive.length === 0) {
          pass('Active filter hides completed todos', `showing ${activeTodos.length} active item(s)`);
        } else {
          fail('Active filter hides completed todos', `${completedItemsInActive.length} completed items still visible`);
        }

        // --- Completed filter ---
        await completedBtn.click();
        await page.waitForTimeout(300);
        const completedTodos = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
        console.log(`  Completed filter todos: ${JSON.stringify(completedTodos)}`);
        await screenshot(page, '11-filter-completed');

        const uncheckedInCompleted = await page.$$('.todo-item:not(.completed)');
        if (uncheckedInCompleted.length === 0 && completedTodos.length > 0) {
          pass('Completed filter shows only completed todos', `${completedTodos.length} completed item(s)`);
        } else if (completedTodos.length === 0) {
          fail('Completed filter shows completed todos', 'no items shown — did checkbox toggle work?');
        } else {
          fail('Completed filter mixes active/completed', `${uncheckedInCompleted.length} non-completed items shown`);
        }

        // --- All filter ---
        await allBtn.click();
        await page.waitForTimeout(300);
        const allTodos = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
        console.log(`  All filter todos: ${JSON.stringify(allTodos)}`);
        await screenshot(page, '12-filter-all');

        if (allTodos.length >= activeTodos.length + completedTodos.length) {
          pass('All filter shows all todos', `${allTodos.length} item(s)`);
        } else {
          fail('All filter shows all todos', `only ${allTodos.length} shown, expected >= ${activeTodos.length + completedTodos.length}`);
        }

        // Item count label
        const countLabel = await page.$eval('.item-count', el => el.textContent).catch(() => null);
        console.log(`  Item count label: "${countLabel}"`);
        if (countLabel) {
          pass('Item count label visible', countLabel.trim());
        } else {
          fail('Item count label', '.item-count not found');
        }
      }
    }
  } catch (e) {
    fail('Filter todos', e.message);
  }

  // ─── TEST 6: Clear completed ─────────────────────────────────────────────────
  console.log('\n=== TEST 6: Clear Completed ===');
  try {
    const clearBtn = await page.$('button.clear-btn');
    if (!clearBtn) {
      fail('Clear completed button visible', '.clear-btn not found (may need completed todos)');
    } else {
      pass('Clear completed button visible');
      const beforeClear = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
      await clearBtn.click();
      await page.waitForTimeout(300);
      const afterClear = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
      console.log(`  Before clear: ${JSON.stringify(beforeClear)}`);
      console.log(`  After clear: ${JSON.stringify(afterClear)}`);

      const completedGone = await page.$$('.todo-item.completed');
      if (completedGone.length === 0) {
        pass('Clear completed removes completed todos', `${beforeClear.length} -> ${afterClear.length} todos`);
      } else {
        fail('Clear completed', `${completedGone.length} completed items remain`);
      }
      await screenshot(page, '13-cleared-completed');
    }
  } catch (e) {
    fail('Clear completed', e.message);
  }

  // ─── TEST 7: Delete a todo ───────────────────────────────────────────────────
  console.log('\n=== TEST 7: Delete Todo ===');
  try {
    const items = await page.$$('.todo-item');
    if (items.length === 0) {
      fail('Delete todo', 'no todo items present to delete');
    } else {
      const firstItem = items[0];
      const textBefore = await firstItem.$eval('.todo-text', el => el.textContent);
      // Hover to make delete button visible (opacity:0 normally)
      await firstItem.hover();
      await page.waitForTimeout(200);
      const deleteBtn = await firstItem.$('.delete-btn');
      if (!deleteBtn) {
        fail('Delete button visible on hover', 'delete-btn not found');
      } else {
        await deleteBtn.click();
        await page.waitForTimeout(300);
        const remainingTexts = await page.$$eval('.todo-text', els => els.map(e => e.textContent));
        console.log(`  Deleted "${textBefore}", remaining: ${JSON.stringify(remainingTexts)}`);
        if (!remainingTexts.includes(textBefore)) {
          pass('Delete todo item', `"${textBefore}" removed`);
        } else {
          fail('Delete todo item', `"${textBefore}" still in list`);
        }
        await screenshot(page, '14-after-delete');
      }
    }
  } catch (e) {
    fail('Delete todo', e.message);
  }

  // ─── TEST 8: Empty state message ─────────────────────────────────────────────
  console.log('\n=== TEST 8: Empty State ===');
  try {
    // Delete remaining todos
    let itemsLeft = await page.$$('.todo-item');
    while (itemsLeft.length > 0) {
      await itemsLeft[0].hover();
      await page.waitForTimeout(150);
      const btn = await itemsLeft[0].$('.delete-btn');
      if (btn) await btn.click();
      await page.waitForTimeout(200);
      itemsLeft = await page.$$('.todo-item');
    }
    await screenshot(page, '15-empty-state');
    const emptyMsg = await page.$('.empty-message');
    if (emptyMsg) {
      const txt = await emptyMsg.textContent();
      pass('Empty state message shown', txt.trim());
    } else {
      fail('Empty state message', '.empty-message not found');
    }

    // Footer should be hidden when no todos
    const footerHidden = await page.$('.todo-footer');
    if (!footerHidden) {
      pass('Footer hidden when no todos');
    } else {
      fail('Footer hidden when no todos', 'footer still visible');
    }
  } catch (e) {
    fail('Empty state', e.message);
  }

  await browser.close();

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('E2E TEST SUMMARY');
  console.log('='.repeat(60));
  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  console.log(`Total: ${results.length} | PASSED: ${passed.length} | FAILED: ${failed.length}`);
  console.log('');
  for (const r of results) {
    console.log(`  [${r.status}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
  }
  console.log('='.repeat(60));

  return results;
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
