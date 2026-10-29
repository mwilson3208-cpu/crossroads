#!/usr/bin/env node
/*
  Crossroads Leadership Academy site build.

  No framework, no bundler. It reads each source page, wraps it in the shared
  layout from partials/, fills in values from site.config.json, and writes the
  finished site to dist/.

  Syntax used inside pages and partials:
    {{> name}}        include partials/name.html
    {{site.key}}      a value from site.config.json (dots for nesting)
    {{page.key}}      a value from the page's PAGE SETTINGS block
    {{contact.key}}   computed contact markup (phone, email, address, hours, social)

  The build also:
    - opens every Givebutter link in a new tab and tags it for click tracking
    - marks the current page in the navigation
    - wraps every [CONFIRM ...] marker so it is easy to spot on the page
    - checks one H1 per page, title and description length, and the voice rules
    - writes sitemap.xml and robots.txt
*/
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PARTIALS = path.join(ROOT, 'partials');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
// On a Netlify production build, use the address the site is actually served from (Netlify sets URL to the
// custom domain once one is connected, and to the .netlify.app address before that). Everywhere else, use
// siteUrl from site.config.json. This keeps canonical tags, social images, and share links pointing at a live page.
const netlifyUrl = process.env.NETLIFY && process.env.CONTEXT === 'production' ? process.env.URL : '';
const siteUrl = (netlifyUrl || config.siteUrl).replace(/\/$/, '');
// While the site only lives on its temporary .netlify.app address, keep it out of search results.
// This switches off by itself the moment a custom domain is connected in Netlify.
const isTemporaryHost = /\.netlify\.app$/i.test(new URL(siteUrl).hostname);

// Source pages, in sitemap order. Add a folder here to add a page.
const PAGES = [
  { src: 'index.html', url: '/' },
  { src: 'about/index.html', url: '/about/' },
  { src: 'programs/index.html', url: '/programs/' },
  { src: 'students/index.html', url: '/students/' },
  { src: 'get-involved/index.html', url: '/get-involved/' },
  { src: 'sponsors/index.html', url: '/sponsors/' },
  { src: 'contact/index.html', url: '/contact/' },
  { src: 'thank-you/index.html', url: '/thank-you/' },
  { src: 'privacy/index.html', url: '/privacy/' },
  { src: '404.html', url: '/404.html' },
];

// Words and characters the voice rules forbid in visible copy.
const BANNED = [
  /\bempower\w*/i, /\btransform\w*/i, /\bjourney\w*/i, /\bmake a difference\b/i,
  /\bpassionate\w*/i, /\bsynerg\w*/i, /\bat-risk\b/i, /\bunderprivileged\b/i, /\bbroken\b/i,
];

const errors = [];
const warnings = [];
const confirmReport = [];

// ---------- helpers ----------

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lookup(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function hashFile(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 10);
}

function parseSettings(html, src) {
  const m = html.match(/<!--\s*PAGE SETTINGS([\s\S]*?)-->/);
  if (!m) throw new Error(`${src} is missing its PAGE SETTINGS block`);
  const settings = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*\S)\s*$/);
    if (kv) settings[kv[1]] = kv[2];
  }
  return { settings, body: html.replace(m[0], '') };
}

// Contact details: a real value renders as a link, an empty one as a [CONFIRM] marker.
function contactMarkup() {
  const c = {};
  const digits = (config.phone || '').replace(/\D/g, '');
  c.phone = config.phone
    ? `<a href="tel:+1${digits.slice(-10)}">${escapeHtml(config.phone)}</a>`
    : '[CONFIRM phone]';
  c.phoneText = config.phone ? escapeHtml(config.phone) : '[CONFIRM phone]';
  c.email = config.email
    ? `<a href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a>`
    : '[CONFIRM email]';
  const a = config.address || {};
  c.address = a.street && a.city
    ? `${escapeHtml(a.street)}<br>${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.zip)}`
    : '[CONFIRM mailing address]';
  c.hours = config.officeHours ? escapeHtml(config.officeHours) : '[CONFIRM office hours]';
  const names = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' };
  const links = Object.entries(config.social || {})
    .filter(([, url]) => url)
    .map(([k, url]) => `<li><a href="${escapeHtml(url)}" rel="noopener">${names[k] || k}</a></li>`);
  c.social = links.length ? `<ul class="footer__social">${links.join('')}</ul>` : '<p>[CONFIRM social links]</p>';
  return c;
}

function jsonLd() {
  const a = config.address || {};
  const org = {
    '@context': 'https://schema.org',
    // schema.org models a nonprofit as an NGO with a nonprofitStatus of Nonprofit501c3.
    '@type': 'NGO',
    name: config.brand,
    legalName: config.legalName,
    taxID: config.ein,
    nonprofitStatus: 'Nonprofit501c3',
    url: siteUrl + '/',
    logo: siteUrl + '/assets/img/logo.png',
    description: config.missionLine,
    areaServed: { '@type': 'Place', name: 'Rio Grande Valley, Texas' },
    founder: { '@type': 'Person', name: config.executiveDirector, jobTitle: 'Founder' },
    potentialAction: {
      '@type': 'DonateAction',
      name: 'Give Now',
      target: config.givebutterUrl,
      recipient: { '@type': 'Organization', name: config.brand },
    },
  };
  // Only publish contact data that has been confirmed. Empty values stay out of the schema.
  if (config.phone) org.telephone = config.phone;
  else warnings.push('JSON-LD: telephone left out until site.config.json has a phone number [CONFIRM]');
  if (config.email) org.email = config.email;
  if (a.street && a.city) {
    org.address = {
      '@type': 'PostalAddress', streetAddress: a.street, addressLocality: a.city,
      addressRegion: a.state, postalCode: a.zip, addressCountry: 'US',
    };
  } else {
    warnings.push('JSON-LD: address left out until site.config.json has a mailing address [CONFIRM]');
  }
  const sameAs = Object.values(config.social || {}).filter(Boolean);
  if (sameAs.length) org.sameAs = sameAs;
  return `<script type="application/ld+json">${JSON.stringify(org)}</script>`;
}

function analyticsSnippet() {
  const id = config.analytics && config.analytics.ga4MeasurementId;
  let out = read('partials/analytics.html');
  if (id) {
    out += `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(id)}"></script>` +
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());gtag('config','${escapeHtml(id)}');</script>`;
  }
  return out;
}

// ---------- templating ----------

function render(template, ctx, depth = 0) {
  if (depth > 10) throw new Error('Partials nested too deeply');
  let out = template.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    const file = path.join(PARTIALS, `${name}.html`);
    if (!fs.existsSync(file)) throw new Error(`Missing partial: partials/${name}.html`);
    return render(fs.readFileSync(file, 'utf8'), ctx, depth + 1);
  });
  out = out.replace(/\{\{\s*(site|page|contact|build)\.([\w.]+)\s*\}\}/g, (m, scope, key) => {
    const value = lookup(ctx[scope], key);
    if (value === undefined) throw new Error(`Unknown value ${m} in ${ctx.page.src}`);
    return value;
  });
  return out;
}

// ---------- post-processing ----------

function protect(html, fn) {
  // Keep scripts, styles, the title, form options and textareas out of text rewriting.
  const vault = [];
  const safe = html.replace(/<(script|style|title|textarea|option)\b[\s\S]*?<\/\1>/gi, (m) => {
    vault.push(m);
    return `\u0000${vault.length - 1}\u0000`;
  });
  return fn(safe).replace(/\u0000(\d+)\u0000/g, (_, i) => vault[Number(i)]);
}

function postProcess(html, page) {
  // Strip editor comments from the published HTML.
  html = html.replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, '');

  // Every Givebutter link opens in a new tab and is tracked as an outbound click.
  html = html.replace(/<a\b([^>]*?)href="(https:\/\/givebutter\.com\/[^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (m, pre, href, post, inner) => {
    let attrs = `${pre}href="${href}"${post}`;
    if (!/target=/.test(attrs)) attrs += ' target="_blank"';
    if (!/rel=/.test(attrs)) attrs += ' rel="noopener"';
    if (!/data-track=/.test(attrs)) attrs += ' data-track="givebutter"';
    const note = /class="sr-only"/.test(inner) ? '' : '<span class="sr-only"> (opens in a new tab)</span>';
    return `<a${attrs}>${inner}${note}</a>`;
  });

  // Mark the current page in the navigation.
  html = html.replace(/<a([^>]*?)data-nav="([^"]+)"([^>]*)>/g, (m, pre, nav, post) =>
    nav === page.url ? `<a${pre}data-nav="${nav}" aria-current="page"${post}>` : m);

  // Wrap [CONFIRM ...] markers in visible text so they stand out until resolved.
  html = protect(html, (safe) => safe.replace(/>([^<]+)</g, (m, text) =>
    '>' + text.replace(/\[CONFIRM[^\]]*\]/g, (s) => `<mark class="confirm">${s}</mark>`) + '<'));

  // Collapse blank lines left by removed comments.
  return html.replace(/\n\s*\n+/g, '\n');
}

// ---------- checks ----------

function visibleText(html) {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<!doctype[^>]*>/i, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

function check(html, page) {
  const where = page.src;
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) errors.push(`${where}: expected one <h1>, found ${h1}`);

  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  if (!title) errors.push(`${where}: missing <title>`);
  if (title.length > 60) errors.push(`${where}: title is ${title.length} characters (limit 60)`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!desc) errors.push(`${where}: missing meta description`);
  if (desc.length > 155) errors.push(`${where}: description is ${desc.length} characters (limit 155)`);

  const text = visibleText(html);
  for (const re of BANNED) {
    const m = text.match(re);
    if (m) errors.push(`${where}: voice rule, banned word "${m[0]}"`);
  }
  if (/—/.test(text)) errors.push(`${where}: voice rule, em dash in copy`);
  if (/!/.test(text)) errors.push(`${where}: voice rule, exclamation point in copy`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) errors.push(`${where}: voice rule, emoji in copy`);

  const imgs = html.match(/<img\b[^>]*>/g) || [];
  for (const img of imgs) {
    if (!/\balt="[^"]+"/.test(img) && !/\balt=""/.test(img)) errors.push(`${where}: image without alt text: ${img}`);
    if (/\balt="(image|photo|picture)"/i.test(img)) errors.push(`${where}: alt text must describe the person and activity: ${img}`);
  }

  const markers = text.match(/\[CONFIRM[^\]]*\]/g) || [];
  confirmReport.push({ page: page.url, count: markers.length, items: [...new Set(markers)] });
}

// ---------- copy static files ----------

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// ---------- main ----------

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  fs.writeFileSync(path.join(DIST, 'assets/css/site.css'), minifyCss(read('assets/css/site.css')));

  const buildCtx = {
    cssVersion: hashFile('assets/css/site.css'),
    jsVersion: hashFile('assets/js/site.js'),
    year: String(new Date().getFullYear()),
  };
  const contact = contactMarkup();
  const layout = read('partials/layout.html');

  for (const page of PAGES) {
    const raw = read(page.src);
    const { settings, body } = parseSettings(raw, page.src);
    const pageCtx = {
      src: page.src,
      url: page.url,
      canonical: siteUrl + page.url,
      ogImage: siteUrl + (settings.ogImage || config.ogImage),
      robots: settings.noindex === 'yes' || isTemporaryHost ? 'noindex, follow' : 'index, follow',
      bodyClass: settings.bodyClass || '',
      jsonld: settings.schema === 'nonprofit' ? jsonLd() : '',
      // heroImage: hero-home in PAGE SETTINGS preloads assets/img/hero-home-mobile.webp on phones and
      // assets/img/hero-home.webp on larger screens, so the hero photo starts loading right away.
      preload: settings.heroImage
        ? `<link rel="preload" as="image" href="/assets/img/${settings.heroImage}-mobile.webp" type="image/webp" media="(max-width: 767px)" fetchpriority="high">\n` +
          `<link rel="preload" as="image" href="/assets/img/${settings.heroImage}.webp" type="image/webp" media="(min-width: 768px)" fetchpriority="high">`
        : '',
      analytics: analyticsSnippet(),
      title: settings.title || '',
      description: settings.description || '',
      ogTitle: settings.ogTitle || settings.title || '',
    };
    const ctx = { site: { ...config, siteUrl }, page: pageCtx, contact, build: buildCtx };
    ctx.page.content = render(body, ctx);
    const html = postProcess(render(layout, ctx), page);
    check(html, page);

    const out = path.join(DIST, page.src);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
  }

  // robots.txt and sitemap.xml: source files at the repo root, values filled in here.
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.filter((p) => !['/thank-you/', '/404.html'].includes(p.url))
    .map((p) => `  <url><loc>${siteUrl}${p.url}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');
  const sitemap = read('sitemap.xml').replace('<!-- URLS -->', urls);
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), read('robots.txt').replace(/\{\{site\.siteUrl\}\}/g, siteUrl));

  report();
}

function report() {
  const total = confirmReport.reduce((n, r) => n + r.count, 0);
  console.log(`\nBuilt ${PAGES.length} pages to dist/`);
  console.log(`Open [CONFIRM] markers on the site: ${total}`);
  for (const r of confirmReport) console.log(`  ${r.page.padEnd(16)} ${r.count}`);
  if (process.argv.includes('--confirm')) {
    console.log('\nOpen items by page:');
    for (const r of confirmReport) {
      if (!r.items.length) continue;
      console.log(`\n${r.page}`);
      for (const item of r.items) console.log(`  - ${item}`);
    }
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s) found:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('Checks passed: one H1 per page, title and description lengths, voice rules, alt text.');
}

build();
