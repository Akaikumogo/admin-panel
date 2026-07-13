import { chromium } from 'playwright';

const BASE = 'https://elektrolearn.uzbekistonmet.uz';
const API = 'https://elektrolearn-api.uzbekistonmet.uz/api';
const EMAIL = 'elektroLearn@admin.com';
const PASSWORD = '!Qw3rty';

const STATIC_PAGES = [
  '/dashboard/home',
  '/dashboard/moderators',
  '/dashboard/permissions',
  '/dashboard/levels',
  '/dashboard/lessons',
  '/dashboard/audio-library',
  '/dashboard/theories',
  '/dashboard/questions',
  '/dashboard/organizations',
  '/dashboard/employees',
  '/dashboard/users',
  '/dashboard/profile',
  '/dashboard/violations',
  '/dashboard/logs',
  '/dashboard/hearts-analytics',
  '/dashboard/leaderboard',
  '/dashboard/ai-assistant',
  '/dashboard/nes-sync',
  '/dashboard/user-activity',
  '/dashboard/analytics',
  '/dashboard/analytics/underperformers',
  '/dashboard/import-export',
  '/dashboard/branch-analytics',
];

const results = [];

function pushResult(path, status, detail) {
  results.push({ path, status, detail });
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗';
  console.log(`${icon} ${path} — ${detail}`);
}

async function main() {
  // Login outside browser (avoids CORS/page context issues)
  const loginFetch = await fetch(`${API}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginJson = await loginFetch.json();
  if (!loginFetch.ok || !loginJson?.data?.accessToken) {
    pushResult('/login', 'fail', `API login failed: ${loginJson?.message || loginFetch.status}`);
    process.exit(1);
  }
  const tokens = loginJson.data;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await context.addInitScript((auth) => {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(auth.user));
  }, tokens);
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`${BASE}/dashboard/home`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const afterLogin = page.url();
  if (afterLogin.includes('/login')) {
    pushResult('/login', 'fail', `Token login failed — redirected to login`);
    await browser.close();
    process.exit(1);
  }
  pushResult('/login', 'ok', `Logged in → ${afterLogin}`);

  let orgId = null;
  let levelId = null;
  let theoryId = null;
  let questionId = null;
  let employeeId = null;

  for (const path of STATIC_PAGES) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2000);

      const body = await page.locator('body').innerText();
      const hasCrash =
        body.includes('Unexpected Application Error') ||
        body.includes('ReferenceError') ||
        body.includes('is not defined') ||
        body.includes('Something went wrong');

      if (hasCrash) {
        const snippet = body.slice(0, 300).replace(/\s+/g, ' ');
        pushResult(path, 'fail', `Crash UI: ${snippet}`);
        continue;
      }

      if (pageErrors.length) {
        pushResult(path, 'fail', `PageError: ${pageErrors[0]}`);
        continue;
      }

      // Extra: user-activity renders Tooltips — wait for table
      if (path === '/dashboard/user-activity' || path === '/dashboard/moderators') {
        await page.waitForTimeout(4000);
        if (pageErrors.length) {
          pushResult(path, 'fail', `PageError after load: ${pageErrors[0]}`);
          continue;
        }
      }

      const criticalConsole = consoleErrors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('404') &&
          !e.includes('Failed to load resource') &&
          !e.includes('WebSocket'),
      );
      if (criticalConsole.length) {
        pushResult(path, 'warn', `Console: ${criticalConsole[0].slice(0, 120)}`);
      } else {
        pushResult(path, 'ok', `OK (${page.url()})`);
      }

      // collect IDs for detail pages
      if (path === '/dashboard/organizations' && !orgId) {
        const link = page.locator('a[href*="/dashboard/organizations/"]').first();
        if (await link.count()) {
          const href = await link.getAttribute('href');
          orgId = href?.split('/').pop();
        }
      }
      if (path === '/dashboard/levels' && !levelId) {
        const link = page.locator('a[href*="/dashboard/levels/"]').first();
        if (await link.count()) {
          const href = await link.getAttribute('href');
          levelId = href?.split('/').pop();
        }
      }
      if (path === '/dashboard/theories' && !theoryId) {
        const link = page.locator('a[href*="/dashboard/theories/"]').first();
        if (await link.count()) {
          const href = await link.getAttribute('href');
          theoryId = href?.split('/').pop();
        }
      }
      if (path === '/dashboard/questions' && !questionId) {
        const link = page.locator('a[href*="/dashboard/questions/"]').first();
        if (await link.count()) {
          const href = await link.getAttribute('href');
          questionId = href?.split('/').pop();
        }
      }
      if (path === '/dashboard/employees' && !employeeId) {
        const link = page.locator('a[href*="/dashboard/employees/"], tr[data-row-key], tbody tr').first();
        if (await link.count()) {
          const href = await link.getAttribute('href');
          if (href) employeeId = href.split('/').pop();
        }
      }
      if (path === '/dashboard/analytics' && orgId) {
        await page.goto(`${BASE}/dashboard/analytics/branches/${orgId}`, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(1500);
        const bbody = await page.locator('body').innerText();
        if (bbody.includes('Unexpected Application Error') || pageErrors.length) {
          pushResult(`/dashboard/analytics/branches/${orgId}`, 'fail', pageErrors[0] || 'Crash');
        } else {
          pushResult(`/dashboard/analytics/branches/${orgId}`, 'ok', 'Branch drill-down OK');
        }
      }
    } catch (err) {
      pushResult(path, 'fail', err.message?.slice(0, 150) || String(err));
    }
  }

  const detailPages = [
    orgId && `/dashboard/organizations/${orgId}`,
    levelId && `/dashboard/levels/${levelId}`,
    theoryId && `/dashboard/theories/${theoryId}`,
    questionId && `/dashboard/questions/${questionId}`,
    employeeId && `/dashboard/employees/${employeeId}`,
  ].filter(Boolean);

  for (const path of detailPages) {
    pageErrors.length = 0;
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2000);
      const body = await page.locator('body').innerText();
      if (body.includes('Unexpected Application Error') || pageErrors.length) {
        pushResult(path, 'fail', pageErrors[0] || 'Crash');
      } else {
        pushResult(path, 'ok', 'Detail page OK');
      }
    } catch (err) {
      pushResult(path, 'fail', err.message?.slice(0, 150));
    }
  }

  await browser.close();

  const fails = results.filter((r) => r.status === 'fail');
  const warns = results.filter((r) => r.status === 'warn');
  console.log('\n=== SUMMARY ===');
  console.log(`OK: ${results.filter((r) => r.status === 'ok').length}`);
  console.log(`WARN: ${warns.length}`);
  console.log(`FAIL: ${fails.length}`);
  if (fails.length) {
    console.log('\nFailed pages:');
    for (const f of fails) console.log(`  - ${f.path}: ${f.detail}`);
  }
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
  