#!/usr/bin/env node
/*
  Prints the one-page PDFs from their HTML sources in docs-src/:
    docs-src/program-overview.html  ->  assets/docs/program-overview.pdf
    docs-src/sponsor-packet.html    ->  assets/docs/sponsor-packet.pdf
  Needs Playwright with Chromium: npm install --no-save playwright && npx playwright install chromium

    npm run pdfs
*/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const DOCS = ['program-overview', 'sponsor-packet'];

(async () => {
  fs.mkdirSync(path.join(ROOT, 'assets', 'docs'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const name of DOCS) {
    await page.goto('file://' + path.join(ROOT, 'docs-src', `${name}.html`), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(ROOT, 'assets', 'docs', `${name}.pdf`);
    await page.pdf({ path: out, format: 'Letter', printBackground: true, pageRanges: '1' });
    console.log(`Wrote assets/docs/${name}.pdf`);
  }
  await browser.close();
})();
