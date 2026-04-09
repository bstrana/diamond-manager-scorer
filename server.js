import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');

// Internal PocketBase URL for server-side calls (set by cloudron/start.sh).
// When running outside Cloudron this is empty and PB persistence is skipped.
const PB_URL = process.env.PB_URL || '';

// In-memory storage for game state (for OBS browser sources that can't access localStorage)
let gameStateCache = null;
let gameStatePbId = null; // PocketBase record ID for game_states upsert

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Load the last saved game state from PocketBase on startup so that the OBS
// sync cache survives server restarts (e.g. after a Cloudron app update).
async function loadGameStateFromPB() {
  if (!PB_URL) return;
  try {
    const res = await fetch(`${PB_URL}/api/collections/game_states/records?sort=-updated&perPage=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        gameStateCache = data.items[0].state_json;
        gameStatePbId = data.items[0].id;
        console.log('Restored game state from PocketBase');
      }
    }
  } catch (_) {
    // PocketBase may not be ready yet on first startup; ignore and proceed.
  }
}

// Persist the current game state snapshot to PocketBase (upsert).
// Non-fatal: if PocketBase is unavailable the in-memory cache still serves OBS.
async function persistGameStateToPB(state) {
  if (!PB_URL) return;
  const body = JSON.stringify({ state_json: state });
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (gameStatePbId) {
      await fetch(`${PB_URL}/api/collections/game_states/records/${gameStatePbId}`, {
        method: 'PATCH',
        headers,
        body,
      });
    } else {
      const res = await fetch(`${PB_URL}/api/collections/game_states/records`, {
        method: 'POST',
        headers,
        body,
      });
      if (res.ok) {
        const d = await res.json();
        gameStatePbId = d.id;
      }
    }
  } catch (_) {
    // Non-fatal: OBS sync still works via in-memory cache.
  }
}

// Inject environment variables into HTML for client-side access
function injectEnvVars(html) {
  const envVars = {
    WP_SITE_URL: process.env.VITE_WP_SITE_URL || process.env.WP_SITE_URL || '',
    WP_USERNAME: process.env.VITE_WP_USERNAME || process.env.WP_USERNAME || '',
    KEYCLOAK_URL: process.env.VITE_KEYCLOAK_URL || process.env.KEYCLOAK_URL || '',
    KEYCLOAK_REALM: process.env.VITE_KEYCLOAK_REALM || process.env.KEYCLOAK_REALM || '',
    KEYCLOAK_CLIENT_ID: process.env.VITE_KEYCLOAK_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || '',
    OPENROUTER_MODEL: process.env.VITE_OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || '',
    DATA_PROVIDER: process.env.VITE_DATA_PROVIDER || process.env.DATA_PROVIDER || '',
    SCHEDULE_PROVIDER: process.env.VITE_SCHEDULE_PROVIDER || process.env.SCHEDULE_PROVIDER || '',
    POCKETBASE_URL: process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL || '',
    ENABLE_OBS_SYNC: process.env.VITE_ENABLE_OBS_SYNC || process.env.ENABLE_OBS_SYNC || '',
    POCKETBASE_SCHEDULE_SOURCE_COLLECTION: process.env.VITE_POCKETBASE_SCHEDULE_SOURCE_COLLECTION || process.env.POCKETBASE_SCHEDULE_SOURCE_COLLECTION || '',
    POCKETBASE_SCHEDULE_ORG_ID: process.env.VITE_POCKETBASE_SCHEDULE_ORG_ID || process.env.POCKETBASE_SCHEDULE_ORG_ID || '',
    POCKETBASE_SCHEDULE_USER_ID: process.env.VITE_POCKETBASE_SCHEDULE_USER_ID || process.env.POCKETBASE_SCHEDULE_USER_ID || '',
    POCKETBASE_SCHEDULE_APP_ID: process.env.VITE_POCKETBASE_SCHEDULE_APP_ID || process.env.POCKETBASE_SCHEDULE_APP_ID || '',
    SCHEDULER_URL: process.env.VITE_SCHEDULER_URL || process.env.SCHEDULER_URL || '',
    SCHEDULER_ORG_ID: process.env.VITE_SCHEDULER_ORG_ID || process.env.SCHEDULER_ORG_ID || '',
    SCHEDULER_COLLECTION: process.env.VITE_SCHEDULER_COLLECTION || process.env.SCHEDULER_COLLECTION || '',
    WP_APP_PASS: process.env.VITE_WP_APP_PASS || '',
    OPENROUTER_API_KEY: process.env.VITE_OPENROUTER_API_KEY || '',
  };
  
  // Log environment variable status (only log first time, no sensitive data)
  if (!injectEnvVars._logged) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      console.log('Injecting environment variables into HTML:');
      console.log(`  KEYCLOAK_URL: ${envVars.KEYCLOAK_URL ? 'set' : 'not set'}`);
      console.log(`  KEYCLOAK_REALM: ${envVars.KEYCLOAK_REALM ? 'set' : 'not set'}`);
      console.log(`  KEYCLOAK_CLIENT_ID: ${envVars.KEYCLOAK_CLIENT_ID ? 'set' : 'not set'}`);
    }
    injectEnvVars._logged = true;
  }
  
  const envScript = `
    <script>
      // Set environment variables IMMEDIATELY and SYNCHRONOUSLY (before any other scripts)
      // This must run before index.tsx loads
      (function() {
        window.__ENV__ = ${JSON.stringify(envVars)};
        // Make available as process.env for compatibility
        if (typeof process === 'undefined') {
          window.process = { env: window.__ENV__ };
        } else {
          Object.assign(process.env, window.__ENV__);
        }
        // Environment variables are now available (no logging in production)
        // Make sure it's available immediately
        Object.freeze(window.__ENV__);
      })();
    </script>
  `;
  
  // Inject at the very beginning of <head> to ensure it runs first, before any other scripts
  if (html.includes('<head>')) {
    return html.replace('<head>', '<head>' + envScript);
  } else if (html.includes('</head>')) {
    return html.replace('</head>', envScript + '</head>');
  } else {
    return html.replace('<body>', '<body>' + envScript);
  }
}

// Simple rate limiting (in-memory, resets on server restart)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window per IP

const getClientId = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.socket.remoteAddress || 
         'unknown';
};

const checkRateLimit = (clientId) => {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > clientData.resetTime) {
    // Reset window
    clientData.count = 0;
    clientData.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  clientData.count++;
  rateLimitMap.set(clientId, clientData);
  
  // Clean up old entries periodically (prevent memory leak)
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return clientData.count <= RATE_LIMIT_MAX_REQUESTS;
};

const server = http.createServer((req, res) => {
  // Handle API endpoints for game state (for OBS browser sources)
  // Security: Limit CORS to known origins (can be configured via env var)
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
  const origin = req.headers.origin;
  const requestHost = req.headers.host;
  const sameOrigin = origin && requestHost ? new URL(origin).host === requestHost : false;
  const corsOrigin = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))
    ? origin
    : (!allowedOrigins.length && sameOrigin ? origin : null);
  
  if (req.method === 'GET' && req.url === '/api/gamestate') {
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'application/json');
    
    if (gameStateCache) {
      res.writeHead(200);
      res.end(JSON.stringify(gameStateCache));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ error: 'No game state available' }));
    }
    return;
  }
  
  if (req.method === 'POST' && req.url === '/api/gamestate') {
    // Security: Rate limiting
    const clientId = getClientId(req);
    if (!checkRateLimit(clientId)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      if (corsOrigin) {
        res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      }
      res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
      return;
    }
    
    // Security: Limit request size to prevent DoS
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
    let body = '';
    let bodySize = 0;
    
    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        if (corsOrigin) {
          res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        }
        res.end(JSON.stringify({ error: 'Request entity too large' }));
        return;
      }
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        // Basic validation: ensure it's an object
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          if (corsOrigin) {
            res.setHeader('Access-Control-Allow-Origin', corsOrigin);
          }
          res.end(JSON.stringify({ error: 'Invalid JSON: expected object' }));
          return;
        }
        
        // Security: Validate structure to prevent prototype pollution
        if (parsed.constructor && parsed.constructor.name !== 'Object') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          if (corsOrigin) {
            res.setHeader('Access-Control-Allow-Origin', corsOrigin);
          }
          res.end(JSON.stringify({ error: 'Invalid object type' }));
          return;
        }
        
        gameStateCache = parsed;
        // Persist to PocketBase asynchronously so it survives server restarts.
        // Non-fatal: OBS sync continues working via in-memory cache even if this fails.
        persistGameStateToPB(gameStateCache).catch(() => {});

        if (corsOrigin) {
          res.setHeader('Access-Control-Allow-Origin', corsOrigin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, pbRecordId: gameStatePbId || null }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        if (corsOrigin) {
          res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        }
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // ── Scheduler proxy ──────────────────────────────────────────────────────────
  // Forward /api/scheduler-proxy/* to SCHEDULER_URL/* server-side so the
  // browser never makes a cross-origin request (avoids CORS entirely).
  const SCHEDULER_PROXY_PREFIX = '/api/scheduler-proxy';
  if (req.url.startsWith(SCHEDULER_PROXY_PREFIX)) {
    const schedulerUrl = process.env.SCHEDULER_URL || '';
    if (!schedulerUrl) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SCHEDULER_URL is not configured.' }));
      return;
    }

    // Strip any trailing /_pb the user may have included in SCHEDULER_URL,
    // then re-append it so the path is always …/_pb/api/collections/…
    const targetBase = schedulerUrl.replace(/\/_pb\/?$/, '').replace(/\/$/, '');
    const forwardPath = req.url.slice(SCHEDULER_PROXY_PREFIX.length) || '/';
    const targetUrl = `${targetBase}/_pb${forwardPath}`;

    let parsed;
    try { parsed = new URL(targetUrl); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid scheduler URL.' }));
      return;
    }

    const transport = parsed.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[scheduler-proxy] upstream error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to reach scheduler.' }));
      }
    });

    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
    return;
  }

  if (req.method === 'OPTIONS' && req.url === '/api/gamestate') {
    // Handle CORS preflight
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.writeHead(200);
    res.end();
    return;
  }

  // ── PocketBase proxy ──────────────────────────────────────────────────────────
  // In production nginx handles /_pb → PocketBase before node.js sees the
  // request, so this branch never runs there.  When running locally without
  // nginx (npm start / npm run dev), this lets the PocketBase SDK reach the
  // embedded PocketBase instance including the realtime SSE endpoint.
  if (req.url.startsWith('/_pb')) {
    const pbInternal = PB_URL || 'http://127.0.0.1:8090';
    // Strip the /_pb prefix to get the path PocketBase expects.
    const pbPath = req.url.slice('/_pb'.length) || '/';

    let parsedPb;
    try { parsedPb = new URL(pbPath, pbInternal); } catch {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    const pbTransport = parsedPb.protocol === 'https:' ? https : http;
    const proxyReq = pbTransport.request(
      {
        hostname: parsedPb.hostname,
        port: parsedPb.port || (parsedPb.protocol === 'https:' ? 443 : 80),
        path: parsedPb.pathname + parsedPb.search,
        method: req.method,
        // Forward all incoming headers (includes Accept: text/event-stream).
        headers: { ...req.headers, host: parsedPb.host },
      },
      (proxyRes) => {
        // Forward status + all headers (Content-Type: text/event-stream for SSE).
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        // Pipe directly — no buffering — so SSE events arrive immediately.
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[pb-proxy] upstream error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'PocketBase is not available.' }));
      }
    });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyReq, { end: true });
    } else {
      proxyReq.end();
    }
    return;
  }
  
  // Remove query string and decode URL
  let filePath = decodeURIComponent(req.url.split('?')[0]);
  
  // Default to index.html for root
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  // Security: prevent directory traversal and null bytes
  if (filePath.includes('..') || filePath.includes('\0')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Security: only allow safe file extensions
  const safeExtensions = ['.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  const ext = path.extname(filePath).toLowerCase();
  if (ext && !safeExtensions.includes(ext) && filePath !== '/index.html') {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const fullPath = path.join(distDir, filePath);
  
  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found - for SPA, serve index.html
      const indexPath = path.join(distDir, 'index.html');
      fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
        } else {
          // Inject environment variables into HTML
          const htmlWithEnv = injectEnvVars(data);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(htmlWithEnv);
        }
      });
      return;
    }
    
    // Read and serve the file
    const isHtml = path.extname(fullPath).toLowerCase() === '.html';
    const encoding = isHtml ? 'utf8' : null;
    
    fs.readFile(fullPath, encoding, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      
      const ext = path.extname(fullPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      // Set cache headers for static assets
      const headers = { 'Content-Type': contentType };
      
      // HTML files should never be cached (especially for OBS browser sources)
      if (isHtml) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
        data = injectEnvVars(data);
      } else if (ext === '.js' || ext === '.css' || ext === '.png' || ext === '.jpg' || ext === '.svg') {
        // Static assets can be cached
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      }
      
      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

server.listen(port, '0.0.0.0', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`Diamond Manager Scorer server running on port ${port}`);
  console.log(`Serving files from: ${distDir}`);
  
  if (!isProduction) {
    console.log(`\n=== Environment Variables Summary ===`);
    console.log(`KEYCLOAK_URL: ${process.env.KEYCLOAK_URL ? 'set' : 'not set'}`);
    console.log(`KEYCLOAK_REALM: ${process.env.KEYCLOAK_REALM ? 'set' : 'not set'}`);
    console.log(`KEYCLOAK_CLIENT_ID: ${process.env.KEYCLOAK_CLIENT_ID ? 'set' : 'not set'}`);
    console.log(`=====================================\n`);
  }

  // Restore the last game state from PocketBase so OBS overlays keep working
  // across server restarts. Non-fatal if PocketBase is not yet available.
  loadGameStateFromPB().catch(() => {});
});
