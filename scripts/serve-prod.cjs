/**
 * Production: static ElektroLearn admin + /api proxy → backend (1312).
 * Backend global prefix: /api — path saqlanadi.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? '0.0.0.0';
const API_TARGET = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:1312';
const DIST = path.join(__dirname, '..', 'dist');

const api = new URL(API_TARGET);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function clientIp(req) {
  const raw = req.socket.remoteAddress ?? '';
  return raw.replace(/^::ffff:/, '') || 'unknown';
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function proxyToApi(req, res) {
  const upstreamPath = req.url;
  const ip = clientIp(req);
  const headers = { ...req.headers, host: api.host };

  const prior = headers['x-forwarded-for'];
  headers['x-forwarded-for'] = prior ? `${prior}, ${ip}` : ip;
  headers['x-real-ip'] = ip;
  delete headers.connection;

  const options = {
    hostname: api.hostname,
    port: api.port || (api.protocol === 'https:' ? 443 : 80),
    path: upstreamPath,
    method: req.method,
    headers,
  };

  const upstream = http.request(options, (upRes) => {
    res.writeHead(upRes.statusCode ?? 502, upRes.headers);
    upRes.pipe(res);
  });

  upstream.on('error', (err) => {
    console.error('[proxy]', upstreamPath, err.message);
    sendJson(res, 502, {
      statusCode: 502,
      message: 'ElektroLearn backend ga ulanib bo‘lmadi. el-api ishlayaptimi?',
      error: err.message,
    });
  });

  req.pipe(upstream);
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(DIST, urlPath));
  if (!filePath.startsWith(DIST)) {
    sendJson(res, 403, { message: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, 'index.html'), (err2, html) => {
        if (err2) {
          sendJson(res, 404, { message: 'dist topilmadi — avval npm run build qiling' });
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    proxyToApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`ElektroLearn admin: http://${HOST}:${PORT}`);
  console.log(`API proxy        : ${API_TARGET} (/api/*)`);
});
