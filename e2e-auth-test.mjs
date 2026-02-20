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

  // Use a fresh context per run (no persistent storage)
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

  // ─── TEST 1: Navigate to app — AuthPage shown, NOT todo list ────────────────
  console.log('\n=== TEST 1: AuthPage shown on initial load ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await screenshot(page, '01-initial-load');

    const authWrapper = await page.$('.auth-wrapper');
    const authCard   = await page.$('.auth-card');
    const mainCard   = await page.$('.card');

    console.log(`  .auth-wrapper present: ${authWrapper !== null}`);
    console.log(`  .auth-card present:    ${authCard !== null}`);
    console.log(`  .card (todo) present:  ${mainCard !== null}`);

    if (authWrapper && authCard && !mainCard) {
      pass('AuthPage shown on load, NOT the todo list');
    } else if (!authWrapper) {
      fail('AuthPage shown on load', 'auth-wrapper not found — app loads todo without authentication');
    } else {
      fail('AuthPage shown on load',
        `auth-card=${authCard !== null}, todo-card=${mainCard !== null}`);
    }
  } catch (e) {
    fail('AuthPage shown on load', e.message);
    await browser.close();
    return results;
  }

  // ─── TEST 2: Register new user (testuser / test1234) ────────────────────────
  console.log('\n=== TEST 2: Register new user (testuser / test1234) ===');
  try {
    // Click Register tab
    await page.click('button.auth-tab:has-text("Register")');
    await page.waitForTimeout(300);

    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await screenshot(page, '02-register-filled');

    await page.click('button.auth-submit');
    await page.waitForTimeout(800);
    await screenshot(page, '03-register-submitted');

    const successMsg = await page.$('.auth-success');
    const errMsg     = await page.$('.auth-error');

    if (successMsg) {
      const txt = await successMsg.textContent();
      pass('Register new user "testuser"', `"${txt.trim()}"`);
    } else if (errMsg) {
      const errTxt = await errMsg.textContent();
      if (errTxt.toLowerCase().includes('already taken')) {
        pass('Register new user "testuser"', 'user already exists (valid on re-run)');
      } else {
        fail('Register new user "testuser"', errTxt.trim());
      }
    } else {
      fail('Register new user "testuser"', 'No success or error message after submit');
    }
  } catch (e) {
    fail('Register new user "testuser"', e.message);
  }

  // ─── TEST 3: Redirected to login tab after registration ─────────────────────
  console.log('\n=== TEST 3: Redirected to login tab after registration ===');
  try {
    // Registration auto-switches after 1200ms
    await page.waitForTimeout(1500);
    await screenshot(page, '04-after-register-redirect');

    // Check which tab is active by looking for the active class
    const loginTabActive = await page.$('button.auth-tab.active:has-text("Log In")');
    const submitBtn      = await page.$('button.auth-submit');
    const submitText     = submitBtn ? await submitBtn.textContent() : '';

    // Also check tab text via evaluate
    const activeTabInfo = await page.evaluate(() => {
      const tabs = document.querySelectorAll('button.auth-tab');
      const result = [];
      tabs.forEach(t => result.push({ text: t.textContent.trim(), active: t.classList.contains('active') }));
      return result;
    });
    console.log(`  Auth tabs state: ${JSON.stringify(activeTabInfo)}`);
    console.log(`  Submit button text: "${submitText.trim()}"`);

    const isLoginActive = activeTabInfo.some(t => t.text === 'Log In' && t.active);

    if (loginTabActive || isLoginActive || submitText.trim() === 'Log In') {
      pass('Redirected to login tab after registration',
        `login tab is active, submit says "${submitText.trim()}"`);
    } else {
      fail('Redirected to login tab after registration',
        `tabs: ${JSON.stringify(activeTabInfo)}, submit: "${submitText.trim()}"`);
    }
  } catch (e) {
    fail('Redirected to login tab after registration', e.message);
  }

  // ─── TEST 4: Log in with testuser / test1234 ────────────────────────────────
  console.log('\n=== TEST 4: Log in with testuser / test1234 ===');
  try {
    // Clear and fill the login form
    await page.fill('#auth-username', '');
    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', '');
    await page.fill('#auth-password', 'test1234');
    await screenshot(page, '05-login-filled');

    await page.click('button.auth-submit');
    await page.waitForTimeout(800);
    await screenshot(page, '06-after-login');

    const mainCard = await page.$('.card');
    const authCard = await page.$('.auth-card');

    if (mainCard && !authCard) {
      pass('Log in with testuser / test1234', 'redirected to todo app');
    } else if (authCard) {
      const errMsg = await page.$('.auth-error');
      const errTxt = errMsg ? await errMsg.textContent() : 'no error shown';
      fail('Log in with testuser / test1234', `still on auth page: "${errTxt.trim()}"`);
    } else {
      fail('Log in with testuser / test1234',
        `todo-card=${mainCard !== null}, auth-card=${authCard !== null}`);
    }
  } catch (e) {
    fail('Log in with testuser / test1234', e.message);
  }

  // ─── TEST 5: Username "testuser" and "Log Out" button visible ───────────────
  console.log('\n=== TEST 5: Username "testuser" and Log Out button shown ===');
  try {
    await screenshot(page, '07-todo-app-logged-in');

    const usernameEl = await page.$('.app-username');
    const logoutBtn  = await page.$('button.logout-btn');

    const usernameText = usernameEl ? (await usernameEl.textContent()).trim() : null;
    const logoutText   = logoutBtn  ? (await logoutBtn.textContent()).trim()  : null;

    console.log(`  .app-username text: "${usernameText}"`);
    console.log(`  logout-btn text:    "${logoutText}"`);

    if (usernameText === 'testuser') {
      pass('Username "testuser" shown in header');
    } else if (usernameText !== null) {
      fail('Username "testuser" shown in header', `shows "${usernameText}" instead`);
    } else {
      fail('Username shown in header', '.app-username element not found');
    }

    if (logoutText && logoutText.includes('Log Out')) {
      pass('"Log Out" button visible');
    } else if (logoutText !== null) {
      fail('"Log Out" button text', `button says "${logoutText}"`);
    } else {
      fail('"Log Out" button visible', 'button.logout-btn not found');
    }
  } catch (e) {
    fail('Username and Log Out visible', e.message);
  }

  // ─── TEST 6: Add todo "My first task" ───────────────────────────────────────
  console.log('\n=== TEST 6: Add todo item "My first task" ===');
  try {
    const todoInput = await page.$('input.todo-input');
    if (!todoInput) {
      fail('Add todo "My first task"', 'input.todo-input not found in DOM');
    } else {
      await todoInput.fill('My first task');
      await screenshot(page, '08-todo-typed');

      await page.click('button.add-btn');
      await page.waitForTimeout(500);
      await screenshot(page, '09-todo-added');

      const todoTexts = await page.$$eval('.todo-text', els => els.map(e => e.textContent.trim()));
      console.log(`  Todos in list: ${JSON.stringify(todoTexts)}`);

      if (todoTexts.includes('My first task')) {
        pass('Add todo item "My first task"', `list: ${JSON.stringify(todoTexts)}`);
      } else {
        fail('Add todo item "My first task"',
          `not found in list: ${JSON.stringify(todoTexts)}`);
      }
    }
  } catch (e) {
    fail('Add todo item "My first task"', e.message);
  }

  // ─── TEST 7: Click Log Out — verify back at login page ──────────────────────
  console.log('\n=== TEST 7: Log Out — verify return to login page ===');
  try {
    const logoutBtn = await page.$('button.logout-btn');
    if (!logoutBtn) {
      fail('Log Out button found', 'button.logout-btn not present before logout');
    } else {
      await logoutBtn.click();
      await page.waitForTimeout(600);
      await screenshot(page, '10-after-logout');

      const authWrapper = await page.$('.auth-wrapper');
      const authCard    = await page.$('.auth-card');
      const mainCard    = await page.$('.card');

      console.log(`  .auth-wrapper: ${authWrapper !== null}`);
      console.log(`  .auth-card:    ${authCard !== null}`);
      console.log(`  .card (todo):  ${mainCard !== null}`);

      if (authWrapper && authCard && !mainCard) {
        pass('Log Out returns to login page', 'auth page shown, todo hidden');
      } else if (mainCard) {
        fail('Log Out returns to login page', 'todo app still visible after logout');
      } else {
        fail('Log Out returns to login page',
          `auth=${authCard !== null}, todo=${mainCard !== null}`);
      }
    }
  } catch (e) {
    fail('Log Out returns to login page', e.message);
  }

  // ─── TEST 8: Log in again — "My first task" still there (persistence) ───────
  console.log('\n=== TEST 8: Log in again — verify per-user todo persistence ===');
  try {
    // Make sure we are on the login tab
    const loginTabBtn = await page.$('button.auth-tab:has-text("Log In")');
    if (loginTabBtn) await loginTabBtn.click();
    await page.waitForTimeout(200);

    await page.fill('#auth-username', 'testuser');
    await page.fill('#auth-password', 'test1234');
    await screenshot(page, '11-login-again-filled');

    await page.click('button.auth-submit');
    await page.waitForTimeout(800);
    await screenshot(page, '12-login-again-after');

    const mainCard = await page.$('.card');
    const authCard = await page.$('.auth-card');

    if (!mainCard) {
      fail('Login again succeeds',
        `still on auth page (auth-card=${authCard !== null})`);
    } else {
      pass('Login again succeeds', 'back in todo app');

      const todoTexts = await page.$$eval('.todo-text',
        els => els.map(e => e.textContent.trim()));
      console.log(`  Todos after re-login: ${JSON.stringify(todoTexts)}`);

      await screenshot(page, '13-todos-after-relogin');

      if (todoTexts.includes('My first task')) {
        pass('Per-user todo persistence', '"My first task" survived logout and re-login');
      } else {
        fail('Per-user todo persistence',
          `"My first task" missing after re-login. List: ${JSON.stringify(todoTexts)}`);
      }
    }
  } catch (e) {
    fail('Login again / persistence', e.message);
  }

  await browser.close();

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(62));
  console.log('AUTH E2E TEST SUMMARY');
  console.log('='.repeat(62));
  const passed = results.filter(r => r.status === 'PASS');
  const failed  = results.filter(r => r.status === 'FAIL');
  console.log(`Total: ${results.length} | PASSED: ${passed.length} | FAILED: ${failed.length}`);
  console.log('');
  for (const r of results) {
    console.log(`  [${r.status}] ${r.test}${r.detail ? ': ' + r.detail : ''}`);
  }
  console.log('='.repeat(62));

  return results;
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
