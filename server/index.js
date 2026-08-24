import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 15161);
const HOST = process.env.HOST ?? '0.0.0.0';
/** Avval lokal backend; ishlamasa domain. */
const PRIMARY_TARGET = new URL(
  process.env.API_TARGET ?? 'http://127.0.0.1:15162',
);
const FALLBACK_TARGET = new URL(
  process.env.API_FALLBACK ?? 'https://elektrolearn-api.uzbekistonmet.uz',
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

function clientFor(target) {
  return target.protocol === 'https:' ? https : http;
}

function portFor(target) {
  if (target.port) return Number(target.port);
  return target.protocol === 'https:' ? 443 : 80;
}

function isConnError(error) {
  return (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'EHOSTUNREACH' ||
    error?.code === 'EAI_AGAIN'
  );
}

function forwardedHeaders(req, target) {
  const headers = { ...req.headers, host: target.host };
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function proxyHttp(req, res) {
  void (async () => {
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      console.error('[proxy] body', req.url, error.message);
      if (!res.headersSent) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      res.end(JSON.stringify({ message: 'So‘rov o‘qilmadi' }));
      return;
    }

    const attempt = (target, isFallback) => {
      const headers = forwardedHeaders(req, target);
      delete headers.connection;
      headers['content-length'] = String(body.length);

      const upstream = clientFor(target).request(
        {
          hostname: target.hostname,
          port: portFor(target),
          path: req.url,
          method: req.method,
          headers,
        },
        (upstreamResponse) => {
          res.writeHead(
            upstreamResponse.statusCode ?? 502,
            upstreamResponse.headers,
          );
          upstreamResponse.pipe(res);
        },
      );

      upstream.on('error', (error) => {
        console.error(
          `[proxy]${isFallback ? ' fallback' : ''}`,
          target.origin,
          req.url,
          error.message,
        );
        if (
          !isFallback &&
          isConnError(error) &&
          FALLBACK_TARGET.origin !== PRIMARY_TARGET.origin
        ) {
          console.warn(
            `[proxy] ${PRIMARY_TARGET.origin} ishlamayapti → ${FALLBACK_TARGET.origin}`,
          );
          attempt(FALLBACK_TARGET, true);
          return;
        }
        if (!res.headersSent) {
          res.writeHead(502, {
            'Content-Type': 'application/json; charset=utf-8',
          });
        }
        res.end(JSON.stringify({ message: 'Backend bilan aloqa yo‘q' }));
      });

      if (body.length) upstream.write(body);
      upstream.end();
    };

    attempt(PRIMARY_TARGET, false);
  })();
}

function proxyWebSocket(req, socket, head, target = PRIMARY_TARGET, isFallback = false) {
  const upstream = clientFor(target).request({
    hostname: target.hostname,
    port: portFor(target),
    path: req.url,
    method: req.method,
    headers: forwardedHeaders(req, target),
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
    console.error(
      `[proxy:ws]${isFallback ? ' fallback' : ''}`,
      target.origin,
      req.url,
      error.message,
    );
    if (
      !isFallback &&
      isConnError(error) &&
      FALLBACK_TARGET.origin !== PRIMARY_TARGET.origin
    ) {
      console.warn(
        `[proxy:ws] ${PRIMARY_TARGET.origin} ishlamayapti → ${FALLBACK_TARGET.origin}`,
      );
      proxyWebSocket(req, socket, head, FALLBACK_TARGET, true);
      return;
    }
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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: blob: https: http:; " +
      "connect-src 'self' https: wss: ws:; " +
      "font-src 'self' data: https: https://fonts.gstatic.com",
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
  console.log(`Backend primary   : ${PRIMARY_TARGET.origin}`);
  console.log(`Backend fallback  : ${FALLBACK_TARGET.origin}`);
});
