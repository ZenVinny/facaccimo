// Local development CORS proxy, mirroring the behavior of https://cors.stirante.com
// Proxies any request of the form http://localhost:3000/<host>/<path> to https://<host>/<path>
// (unlike @isomorphic-git/cors-proxy, which only allows git requests).
// Usage: npm run proxy
//
// Security notes: this proxy is for LOCAL DEVELOPMENT ONLY. It binds to 127.0.0.1
// and refuses to forward to private/loopback/link-local hosts. An allowlist of
// upstream hosts can be supplied via the ALLOWED_HOSTS env var (comma separated);
// otherwise a built-in allowlist of the hosts the app actually needs is used.

const http = require('http');
const https = require('https');

const PORT = Number(process.env.PORT) || 3000;

const STRIP_REQUEST_HEADERS = ['host', 'origin', 'referer', 'connection'];
const STRIP_RESPONSE_HEADERS = ['connection', 'transfer-encoding', 'access-control-allow-origin'];
const DEFAULT_TIMEOUT_MS = 30000;
const parsedTimeout = Number(process.env.UPSTREAM_TIMEOUT_MS);
const UPSTREAM_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 10 * 1024 * 1024;

// Hosts the app legitimately needs to reach through the proxy.
const DEFAULT_ALLOWED_HOSTS = [
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'mangadex.org',
  'api.mangadex.org',
  'uploads.mangadex.org',
  'cubari.moe',
  'reddit.com',
  'www.reddit.com',
  'old.reddit.com',
  'i.redd.it',
  'preview.redd.it',
  'imgur.com',
  'i.imgur.com',
  'drive.google.com',
  'drive.usercontent.google.com',
  'docs.google.com',
  'lh3.googleusercontent.com',
  'api.imgur.com',
  'v.redd.it'
];

function allowedHosts() {
  const env = process.env.ALLOWED_HOSTS;
  if (env && env.trim()) {
    return env.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_HOSTS;
}

function hostAllowed(host) {
  const h = String(host || '').toLowerCase();
  for (const entry of allowedHosts()) {
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1); // '.example.com'
      if (h.endsWith(suffix) && h.length > suffix.length) return true;
    } else if (h === entry) {
      return true;
    }
  }
  return false;
}

function isPrivateOrSpecialHost(host) {
  const h = String(host || '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  // IPv4
  if (/^127\./.test(h) || h === '0.0.0.0' || /^0\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true; // CGNAT
  if (h === '169.254.169.254' || h === 'metadata.google.internal') return true;
  // IPv6
  if (h === '::1' || h === '::' || h === '[::1]' || h === '[::]') return true;
  if (h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return true;
  if (h.startsWith('[fe80') || h.startsWith('[fc') || h.startsWith('[fd')) return true;
  // IPv4-mapped IPv6
  const mapped = h.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mapped && isPrivateOrSpecialHost(mapped[1])) return true;
  return false;
}

function fail(res, corsHeaders, status, body) {
  if (res.writableEnded) return;
  if (!res.headersSent) {
    res.writeHead(status, corsHeaders);
  }
  res.end(body);
}

const SAFE_REQUEST_HEADERS = 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Language';

const server = http.createServer((req, res) => {
  const requestedHeaders = req.headers['access-control-request-headers'];
  // Validate reflected header list: only allow simple header-name tokens.
  let reflected = SAFE_REQUEST_HEADERS;
  if (requestedHeaders) {
    const tokens = String(requestedHeaders).split(',').map(s => s.trim()).filter(Boolean);
    const valid = tokens.every(t => /^[A-Za-z0-9-]+$/.test(t));
    if (valid && tokens.length > 0 && tokens.length <= 20) {
      reflected = tokens.join(', ');
    }
  }
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': reflected,
    'Access-Control-Expose-Headers': 'Content-Length'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  let target = req.url.slice(1);
  try { target = decodeURIComponent(target); } catch (e) { /* keep raw */ }
  let targetUrl;
  try {
    const check = new URL(target.startsWith('http') ? target : 'https://' + target);
    const host = check.hostname.replace(/^\[|\]$/g, '');
    if (isPrivateOrSpecialHost(host)) {
      res.writeHead(403, corsHeaders);
      res.end('Blocked private/loopback host');
      return;
    }
    if (!hostAllowed(host)) {
      res.writeHead(403, corsHeaders);
      res.end('Host not allowed');
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

  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, corsHeaders);
    res.end('Invalid proxy URL');
    return;
  }

  const host = targetUrl.hostname.replace(/^\[|\]$/g, '');
  if (isPrivateOrSpecialHost(host)) {
    res.writeHead(403, corsHeaders);
    res.end('Blocked private/loopback host');
    return;
  }
  if (!hostAllowed(host)) {
    res.writeHead(403, corsHeaders);
    res.end('Host not allowed');
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

  let aborted = false;
  const abortUpstream = () => {
    if (aborted) return;
    aborted = true;
    try { proxyReq.destroy(); } catch (e) { /* ignore */ }
    try { absoluteTimer && clearTimeout(absoluteTimer); } catch (e) { /* ignore */ }
  };

  const proxyReq = client.request(targetUrl, {method: req.method, headers}, proxyRes => {
    const responseHeaders = {...proxyRes.headers};
    for (const header of STRIP_RESPONSE_HEADERS) {
      delete responseHeaders[header];
    }
    // Keep redirects going through the proxy
    if (responseHeaders.location) {
      if (/^https?:\/\//.test(responseHeaders.location)) {
        responseHeaders.location = '/' + responseHeaders.location.replace(/^https?:\/\//, '');
      } else {
        // Resolve relative Location against the upstream URL.
        try {
          const resolved = new URL(responseHeaders.location, targetUrl);
          if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
            responseHeaders.location = '/' + resolved.href.replace(/^https?:\/\//, '');
          }
        } catch (e) {
          // leave as-is
        }
      }
    }
    proxyRes.on('error', err => {
      console.error(req.method + ' ' + targetUrl.host + ' response failed: ' + err.message);
      fail(res, corsHeaders, 502, 'Proxy upstream error');
    });
    res.writeHead(proxyRes.statusCode, {...responseHeaders, ...corsHeaders});
    proxyRes.pipe(res);
  });

  const absoluteTimer = setTimeout(() => {
    proxyReq.destroy(new Error('upstream timed out after ' + UPSTREAM_TIMEOUT_MS + 'ms'));
  }, UPSTREAM_TIMEOUT_MS);

  proxyReq.on('error', err => {
    clearTimeout(absoluteTimer);
    console.error(req.method + ' ' + targetUrl.host + ' failed: ' + err.message);
    fail(res, corsHeaders, 502, 'Proxy error');
  });

  proxyReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    proxyReq.destroy(new Error('upstream timed out after ' + UPSTREAM_TIMEOUT_MS + 'ms'));
  });

  // Client disconnect handling: only treat a closed response stream as a disconnect.
  // (req 'close' fires as soon as the request body is consumed, even for GETs.)
  res.on('close', () => {
    if (!res.writableEnded) abortUpstream();
  });
  req.on('error', err => {
    console.error('Request stream failed: ' + err.message);
    proxyReq.destroy(err);
  });
  res.on('error', err => {
    console.error('Response stream failed: ' + err.message);
    proxyReq.destroy();
  });

  // Request body size limit
  let bodyBytes = 0;
  req.on('data', chunk => {
    bodyBytes += chunk.length;
    if (bodyBytes > MAX_BODY_BYTES) {
      abortUpstream();
      fail(res, corsHeaders, 413, 'Request body too large');
    }
  });

  req.pipe(proxyReq);
});

server.maxConnections = 20;
server.listen(PORT, '127.0.0.1', () => {
  console.log('CORS proxy listening on http://localhost:' + PORT);
});
