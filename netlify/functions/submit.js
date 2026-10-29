/*
  Crossroads Leadership Academy form handler (Netlify Function).

  Every form on the site posts here, at /api/submit. This function:
    1. parses the submission (JSON from the site's script, or a plain form post),
    2. silently drops honeypot hits (the hidden "website" field),
    3. validates each field for its form type,
    4. tags the submission (Student, Mentor, Sponsor, Volunteer, Newsletter, or the
       contact form's "I am a" value),
    5. forwards it to the destination named by FORM_DESTINATION.

  FORM_DESTINATION
    webhook    POST the submission as JSON to GHL_WEBHOOK_URL (GoHighLevel inbound webhook, Zapier, Make)
    mailchimp  add or update the contact in MAILCHIMP_LIST_ID with tags and a note (needs MAILCHIMP_API_KEY)
    email      email the submission to NOTIFY_EMAIL (needs RESEND_API_KEY and EMAIL_FROM)
    log        print the submission to the function log only (local testing)

  Nothing is stored by this function or on the website. See README.md for every variable.
*/
'use strict';

const crypto = require('crypto');

const MAX_BODY = 20000; // bytes
const TIMEOUT_MS = 8000;

// ---------- Form definitions ----------
// type: text (default), email, phone. oneOf: allowed values. Fields not listed here are dropped.
const GRADES = ['7', '8', '9', '10', '11', '12'];
const HOURS = ['2-4', '4-6', '6+', 'Not sure'];
const TIERS = ['Founding Sponsor', 'Class Sponsor', 'Project Sponsor', 'Event Sponsor', 'Not sure yet'];
const I_AM = ['Parent', 'Student', 'Donor', 'Sponsor', 'Mentor', 'Media', 'Other'];

const FORMS = {
  student: {
    tag: () => 'Student',
    fields: {
      name: { required: true, max: 100 },
      grade: { required: true, oneOf: GRADES },
      school: { required: true, max: 120 },
      phone: { required: true, type: 'phone' },
      parent_name: { required: true, max: 100 },
      parent_phone: { required: true, type: 'phone' },
      goal: { required: true, max: 1000 },
    },
  },
  mentor: {
    tag: () => 'Mentor',
    fields: {
      name: { required: true, max: 100 },
      email: { required: true, type: 'email' },
      phone: { required: true, type: 'phone' },
      occupation: { required: true, max: 120 },
      hours: { required: true, oneOf: HOURS },
      why: { required: true, max: 1000 },
    },
  },
  sponsor: {
    tag: () => 'Sponsor',
    fields: {
      business: { required: true, max: 120 },
      name: { required: true, max: 100 },
      email: { required: true, type: 'email' },
      phone: { required: true, type: 'phone' },
      tier: { required: true, oneOf: TIERS },
    },
  },
  contact: {
    tag: (d) => d.i_am,
    fields: {
      name: { required: true, max: 100 },
      email: { required: true, type: 'email' },
      phone: { type: 'phone' },
      i_am: { required: true, oneOf: I_AM },
      message: { required: true, max: 2000 },
    },
  },
  volunteer: {
    tag: () => 'Volunteer',
    fields: {
      name: { required: true, max: 100 },
      email: { required: true, type: 'email' },
      phone: { type: 'phone' },
      interest: { max: 1000 },
    },
  },
  newsletter: {
    tag: () => 'Newsletter',
    fields: {
      email: { required: true, type: 'email' },
    },
  },
};

// Human-readable labels for emails and notes.
const LABELS = {
  name: 'Name', grade: 'Grade', school: 'School', phone: 'Phone', parent_name: 'Parent or guardian',
  parent_phone: 'Parent or guardian phone', goal: 'What do you want to be different a year from now?',
  email: 'Email', occupation: 'Occupation', hours: 'Hours per month', why: 'Why they want to mentor',
  business: 'Business', tier: 'Level of interest', i_am: 'I am a', message: 'Message',
  interest: 'How they would like to help',
};

// Confirmation text for visitors without JavaScript (the site's script shows its own).
const CONFIRMATIONS = {
  student: 'Got it. A real person will call you within three days.',
  mentor: 'Thank you. We will reach out to schedule a short conversation.',
  sponsor: 'Your packet is on the way. Expect a call from our Executive Director.',
  contact: 'Received. We answer within one business day.',
  volunteer: 'Thank you. We will reach out when the next event is on the calendar.',
  newsletter: 'You are on the list. Watch for the next student update.',
};

// ---------- Parsing and validation ----------

function parseBody(event) {
  let raw = event.body || '';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (Buffer.byteLength(raw) > MAX_BODY) return { tooLarge: true };
  const type = (event.headers['content-type'] || '').toLowerCase();
  if (type.includes('application/json')) {
    try {
      const data = JSON.parse(raw);
      return { data: data && typeof data === 'object' && !Array.isArray(data) ? data : {} };
    } catch (e) {
      return { data: null };
    }
  }
  return { data: Object.fromEntries(new URLSearchParams(raw)) };
}

function clean(value) {
  if (value == null) return '';
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function formatPhone(value) {
  let d = value.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length !== 10) return null;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function validate(def, input) {
  const values = {};
  const errors = {};
  for (const [name, rule] of Object.entries(def.fields)) {
    let v = clean(input[name]);
    if (!v) {
      if (rule.required) errors[name] = rule.oneOf ? 'choose' : 'required';
      continue;
    }
    if (rule.type === 'email') {
      v = v.toLowerCase();
      if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { errors[name] = 'email'; continue; }
    } else if (rule.type === 'phone') {
      const p = formatPhone(v);
      if (!p) { errors[name] = 'phone'; continue; }
      v = p;
    } else if (rule.oneOf && !rule.oneOf.includes(v)) {
      errors[name] = 'choose';
      continue;
    }
    if (rule.max && v.length > rule.max) v = v.slice(0, rule.max);
    values[name] = v;
  }
  return { values, errors };
}

function splitName(full) {
  const parts = (full || '').split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

function siteUrl() {
  return (process.env.SITE_URL || process.env.URL || 'https://crossroadsleadershipacademy.org').replace(/\/$/, '');
}

function packetUrl() {
  return process.env.SPONSOR_PACKET_URL || `${siteUrl()}/assets/docs/sponsor-packet.pdf`;
}

function buildSubmission(formType, def, values, input) {
  const tag = def.tag(values);
  const { first, last } = splitName(values.name);
  const submission = {
    form_type: formType,
    tag,
    tags: [tag, 'Website'],
    submitted_at: new Date().toISOString(),
    language: clean(input.language) === 'es' ? 'es' : 'en',
    source_page: clean(input.page).slice(0, 200),
    first_name: first,
    last_name: last,
    ...values,
  };
  if (formType === 'sponsor') submission.sponsor_packet_url = packetUrl();
  return submission;
}

function summary(s) {
  const lines = [`Form: ${s.form_type}`, `Tag: ${s.tag}`];
  for (const [k, label] of Object.entries(LABELS)) if (s[k]) lines.push(`${label}: ${s[k]}`);
  lines.push(`Language: ${s.language === 'es' ? 'Spanish' : 'English'}`);
  if (s.source_page) lines.push(`Page: ${s.source_page}`);
  lines.push(`Submitted: ${s.submitted_at}`);
  return lines.join('\n');
}

// ---------- Destinations ----------

async function request(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`${options.method || 'GET'} ${url.split('?')[0]} returned ${res.status}: ${text.slice(0, 300)}`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Missing environment variable(s): ${missing.join(', ')}`);
}

async function toWebhook(s) {
  requireEnv('GHL_WEBHOOK_URL');
  await request(process.env.GHL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  });
}

function emailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail({ to, subject, text, replyTo }) {
  requireEnv('RESEND_API_KEY', 'EMAIL_FROM');
  const base = (process.env.RESEND_API_BASE || 'https://api.resend.com').replace(/\/$/, '');
  const body = { from: process.env.EMAIL_FROM, to, subject, text };
  if (replyTo) body.reply_to = replyTo;
  await request(`${base}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function toEmail(s) {
  requireEnv('NOTIFY_EMAIL');
  const who = s.business ? `${s.business} (${s.name})` : (s.name || s.email);
  await sendEmail({
    to: process.env.NOTIFY_EMAIL.split(',').map((x) => x.trim()).filter(Boolean),
    subject: `[${s.tag}] New website submission from ${who}`,
    text: summary(s),
    replyTo: s.email,
  });
}

async function toMailchimp(s) {
  requireEnv('MAILCHIMP_API_KEY', 'MAILCHIMP_LIST_ID');
  const key = process.env.MAILCHIMP_API_KEY;
  const dc = key.split('-')[1];
  if (!dc) throw new Error('MAILCHIMP_API_KEY should end in a data center suffix such as -us21');
  const base = (process.env.MAILCHIMP_API_BASE || `https://${dc}.api.mailchimp.com`).replace(/\/$/, '');
  const hash = crypto.createHash('md5').update(s.email.toLowerCase()).digest('hex');
  const member = `${base}/3.0/lists/${encodeURIComponent(process.env.MAILCHIMP_LIST_ID)}/members/${hash}`;
  const headers = {
    Authorization: `Basic ${Buffer.from(`crossroads:${key}`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
  // Newsletter signups opt in to marketing email. Everyone else is added as transactional,
  // so an application never subscribes someone to the newsletter without asking.
  await request(member, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      email_address: s.email,
      status_if_new: s.form_type === 'newsletter' ? 'subscribed' : 'transactional',
      merge_fields: { FNAME: s.first_name || '', LNAME: s.last_name || '' },
    }),
  });
  await request(`${member}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tags: s.tags.map((name) => ({ name, status: 'active' })) }),
  });
  if (s.form_type !== 'newsletter') {
    await request(`${member}/notes`, { method: 'POST', headers, body: JSON.stringify({ note: summary(s).slice(0, 1000) }) });
  }
}

async function forward(s) {
  const destination = (process.env.FORM_DESTINATION || '').toLowerCase();
  switch (destination) {
    case 'webhook':
      return toWebhook(s);
    case 'email':
      return toEmail(s);
    case 'mailchimp':
      // Student applications have no email address, so Mailchimp cannot hold them.
      // They go to NOTIFY_EMAIL instead. Other forms also notify staff when email is set up.
      if (!s.email) return toEmail(s);
      await toMailchimp(s);
      if (process.env.NOTIFY_EMAIL && emailReady()) await toEmail(s);
      return undefined;
    case 'log':
      console.log('[form] log destination, submission not forwarded:\n' + JSON.stringify(s, null, 2));
      return undefined;
    default:
      throw new Error(`FORM_DESTINATION must be webhook, mailchimp, email, or log (got "${destination || 'nothing'}")`);
  }
}

// Sponsor packet requests get the PDF by email when a sender is configured.
// With the webhook destination, GoHighLevel can send it instead using sponsor_packet_url.
async function sendSponsorPacket(s) {
  if (s.form_type !== 'sponsor' || !emailReady()) return;
  const text = [
    `Hello ${s.first_name || 'there'},`,
    '',
    'Thank you for your interest in sponsoring Crossroads Leadership Academy.',
    `Here is the Sponsor Packet: ${s.sponsor_packet_url}`,
    '',
    'Our Executive Director will call you to talk through the level that fits your business.',
    '',
    'Crossroads Leadership Academy',
    `${siteUrl()}/`,
  ].join('\n');
  try {
    await sendEmail({ to: [s.email], subject: 'Your Crossroads Leadership Academy Sponsor Packet', text });
  } catch (err) {
    console.error('[form] sponsor packet email failed:', err.message);
  }
}

// ---------- HTTP ----------

function wantsJson(event) {
  const accept = (event.headers.accept || '').toLowerCase();
  const type = (event.headers['content-type'] || '').toLowerCase();
  return accept.includes('application/json') || type.includes('application/json');
}

function htmlPage(title, message, back) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="robots" content="noindex"><title>${esc(title)} | Crossroads Leadership Academy</title>` +
    `<link rel="stylesheet" href="/assets/css/site.css"></head><body><main id="main" class="section"><div class="container narrow">` +
    `<h1>${esc(title)}</h1><p class="lead">${esc(message)}</p><p><a class="btn btn--navy" href="${esc(back)}">Go back</a></p>` +
    `</div></main></body></html>`;
}

function respond(event, status, body, fallback) {
  if (wantsJson(event)) {
    return { statusCode: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
  }
  return { statusCode: status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: htmlPage(fallback.title, fallback.message, fallback.back) };
}

async function handler(event) {
  event.headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const back = (() => {
    try { return new URL(event.headers.referer).pathname || '/'; } catch (e) { return '/'; }
  })();

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { Allow: 'POST, OPTIONS' }, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST, OPTIONS', 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'method_not_allowed' }) };
  }

  const parsed = parseBody(event);
  if (parsed.tooLarge) return respond(event, 413, { ok: false, error: 'too_large' }, { title: 'That was too long', message: 'Please shorten your message and try again.', back });
  const input = parsed.data;
  if (!input) return respond(event, 400, { ok: false, error: 'bad_request' }, { title: 'Something went wrong', message: 'Please go back and try again.', back });

  // Honeypot: people never see this field, bots fill it in. Pretend it worked and drop it.
  if (clean(input.website)) {
    return respond(event, 200, { ok: true }, { title: 'Thank you', message: 'Received.', back });
  }

  const formType = clean(input.form_type).toLowerCase();
  const def = FORMS[formType];
  if (!def) return respond(event, 400, { ok: false, error: 'unknown_form' }, { title: 'Something went wrong', message: 'Please go back and try again.', back });

  const { values, errors } = validate(def, input);
  if (Object.keys(errors).length) {
    const list = Object.keys(errors).map((k) => LABELS[k] || k).join(', ');
    return respond(event, 422, { ok: false, errors }, { title: 'Please check the form', message: `These fields need attention: ${list}.`, back });
  }

  const submission = buildSubmission(formType, def, values, input);
  try {
    await forward(submission);
  } catch (err) {
    console.error(`[form] ${submission.tag} submission failed:`, err.message);
    return respond(event, 502, { ok: false, error: 'delivery_failed' }, {
      title: 'Your form was not sent', message: 'Something went wrong on our end. Please try again in a minute.', back,
    });
  }
  await sendSponsorPacket(submission);

  console.log(`[form] ${submission.tag} submission forwarded to ${process.env.FORM_DESTINATION}`);
  return respond(event, 200, { ok: true, tag: submission.tag }, { title: 'Thank you', message: CONFIRMATIONS[formType], back });
}

module.exports = { handler, FORMS, validate, buildSubmission };
