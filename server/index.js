import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 15161);
const HOST = process.env.HOST ?? '0.0.0.0';
const BACKEND_TARGET = new URL(
  process.env.API_TARGET ?? 'http://127.0.0.1:15162',
);
const DIST = path.resolve(__dirname, '../dist');

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function forwardedHeaders(req) {
  const headers = { ...req.headers, host: BACKEND_TARGET.host };
  const remoteAddress = req.socket.remoteAddress?.replace(/^::ffff:/, '') ?? '';
  const previous = headers['x-forwarded-for'];
  headers['x-forwarded-for'] = previous
    ? `${previous}, ${remoteAddress}`
    : remoteAddress;
  headers['x-real-ip'] = remoteAddress;
  return headers;
}

function isBackendPath(url = '/') {
  const pathname = url.split('?')[0];
  return (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/uploads' ||
    pathname.startsWith('/uploads/') ||
    pathname === '/socket.io' ||
    pathname.startsWith('/socket.io/')
  );
}

function proxyHttp(req, res) {
  const headers = forwardedHeaders(req);
  delete headers.connection;

  const upstream = http.request(
    {
      hostname: BACKEND_TARGET.hostname,
      port: BACKEND_TARGET.port || 80,
      path: req.url,
      method: req.method,
      headers,
    },
    (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    console.error('[proxy]', req.url, error.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ message: 'Backend bilan aloqa yo‘q' }));
  });

  req.pipe(upstream);
}

function proxyWebSocket(req, socket, head) {
  const upstream = http.request({
    hostname: BACKEND_TARGET.hostname,
    port: BACKEND_TARGET.port || 80,
    path: req.url,
    method: req.method,
    headers: forwardedHeaders(req),
  });

  upstream.on('upgrade', (response, upstreamSocket, upstreamHead) => {
    let responseHeaders =
      `HTTP/1.1 ${response.statusCode ?? 101} ${response.statusMessage ?? 'Switching Protocols'}\r\n`;
    for (let index = 0; index < response.rawHeaders.length; index += 2) {
      responseHeaders +=
        `${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}\r\n`;
    }
    socket.write(`${responseHeaders}\r\n`);
    if (head.length) upstreamSocket.write(head);
    if (upstreamHead.length) socket.write(upstreamHead);
    socket.pipe(upstreamSocket).pipe(socket);
  });

  upstream.on('error', (error) => {
    console.error('[proxy:ws]', req.url, error.message);
    socket.destroy();
  });

  upstream.end();
}

function sendStatic(req, res) {
  const requestedPath = decodeURIComponent(req.url.split('?')[0]);
  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.slice(1);
  const filePath = path.resolve(DIST, relativePath);
  const safePath =
    filePath === DIST || filePath.startsWith(`${DIST}${path.sep}`)
      ? filePath
      : path.join(DIST, 'index.html');

  fs.readFile(safePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(DIST, 'index.html'), (indexError, indexHtml) => {
        if (indexError) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('dist topilmadi — avval npm run build qiling');
          return;
        }
        res.writeHead(200, securityHeaders('text/html; charset=utf-8'));
        res.end(indexHtml);
      });
      return;
    }

    const contentType = MIME[path.extname(safePath).toLowerCase()] ??
      'application/octet-stream';
    const cacheControl = relativePath === 'index.html'
      ? 'no-cache'
      : 'public, max-age=31536000, immutable';
    res.writeHead(200, securityHeaders(contentType, cacheControl));
    res.end(data);
  });
}

function securityHeaders(contentType, cacheControl = 'no-cache') {
  return {
    'Cache-Control': cacheControl,
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; " +
      "connect-src 'self'; font-src 'self' data: https:",
    'Content-Type': contentType,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  };
}

const server = http.createServer((req, res) => {
  if (isBackendPath(req.url)) {
    proxyHttp(req, res);
    return;
  }
  sendStatic(req, res);
});

server.on('upgrade', (req, socket, head) => {
  if (!isBackendPath(req.url)) {
    socket.destroy();
    return;
  }
  proxyWebSocket(req, socket, head);
});

server.listen(PORT, HOST, () => {
  console.log(`ElektroLearn admin: http://${HOST}:${PORT}`);
  console.log(`Backend proxy    : ${BACKEND_TARGET.origin}`);
});
