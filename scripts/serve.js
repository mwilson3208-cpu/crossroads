#!/usr/bin/env node
/*
  Local preview: serves dist/ and runs the form handler at /api/submit,
  the same way Netlify does after deploy.

    npm run build && npm run serve        (http://localhost:8080)
    PORT=3000 npm run serve

  Reads a .env file in the project root if one exists, so the form handler
  can be pointed at a real destination while testing.
*/
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Minimal .env loader (KEY=value lines). Existing environment variables win.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// Without a destination, submissions are printed to this terminal instead of sent anywhere.
if (!process.env.FORM_DESTINATION) process.env.FORM_DESTINATION = 'log';

const { handler } = require('../netlify/functions/submit.js');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

function sendFile(res, file, status = 200) {
  const ext = path.extname(file);
  const long = /\/assets\//.test(file) && ext !== '.html';
  res.writeHead(status, {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': long ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
}

function resolveStatic(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.normalize(path.join(DIST, clean));
  if (!target.startsWith(DIST)) return null;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  const index = path.join(target, 'index.html');
  if (fs.existsSync(index)) return index;
  return null;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/submit' || urlPath === '/.netlify/functions/submit') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const event = {
        httpMethod: req.method,
        headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), String(v)])),
        body: Buffer.concat(chunks).toString('utf8'),
        isBase64Encoded: false,
        path: urlPath,
      };
      try {
        const out = await handler(event);
        res.writeHead(out.statusCode, out.headers || {});
        res.end(out.body || '');
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  // Trailing-slash redirect, like Netlify's pretty URLs.
  if (!path.extname(urlPath) && !urlPath.endsWith('/') && fs.existsSync(path.join(DIST, urlPath, 'index.html'))) {
    res.writeHead(301, { Location: urlPath + '/' });
    return res.end();
  }

  const file = resolveStatic(req.url);
  if (file) return sendFile(res, file);
  const notFound = path.join(DIST, '404.html');
  if (fs.existsSync(notFound)) return sendFile(res, notFound, 404);
  res.writeHead(404);
  res.end('Not found');
});

if (require.main === module) {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ is missing. Run npm run build first.');
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 8080;
  server.listen(port, () => {
    console.log(`Serving dist/ at http://localhost:${port}`);
    console.log(`Form handler destination: ${process.env.FORM_DESTINATION}`);
  });
}

module.exports = { server };
