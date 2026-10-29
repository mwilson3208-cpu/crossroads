/*
  Vercel adapter for the form handler. Netlify does not use this file.
  Vercel serves files in api/ as functions, so /api/submit runs this, which hands
  the request to the same code Netlify runs (netlify/functions/submit.js).
*/
'use strict';

const { handler } = require('../netlify/functions/submit.js');

async function rawBody(req) {
  const type = String(req.headers['content-type'] || '');
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') {
    return type.includes('application/json') ? JSON.stringify(req.body) : new URLSearchParams(req.body).toString();
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async (req, res) => {
  const result = await handler({
    httpMethod: req.method,
    headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
    body: await rawBody(req),
    isBase64Encoded: false,
  });
  res.statusCode = result.statusCode;
  for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v);
  res.end(result.body || '');
};
