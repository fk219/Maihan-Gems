import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3108';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });

const hrefs = await page.evaluate(() =>
  [...new Set(
    [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/')),
  )],
);

const results = [];
for (const href of hrefs.sort()) {
  const response = await context.request.get(BASE + href, { maxRedirects: 0, failOnStatusCode: false });
  results.push({ href, status: response.status() });
}

await browser.close();
for (const row of results) {
  console.log(`${row.status < 400 ? 'OK  ' : 'FAIL'} ${String(row.status).padEnd(4)} ${row.href}`);
}
const bad = results.filter((r) => r.status >= 400);
console.log(`\n${results.length} internal links, ${bad.length} failing`);
process.exit(bad.length === 0 ? 0 : 1);
