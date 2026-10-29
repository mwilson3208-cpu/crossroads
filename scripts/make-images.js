#!/usr/bin/env node
/*
  Renders the social sharing image and logo PNGs from the HTML sources in docs-src/.
  Needs Playwright with Chromium: npm install --no-save playwright && npx playwright install chromium

    npm run images
*/
'use strict';
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const src = (f) => 'file://' + path.join(ROOT, 'docs-src', f);
const out = (f) => path.join(ROOT, 'assets', 'img', f);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(src('og-image.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out('og-default.jpg'), type: 'jpeg', quality: 86 });

  await page.setViewportSize({ width: 512, height: 512 });
  await page.goto(src('logo.html'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: out('logo.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });

  const small = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 180 / 512 });
  await small.goto(src('logo.html'), { waitUntil: 'networkidle' });
  await small.screenshot({ path: out('apple-touch-icon.png'), clip: { x: 0, y: 0, width: 512, height: 512 } });

  await browser.close();
  console.log('Wrote assets/img/og-default.jpg, logo.png, apple-touch-icon.png');
})();
