// Local development CORS proxy, mirroring the behavior of https://cors.stirante.com
// Proxies any request of the form http://localhost:3000/<host>/<path> to https://<host>/<path>
// (unlike @isomorphic-git/cors-proxy, which only allows git requests).
// Usage: npm run proxy

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

const STRIP_REQUEST_HEADERS = ['host', 'origin', 'referer', 'connection', 'cookie', 'authorization', 'proxy-authorization'];
const STRIP_RESPONSE_HEADERS = ['connection', 'transfer-encoding', 'access-control-allow-origin'];
// Give up on an upstream that never answers instead of hanging the page.
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 30000);

const server = http.createServer((req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  let target = req.url.slice(1);
  try {
    const check = new URL(target.startsWith('http') ? target : 'https://' + target);
    const host = check.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
        /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        /^169\.254\./.test(host) || /^127\./.test(host)) {
      res.writeHead(403, corsHeaders);
      res.end('Blocked private/loopback host');
      return;
    }
  } catch (e) {
    // fall through to normal URL parsing
  }
  if (target.startsWith('https://')) {
    // already a full URL, use as is
  } else if (target.startsWith('http://')) {
    // use as is
  } else {
    target = 'https://' + target;
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, corsHeaders);
    res.end('Invalid proxy URL: ' + target);
    return;
  }

  const headers = {...req.headers};
  for (const header of STRIP_REQUEST_HEADERS) {
    delete headers[header];
  }
  headers.host = targetUrl.host;
  // MangaDex blocks browser User-Agents on its cover CDN. Replace with a
  // non-browser UA so images can be fetched and displayed.
  if (targetUrl.hostname === 'mangadex.org' || targetUrl.hostname.endsWith('.mangadex.org')) {
    headers['user-agent'] = 'facaccimo/1.0 (local tool)';
  }

  const client = targetUrl.protocol === 'http:' ? http : https;
  const proxyReq = client.request(targetUrl, {method: req.method, headers}, proxyRes => {
    const responseHeaders = {...proxyRes.headers};
    for (const header of STRIP_RESPONSE_HEADERS) {
      delete responseHeaders[header];
    }
    // Keep redirects going through the proxy
    if (responseHeaders.location && /^https?:\/\//.test(responseHeaders.location)) {
      responseHeaders.location = '/' + responseHeaders.location.replace(/^https?:\/\//, '');
    }
    proxyRes.on('error', err => {
      console.error(req.method + ' ' + target + ' response failed: ' + err.message);
      fail(502, 'Proxy upstream error: ' + err.message);
    });
    res.writeHead(proxyRes.statusCode, {...responseHeaders, ...corsHeaders});
    proxyRes.pipe(res);
  });

  // Header/stream errors used to be unhandled and killed the whole process.
  function fail(status, body) {
    if (res.writableEnded) {
      return;
    }
    if (!res.headersSent) {
      res.writeHead(status, corsHeaders);
    }
    res.end(body);
  }

  proxyReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    proxyReq.destroy(new Error('upstream timed out after ' + UPSTREAM_TIMEOUT_MS + 'ms'));
  });

  proxyReq.on('error', err => {
    console.error(req.method + ' ' + target + ' failed: ' + err.message);
    fail(502, 'Proxy error: ' + err.message);
  });

  req.on('error', err => {
    console.error('Request stream failed: ' + err.message);
    proxyReq.destroy(err);
  });

  res.on('error', err => {
    console.error('Response stream failed: ' + err.message);
    proxyReq.destroy();
  });

  req.pipe(proxyReq);
});
server.maxConnections = 20;
server.listen(PORT, '127.0.0.1', () => {
  console.log('CORS proxy listening on http://localhost:' + PORT);
});
