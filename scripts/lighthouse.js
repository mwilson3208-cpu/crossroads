#!/usr/bin/env node
/*
  Runs Lighthouse (installed locally as a dev dependency) against the built site on a
  mobile profile: emulated mid-range phone, throttled 4G-class connection.

    npm run build && npm run lighthouse
    npm run lighthouse -- / /programs/ /students/      (choose pages)

  Needs Chrome or Chromium. Set CHROME_PATH if it is not found automatically.
  Reports are saved to .lighthouse/ (ignored by git). Exits non-zero if any
  category scores under 90.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.lighthouse');
const PORT = Number(process.env.PORT) || 8099;
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/programs/'];
const MIN = 90;

process.env.FORM_DESTINATION = process.env.FORM_DESTINATION || 'log';
const { server } = require('./serve.js');

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/opt/pw-browsers/chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((p) => fs.existsSync(p));
}

// Lighthouse must run as a separate, non-blocking process so this one can keep serving pages.
function run(bin, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`lighthouse exited with ${code}`))));
  });
}

server.listen(PORT, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = findChrome();
  const env = { ...process.env };
  if (chrome) env.CHROME_PATH = chrome;
  const bin = path.join(ROOT, 'node_modules', '.bin', 'lighthouse');
  let failed = false;

  for (const page of pages) {
    const name = page === '/' ? 'home' : page.replace(/\//g, '');
    const json = path.join(OUT, `${name}.report.json`);
    await run(bin, [
      `http://localhost:${PORT}${page}`,
      '--form-factor=mobile', '--screenEmulation.mobile', '--throttling-method=simulate',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json', '--output=html', `--output-path=${path.join(OUT, name)}`,
      '--chrome-flags=--headless=new --no-sandbox', '--quiet',
    ], env);
    const report = JSON.parse(fs.readFileSync(json, 'utf8'));
    const scores = Object.values(report.categories).map((c) => ({ title: c.title, score: Math.round(c.score * 100) }));
    console.log(`\n${page}`);
    for (const s of scores) {
      const flag = s.score < MIN ? '  <-- under 90' : '';
      if (s.score < MIN) failed = true;
      console.log(`  ${s.title.padEnd(16)} ${s.score}${flag}`);
    }
    const m = report.audits;
    console.log(`  LCP ${m['largest-contentful-paint'].displayValue}, FCP ${m['first-contentful-paint'].displayValue}, CLS ${m['cumulative-layout-shift'].displayValue}, TBT ${m['total-blocking-time'].displayValue}, weight ${m['total-byte-weight'].displayValue}`);
    const issues = Object.values(m).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable');
    for (const a of issues) console.log(`  - ${a.id}: ${a.title}`);
  }
  console.log(`\nReports saved in .lighthouse/`);
  server.close();
  process.exit(failed ? 1 : 0);
});
