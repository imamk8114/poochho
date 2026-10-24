// End-to-end check of the offline story, in a real browser, against a running `npm run preview` (port 5188):
//   1. the service worker installs and the app is marked "saved for offline use"
//   2. with the network cut, a reload still works and a question is answered
//   3. a question nothing offline can read is queued, then answered by (a mocked) Sarvam once back online
//   4. first load over a throttled "slow 4G" connection, and the weight of what was downloaded
// Needs the locally installed Chrome. Run with: npm run build && npm run preview, then npm run e2e
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:5188/';
const root = new URL('..', import.meta.url);
const shots = fileURLToPath(new URL('screenshots/', root));
mkdirSync(shots, { recursive: true });
const failures = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!ok) failures.push(name); };

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const errors = [];

// ---- 1-3: offline behaviour
const context = await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await context.addInitScript(() => { try { sessionStorage.setItem('poochho-key', 'sk_test_mock'); } catch {} });
// A stand-in for api.sarvam.ai, so the queue-then-answer path can be tested without a real key.
await context.route('https://api.sarvam.ai/**', route => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const plan = { metric: 'count', groupBy: 'month', filters: { categories: ['water'] } };
  return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan) } }] }) });
});
const page = await context.newPage();
// Netlify injects its own script (/.netlify/...) into pages it hosts; it cannot load offline and is not part of the app.
page.on('console', m => { if (m.type() === 'error' && !m.location().url.includes('/.netlify/')) errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#ask');
await page.getByText('Saved for offline use').waitFor({ timeout: 20000 });
check('service worker installed, app marked saved for offline use', true);
// The first load is not controlled by the worker; one reload online makes it so.
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!navigator.serviceWorker.controller);

await context.setOffline(true);
await page.waitForFunction(() => !navigator.onLine);
const t0 = Date.now();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#ask');
check('reload with the network cut loads the app', true, `${Date.now() - t0} ms`);
check('status shows offline', await page.getByText('Offline: everything still works').isVisible());

// The key is set, but offline, so Sarvam must not be called and the offline parser answers.
await page.getByRole('button', { name: /Which 5 districts have the most water complaints/ }).click();
await page.waitForSelector('ol[aria-label^="Bar chart"]');
check('question answered offline with a bar chart of 5', (await page.locator('ol[aria-label^="Bar chart"] li').count()) === 5);
check('answer says it was read by the offline parser', await page.getByText(/Read by the offline parser/).isVisible());
await page.screenshot({ path: `${shots}offline-answer.png` });

// A question the offline parser cannot read goes into the queue.
await page.fill('#ask', 'what is the meaning of life');
await page.getByRole('button', { name: 'Ask' }).click();
await page.getByText(/1 question waiting for a connection/).waitFor();
check('unreadable question queued while offline', true);
await page.screenshot({ path: `${shots}offline-queued.png` });
await page.fill('#ask', 'water trend please');
await page.getByRole('button', { name: 'Ask' }).click();
// "water trend please" is readable (category water + trend) so it is answered, not queued; queue stays at 1.

// Back online: the queued question is answered by Sarvam (mocked) without any further action.
await context.setOffline(false);
await page.getByText(/Read by Sarvam/).first().waitFor({ timeout: 10000 });
check('queued question answered by Sarvam after reconnecting', true);
await page.waitForFunction(() => !/waiting for a connection/.test(document.body.innerText), null, { timeout: 5000 }).catch(() => {});
check('queue is empty after it was answered', !(await page.getByText(/waiting for a connection/).count()));
await page.screenshot({ path: `${shots}back-online.png` });

const computeText = await page.locator('main section[aria-labelledby^="q-"]').first().innerText();
const m = /computed on this device in ([\d.<a-z ]+) ms/.exec(computeText);
console.log(`INFO  query compute time: ${m ? m[1] : 'n/a'} ms (24,000 rows)`);
await context.close();

// ---- 4: first load over a throttled connection
const slow = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const sp = await slow.newPage();
const cdp = await slow.newCDPSession(sp);
await cdp.send('Network.enable');
// Lighthouse's "slow 4G" preset: 150 ms round trip, 1.6 Mbit/s down, 750 kbit/s up.
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
const t1 = Date.now();
await sp.goto(BASE, { waitUntil: 'domcontentloaded' });
await sp.waitForSelector('#ask');
const interactive = Date.now() - t1;
await sp.getByRole('button', { name: /Average resolution time/ }).click();
await sp.waitForSelector('ol[aria-label^="Bar chart"]');
const first = Date.now() - t1;
console.log(`INFO  slow-4G first load: input visible in ${interactive} ms, first answer drawn in ${first} ms`);
await sp.screenshot({ path: `${shots}mobile-slow-4g.png` });
await slow.close();

const dist = fileURLToPath(new URL('dist/assets/', root));
const files = readdirSync(dist).filter(f => /\.(js|css)$/.test(f) && !/^(BubbleMap|LineChart)/.test(f));
const gz = files.reduce((n, f) => n + gzipSync(readFileSync(dist + f)).length, 0);
console.log(`INFO  initial download (JS+CSS, gzip): ${(gz / 1024).toFixed(1)} kB`);

check('no console errors', errors.length === 0, errors.join(' | ').slice(0, 200));
await browser.close();
if (failures.length) { console.error(`\n${failures.length} check(s) failed`); process.exit(1); }
console.log('\nAll checks passed');
