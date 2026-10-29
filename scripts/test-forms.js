#!/usr/bin/env node
/*
  Tests for the form handler (netlify/functions/submit.js). No network needed:
  a local mock stands in for GoHighLevel, Mailchimp, and the Resend email API.

    npm test
*/
'use strict';

const http = require('http');
const assert = require('assert/strict');

const calls = [];
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    calls.push({ method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null });
    const fail = req.url.startsWith('/fail');
    res.writeHead(fail ? 500 : 200, { 'Content-Type': 'application/json' });
    res.end(fail ? '{"error":"boom"}' : '{"id":"ok"}');
  });
});

const VALID = {
  student: { name: 'Test Student', grade: '10', school: 'Test High School', phone: '956-555-0100', parent_name: 'Test Parent', parent_phone: '(956) 555-0101', goal: 'Have a plan for college.' },
  mentor: { name: 'Test Mentor', email: 'mentor@example.com', phone: '9565550102', occupation: 'Engineer', hours: '2-4', why: 'Someone did it for me.' },
  sponsor: { business: 'Test Business LLC', name: 'Test Owner', email: 'owner@example.com', phone: '956-555-0103', tier: 'Class Sponsor' },
  contact: { name: 'Test Parent', email: 'parent@example.com', phone: '', i_am: 'Parent', message: 'When does the next class start?' },
  volunteer: { name: 'Test Volunteer', email: 'vol@example.com', phone: '', interest: 'Setup at graduation' },
  newsletter: { email: 'reader@example.com' },
};
const TAGS = { student: 'Student', mentor: 'Mentor', sponsor: 'Sponsor', contact: 'Parent', volunteer: 'Volunteer', newsletter: 'Newsletter' };

function event(data, { json = true, method = 'POST', raw } = {}) {
  const body = raw !== undefined ? raw : json ? JSON.stringify(data) : new URLSearchParams(data).toString();
  return {
    httpMethod: method,
    headers: json
      ? { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'http://localhost/students/' }
      : { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html', Referer: 'http://localhost/students/' },
    body,
  };
}

function setEnv(vars) {
  for (const k of ['FORM_DESTINATION', 'GHL_WEBHOOK_URL', 'MAILCHIMP_API_KEY', 'MAILCHIMP_LIST_ID', 'MAILCHIMP_API_BASE',
    'NOTIFY_EMAIL', 'RESEND_API_KEY', 'RESEND_API_BASE', 'EMAIL_FROM', 'SITE_URL']) delete process.env[k];
  Object.assign(process.env, vars);
}

let passed = 0;
async function test(name, fn) {
  calls.length = 0;
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}\n${err.stack}`);
    process.exitCode = 1;
  }
}

(async () => {
  await new Promise((r) => mock.listen(0, r));
  const base = `http://127.0.0.1:${mock.address().port}`;
  const quiet = console.log;
  const { handler } = require('../netlify/functions/submit.js');
  const run = async (ev) => {
    console.log = () => {};
    console.error = () => {};
    try { return await handler(ev); } finally { console.log = quiet; console.error = quiet; }
  };
  const webhookEnv = { FORM_DESTINATION: 'webhook', GHL_WEBHOOK_URL: `${base}/hook`, SITE_URL: 'https://crossroadsleadershipacademy.org' };

  console.log('Webhook destination (GoHighLevel)');
  for (const [type, data] of Object.entries(VALID)) {
    await test(`${type} form is validated, tagged ${TAGS[type]}, and forwarded`, async () => {
      setEnv(webhookEnv);
      const res = await run(event({ form_type: type, website: '', language: 'en', page: '/x/', ...data }));
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(JSON.parse(res.body), { ok: true, tag: TAGS[type] });
      assert.equal(calls.length, 1);
      const sent = calls[0].body;
      assert.equal(calls[0].url, '/hook');
      assert.equal(sent.form_type, type);
      assert.equal(sent.tag, TAGS[type]);
      assert.deepEqual(sent.tags, [TAGS[type], 'Website']);
      assert.equal(sent.source_page, '/x/');
      assert.ok(!('website' in sent), 'honeypot field must not be forwarded');
    });
  }

  await test('phone numbers are normalized', async () => {
    setEnv(webhookEnv);
    await run(event({ form_type: 'student', ...VALID.student }));
    assert.equal(calls[0].body.phone, '(956) 555-0100');
    assert.equal(calls[0].body.parent_phone, '(956) 555-0101');
    assert.equal(calls[0].body.first_name, 'Test');
    assert.equal(calls[0].body.last_name, 'Student');
  });

  await test('contact form is tagged with its "I am a" value', async () => {
    setEnv(webhookEnv);
    const res = await run(event({ form_type: 'contact', ...VALID.contact, i_am: 'Media' }));
    assert.equal(JSON.parse(res.body).tag, 'Media');
    assert.equal(calls[0].body.tag, 'Media');
  });

  await test('sponsor submissions carry the packet URL', async () => {
    setEnv(webhookEnv);
    await run(event({ form_type: 'sponsor', ...VALID.sponsor }));
    assert.equal(calls[0].body.sponsor_packet_url, 'https://crossroadsleadershipacademy.org/assets/docs/sponsor-packet.pdf');
  });

  await test('Spanish submissions are marked', async () => {
    setEnv(webhookEnv);
    await run(event({ form_type: 'newsletter', language: 'es', ...VALID.newsletter }));
    assert.equal(calls[0].body.language, 'es');
  });

  await test('unknown fields are dropped', async () => {
    setEnv(webhookEnv);
    await run(event({ form_type: 'newsletter', ...VALID.newsletter, ssn: '123' }));
    assert.ok(!('ssn' in calls[0].body));
  });

  console.log('Honeypot and validation');
  await test('honeypot hit is accepted silently and not forwarded', async () => {
    setEnv(webhookEnv);
    const res = await run(event({ form_type: 'mentor', website: 'http://spam.example', ...VALID.mentor }));
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 0);
  });

  await test('missing required fields return field codes', async () => {
    setEnv(webhookEnv);
    const res = await run(event({ form_type: 'student', name: 'Only A Name' }));
    assert.equal(res.statusCode, 422);
    const { errors } = JSON.parse(res.body);
    assert.equal(errors.school, 'required');
    assert.equal(errors.grade, 'choose');
    assert.equal(errors.parent_phone, 'required');
    assert.equal(calls.length, 0);
  });

  await test('bad email, bad phone, and bad dropdown values are rejected', async () => {
    setEnv(webhookEnv);
    const res = await run(event({ form_type: 'sponsor', ...VALID.sponsor, email: 'not-an-email', phone: '12345', tier: 'Platinum' }));
    assert.equal(res.statusCode, 422);
    assert.deepEqual(JSON.parse(res.body).errors, { email: 'email', phone: 'phone', tier: 'choose' });
  });

  await test('unknown form type is rejected', async () => {
    setEnv(webhookEnv);
    const res = await run(event({ form_type: 'payroll', email: 'a@b.co' }));
    assert.equal(res.statusCode, 400);
  });

  await test('GET is not allowed', async () => {
    setEnv(webhookEnv);
    const res = await run(event({}, { method: 'GET' }));
    assert.equal(res.statusCode, 405);
  });

  await test('oversized bodies are rejected', async () => {
    setEnv(webhookEnv);
    const res = await run(event(null, { raw: JSON.stringify({ form_type: 'contact', message: 'x'.repeat(30000) }) }));
    assert.equal(res.statusCode, 413);
  });

  await test('malformed JSON is rejected', async () => {
    setEnv(webhookEnv);
    const res = await run(event(null, { raw: '{not json' }));
    assert.equal(res.statusCode, 400);
  });

  await test('plain form post without JavaScript gets an HTML confirmation', async () => {
    setEnv(webhookEnv);
    const res = await run(event({ form_type: 'student', ...VALID.student }, { json: false }));
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['Content-Type'], /text\/html/);
    assert.match(res.body, /A real person will call you within three days/);
    assert.equal(calls[0].body.tag, 'Student');
  });

  console.log('Email destination');
  const emailEnv = { FORM_DESTINATION: 'email', NOTIFY_EMAIL: 'team@example.org, director@example.org', RESEND_API_KEY: 're_test', RESEND_API_BASE: base, EMAIL_FROM: 'Website <forms@example.org>' };
  await test('mentor application is emailed to NOTIFY_EMAIL', async () => {
    setEnv(emailEnv);
    const res = await run(event({ form_type: 'mentor', ...VALID.mentor }));
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/emails');
    assert.equal(calls[0].headers.authorization, 'Bearer re_test');
    assert.deepEqual(calls[0].body.to, ['team@example.org', 'director@example.org']);
    assert.match(calls[0].body.subject, /^\[Mentor\]/);
    assert.match(calls[0].body.text, /Occupation: Engineer/);
    assert.equal(calls[0].body.reply_to, 'mentor@example.com');
  });

  await test('sponsor request also emails the packet to the requester', async () => {
    setEnv(emailEnv);
    await run(event({ form_type: 'sponsor', ...VALID.sponsor }));
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].body.to, ['owner@example.com']);
    assert.match(calls[1].body.text, /sponsor-packet\.pdf/);
  });

  console.log('Mailchimp destination');
  const mcEnv = { FORM_DESTINATION: 'mailchimp', MAILCHIMP_API_KEY: 'abc123-us21', MAILCHIMP_LIST_ID: 'list1', MAILCHIMP_API_BASE: base };
  await test('mentor is upserted as transactional, tagged, and given a note', async () => {
    setEnv(mcEnv);
    const res = await run(event({ form_type: 'mentor', ...VALID.mentor }));
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].method, 'PUT');
    assert.match(calls[0].url, /^\/3\.0\/lists\/list1\/members\/[a-f0-9]{32}$/);
    assert.equal(calls[0].body.status_if_new, 'transactional');
    assert.equal(calls[0].body.merge_fields.FNAME, 'Test');
    assert.deepEqual(calls[1].body.tags, [{ name: 'Mentor', status: 'active' }, { name: 'Website', status: 'active' }]);
    assert.match(calls[2].url, /\/notes$/);
  });

  await test('newsletter signup subscribes the contact', async () => {
    setEnv(mcEnv);
    await run(event({ form_type: 'newsletter', ...VALID.newsletter }));
    assert.equal(calls[0].body.status_if_new, 'subscribed');
    assert.equal(calls.length, 2);
  });

  await test('student application (no email) falls back to NOTIFY_EMAIL', async () => {
    setEnv({ ...mcEnv, ...emailEnv, FORM_DESTINATION: 'mailchimp' });
    const res = await run(event({ form_type: 'student', ...VALID.student }));
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/emails');
    assert.match(calls[0].body.subject, /^\[Student\]/);
  });

  console.log('Failures');
  await test('missing destination settings return 502 so the visitor knows to retry', async () => {
    setEnv({ FORM_DESTINATION: 'webhook' });
    const res = await run(event({ form_type: 'newsletter', ...VALID.newsletter }));
    assert.equal(res.statusCode, 502);
  });

  await test('destination errors return 502', async () => {
    setEnv({ FORM_DESTINATION: 'webhook', GHL_WEBHOOK_URL: `${base}/fail` });
    const res = await run(event({ form_type: 'newsletter', ...VALID.newsletter }));
    assert.equal(res.statusCode, 502);
  });

  await test('unset FORM_DESTINATION is an error, not a silent drop', async () => {
    setEnv({});
    const res = await run(event({ form_type: 'newsletter', ...VALID.newsletter }));
    assert.equal(res.statusCode, 502);
  });

  mock.close();
  console.log(`\n${passed} passed${process.exitCode ? ', some failed' : ''}`);
})();
