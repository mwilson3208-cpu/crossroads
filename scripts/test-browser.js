#!/usr/bin/env node
/*
  End-to-end check of the built site in a real browser (Playwright + Chromium):
  every form submitted through the real form handler to a mock webhook, the
  Spanish toggle, Givebutter click tracking, the mobile menu, the one-gold-button
  rule, console errors, and horizontal scrolling at phone width.

    npm run build && npm run test:browser

  Needs Playwright: npm install --no-save playwright && npx playwright install chromium
*/
'use strict';

const http = require('http');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const received = [];
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => { received.push(JSON.parse(body)); res.writeHead(200); res.end('{}'); });
});

const PAGES = ['/', '/about/', '/programs/', '/students/', '/get-involved/', '/sponsors/', '/contact/', '/thank-you/', '/privacy/', '/404.html'];

const FORMS = [
  { page: '/students/', form: 'student', tag: 'Student', fill: {
    '#student-name': 'Test Student', '#student-grade': '10', '#student-school': 'Test High School', '#student-phone': '956-555-0100',
    '#student-parent-name': 'Test Parent', '#student-parent-phone': '956-555-0101', '#student-goal': 'A plan for college.' } },
  { page: '/get-involved/', form: 'mentor', tag: 'Mentor', fill: {
    '#mentor-name': 'Test Mentor', '#mentor-email': 'mentor@example.com', '#mentor-phone': '956-555-0102',
    '#mentor-occupation': 'Engineer', '#mentor-hours': '2-4', '#mentor-why': 'Someone did it for me.' } },
  { page: '/get-involved/', form: 'volunteer', tag: 'Volunteer', fill: {
    '#volunteer-name': 'Test Volunteer', '#volunteer-email': 'vol@example.com' } },
  { page: '/sponsors/', form: 'sponsor', tag: 'Sponsor', fill: {
    '#sponsor-business': 'Test Business LLC', '#sponsor-contact': 'Test Owner', '#sponsor-email': 'owner@example.com',
    '#sponsor-phone': '956-555-0103', '#sponsor-tier': 'Class Sponsor' } },
  { page: '/contact/', form: 'contact', tag: 'Donor', fill: {
    '#contact-name': 'Test Donor', '#contact-email': 'donor@example.com', '#contact-iam': 'Donor', '#contact-message': 'Can I give by check?' } },
  { page: '/', form: 'newsletter', tag: 'Newsletter', fill: { '#newsletter-email': 'reader@example.com' } },
];

// The server logs every submission; keep a handle on the real console so test results still print.
const print = console.log.bind(console);
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; print(`  ok  ${name}`); } catch (err) { print(`  FAIL ${name}\n    ${err.message}`); process.exitCode = 1; }
}

async function fill(page, fields) {
  for (const [sel, value] of Object.entries(fields)) {
    const tag = await page.$eval(sel, (el) => el.tagName);
    if (tag === 'SELECT') await page.selectOption(sel, value); else await page.fill(sel, value);
  }
}

(async () => {
  await new Promise((r) => mock.listen(0, r));
  process.env.FORM_DESTINATION = 'webhook';
  process.env.GHL_WEBHOOK_URL = `http://127.0.0.1:${mock.address().port}/hook`;
  const { server } = require('./serve.js');
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route(/givebutter\.com/, (route) => route.fulfill({ status: 200, body: 'Givebutter stand-in' }));
  const log = console.log;
  console.log = () => {};
  const restore = () => { console.log = log; };
  const say = (...a) => log(...a);

  say('Every page at 390px');
  for (const path of PAGES) {
    await test(`${path} loads with no console errors and no sideways scroll`, async () => {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      const res = await page.goto(base + path, { waitUntil: 'networkidle' });
      assert.ok(res.status() === 200 || (path === '/404.html' && res.status() === 200), `status ${res.status()}`);
      assert.deepEqual(errors, []);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `page is ${overflow}px wider than the screen`);
      await page.waitForTimeout(150);
      const gold = await page.evaluate(() => [...document.querySelectorAll('.btn--give')].filter((b) => {
        const r = b.getBoundingClientRect();
        return !b.classList.contains('is-quiet') && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
      }).length);
      assert.equal(gold, 1, `${gold} filled gold buttons on the first screen`);
      await page.close();
    });
  }

  say('Forms submit through the handler');
  for (const f of FORMS) {
    await test(`${f.form} form on ${f.page} shows its confirmation and arrives tagged ${f.tag}`, async () => {
      received.length = 0;
      const page = await context.newPage();
      await page.goto(base + f.page, { waitUntil: 'networkidle' });
      await fill(page, f.fill);
      const form = page.locator(`form[data-form="${f.form}"]`);
      const success = await form.getAttribute('data-success');
      await form.locator('[type="submit"]').click();
      await page.waitForSelector('.form__done');
      assert.equal(await page.textContent('.form__done'), success);
      assert.equal(received.length, 1);
      assert.equal(received[0].tag, f.tag);
      assert.equal(received[0].source_page, f.page);
      const events = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'form_submit'));
      assert.equal(events.length, 1);
      assert.equal(events[0].form_type, f.form);
      await page.close();
    });
  }

  await test('empty student form shows text errors and focuses the first field', async () => {
    received.length = 0;
    const page = await context.newPage();
    await page.goto(base + '/students/', { waitUntil: 'networkidle' });
    await page.click('form[data-form="student"] [type="submit"]');
    assert.equal(await page.getAttribute('#student-name', 'aria-invalid'), 'true');
    assert.equal(await page.textContent('#student-name-error'), 'This field is required.');
    assert.equal(await page.textContent('#student-grade-error'), 'Choose one option.');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'student-name');
    await page.fill('#student-phone', '123');
    await page.click('form[data-form="student"] [type="submit"]');
    assert.match(await page.textContent('#student-phone-error'), /10-digit/);
    assert.equal(received.length, 0);
    await page.close();
  });

  await test('honeypot field is off screen and out of the tab order', async () => {
    const page = await context.newPage();
    await page.goto(base + '/contact/', { waitUntil: 'networkidle' });
    const box = await page.locator('#contact-website').boundingBox();
    assert.ok(!box || box.x < 0, 'honeypot is visible');
    assert.equal(await page.getAttribute('#contact-website', 'tabindex'), '-1');
    await page.close();
  });

  say('Spanish');
  await test('toggle switches buttons, labels, and confirmations to Spanish and remembers it', async () => {
    received.length = 0;
    const page = await context.newPage();
    await page.goto(base + '/contact/', { waitUntil: 'networkidle' });
    await page.click('.site-header .lang-toggle');
    assert.equal(await page.getAttribute('html', 'lang'), 'es');
    assert.match(await page.textContent('label[for="contact-message"]'), /Mensaje/);
    assert.match(await page.textContent('.site-header .btn--give'), /Donar ahora/);
    assert.equal(await page.isVisible('.lang-note'), true);
    await fill(page, { '#contact-name': 'Madre Prueba', '#contact-email': 'madre@example.com', '#contact-iam': 'Parent', '#contact-message': 'Hola' });
    await page.click('form[data-form="contact"] [type="submit"]');
    await page.waitForSelector('.form__done');
    assert.equal(await page.textContent('.form__done'), 'Recibido. Respondemos en un día hábil.');
    assert.equal(received[0].language, 'es');
    assert.equal(received[0].i_am, 'Parent');
    await page.goto(base + '/programs/', { waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('html', 'lang'), 'es', 'language choice was not remembered');
    await page.click('.site-header .lang-toggle');
    assert.equal(await page.getAttribute('html', 'lang'), 'en');
    await page.close();
  });

  await test('?lang=es link opens in Spanish', async () => {
    const page = await context.newPage();
    await page.goto(base + '/students/?lang=es', { waitUntil: 'networkidle' });
    assert.match(await page.textContent('label[for="student-goal"]'), /diferente dentro de un año/);
    await page.evaluate(() => localStorage.clear());
    await page.close();
  });

  say('Giving and tracking');
  await test('Give Now opens Givebutter in a new tab and fires givebutter_click', async () => {
    const page = await context.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    const [popup] = await Promise.all([context.waitForEvent('page'), page.click('.site-header .btn--give')]);
    assert.match(popup.url(), /^https:\/\/givebutter\.com\/CrossroadsAcademy/);
    await popup.close();
    const ev = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'givebutter_click'));
    assert.equal(ev.length, 1);
    assert.equal(ev[0].link_location, 'header');
    assert.equal(ev[0].page_path, '/');
    await page.close();
  });

  await test('gift tier links pass the amount and the tier to tracking', async () => {
    const page = await context.newPage();
    await page.goto(base + '/get-involved/', { waitUntil: 'networkidle' });
    const [popup] = await Promise.all([context.waitForEvent('page'), page.click('a.tier[data-tier="250"]')]);
    assert.match(popup.url(), /amount=250/);
    await popup.close();
    const ev = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'givebutter_click'));
    assert.equal(ev[0].tier, '250');
    await page.close();
  });

  await test('every Givebutter link on every page opens in a new tab', async () => {
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(base + path);
      const bad = await page.evaluate(() => [...document.querySelectorAll('a[href*="givebutter.com"]')]
        .filter((a) => a.target !== '_blank' || a.dataset.track !== 'givebutter').length);
      assert.equal(bad, 0, `${path} has ${bad} untracked or same-tab Givebutter links`);
    }
    await page.close();
  });

  await test('thank-you page fires donation_complete', async () => {
    const page = await context.newPage();
    await page.goto(base + '/thank-you/', { waitUntil: 'networkidle' });
    const ev = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'donation_complete'));
    assert.equal(ev.length, 1);
    await page.close();
  });

  say('Navigation');
  await test('mobile menu opens, closes with Escape, and keeps Give Now outside', async () => {
    const page = await context.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.isVisible('#site-nav'), false);
    assert.equal(await page.isVisible('.site-header .btn--give'), true);
    await page.click('.menu-toggle');
    assert.equal(await page.isVisible('#site-nav'), true);
    assert.equal(await page.getAttribute('.menu-toggle', 'aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.isVisible('#site-nav'), false);
    await page.close();
  });

  await test('skip link is the first tab stop and jumps to main content', async () => {
    const page = await context.newPage();
    await page.goto(base + '/about/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    await page.close();
  });

  await test('contact link from Students preselects "Student"', async () => {
    const page = await context.newPage();
    await page.goto(base + '/contact/?i_am=Student', { waitUntil: 'networkidle' });
    assert.equal(await page.inputValue('#contact-iam'), 'Student');
    await page.close();
  });

  await test('desktop shows the full nav and hides the sticky bar', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.isVisible('#site-nav'), true);
    assert.equal(await page.isVisible('.sticky-bar'), false);
    assert.equal(await page.isVisible('.menu-toggle'), false);
    await page.close();
  });

  await browser.close();
  server.close();
  mock.close();
  restore();
  console.log(`\n${passed} passed${process.exitCode ? ', some failed' : ''}`);
})();
