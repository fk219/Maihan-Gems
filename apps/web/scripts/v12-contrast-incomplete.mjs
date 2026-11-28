import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const AXE = readFileSync(path.resolve(here, '../node_modules/axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE_URL ?? 'http://localhost:3113';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.evaluate(AXE);
const nodes = await page.evaluate(async () => {
  const result = await window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    resultTypes: ['incomplete'],
  });
  const contrast = result.incomplete.filter((item) => item.id === 'color-contrast');
  return contrast.flatMap((item) =>
    item.nodes.map((node) => ({
      target: node.target.join(' '),
      html: node.html.slice(0, 160),
      summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 200),
      data: node.any?.[0]?.data ?? null,
    })),
  );
});
console.log(JSON.stringify(nodes, null, 1));
await browser.close();
