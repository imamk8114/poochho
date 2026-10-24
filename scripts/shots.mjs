// Captures the README/portfolio screenshots from a running `npm run preview`.
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:5188/';
const out = fileURLToPath(new URL('../screenshots/', import.meta.url));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const shot = async (name, size, example, after) => {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#ask');
  await page.getByRole('button', { name: example }).click();
  await page.waitForSelector('main section[aria-labelledby^="q-"]');
  await page.waitForTimeout(500);
  if (after) await after(page);
  await page.locator('main section[aria-labelledby^="q-"]').first().screenshot({ path: `${out}${name}.png` });
  await ctx.close();
};
await shot('hindi-trend', { width: 1000, height: 900 }, /सड़क की शिकायतें/);
await shot('kannada-map', { width: 1000, height: 1100 }, /ಜಿಲ್ಲೆ ಪ್ರಕಾರ/);
await shot('table-view', { width: 1000, height: 900 }, /Average resolution time/, p => p.getByRole('button', { name: 'Table' }).click());
await shot('mobile-map', { width: 390, height: 900 }, /Show a map of open/);
await shot('mobile-bars', { width: 390, height: 900 }, /Which 5 districts/);
await browser.close();
console.log('screenshots written');
