import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'dist');

// Load environment variables from /app/data/.env if it exists (Cloudron writable directory)
const dataDir = '/app/data';
const envFilePath = path.join(dataDir, '.env');

// Function to parse .env file (handles symlinks and regular files)
function loadEnvFile(filePath) {
  const env = {};
  try {
    // Check if directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirPath} does not exist. Skipping .env file load.`);
      return env;
    }
    
    // Resolve symlinks to get the real path
    let realPath = filePath;
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.lstatSync(filePath);
        if (stats.isSymbolicLink()) {
          realPath = fs.realpathSync(filePath);
          console.log(`.env file is a symlink, resolved to: ${realPath}`);
        }
      }
    } catch (symlinkError) {
      console.warn(`Could not resolve symlink for ${filePath}:`, symlinkError.message);
      // Continue with original path
    }
    
    if (fs.existsSync(realPath)) {
      console.log(`Found .env file at ${realPath}${realPath !== filePath ? ` (original: ${filePath})` : ''}, loading...`);
      const content = fs.readFileSync(realPath, 'utf8');
      const lines = content.split('\n');
      let loadedCount = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Parse KEY=VALUE format
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          // Store the value (even if empty string - user might want empty password)
          env[key] = value;
          loadedCount++;
          // Mask sensitive values
          if (key.includes('TOKEN') || key.includes('PASS')) {
            console.log(`  Loaded: ${key}=***`);
          } else {
            console.log(`  Loaded: ${key}=${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
          }
        }
      }
      console.log(`Successfully loaded ${loadedCount} environment variables from ${realPath}`);
    } else {
      console.log(`No .env file found at ${filePath} (resolved: ${realPath}). Using Cloudron environment variables or defaults.`);
    }
  } catch (error) {
    console.error(`Error loading .env file from ${filePath}:`, error.message);
    console.error(error.stack);
  }
  return env;
}

// Load .env file and merge with process.env (file takes precedence)
// Note: Cloudron's built-in env vars (set via dashboard/CLI) are already in process.env
// The .env file is an alternative method that takes precedence if it exists
console.log('Loading environment variables...');
console.log(`Cloudron env vars (from dashboard/CLI): DIRECTUS_URL=${process.env.DIRECTUS_URL || 'not set'}, KEYCLOAK_URL=${process.env.KEYCLOAK_URL || 'not set'}`);
const fileEnv = loadEnvFile(envFilePath);
if (Object.keys(fileEnv).length > 0) {
  console.log('Found .env file, merging with Cloudron environment variables (.env takes precedence)...');
  Object.assign(process.env, fileEnv);
  console.log(`After merge: DIRECTUS_URL=${process.env.DIRECTUS_URL || 'not set'}, KEYCLOAK_URL=${process.env.KEYCLOAK_URL || 'not set'}`);
} else {
  console.log('No .env file found, using Cloudron environment variables (set via dashboard/CLI) or defaults.');
}

// In-memory storage for game state (for OBS browser sources that can't access localStorage)
let gameStateCache = null;

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

// Inject environment variables into HTML for client-side access
function injectEnvVars(html) {
  const envVars = {
    DIRECTUS_URL: process.env.DIRECTUS_URL || '',
    DIRECTUS_STATIC_TOKEN: process.env.DIRECTUS_STATIC_TOKEN || '',
    DIRECTUS_SCOREKEEPER_TOKEN: process.env.DIRECTUS_SCOREKEEPER_TOKEN || '',
    WP_SITE_URL: process.env.WP_SITE_URL || '',
    WP_USERNAME: process.env.WP_USERNAME || '',
    WP_APP_PASS: process.env.WP_APP_PASS || '',
    KEYCLOAK_URL: process.env.KEYCLOAK_URL || '',
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || '',
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || '',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || '',
    DATA_PROVIDER: process.env.DATA_PROVIDER || '',
    SCHEDULE_PROVIDER: process.env.SCHEDULE_PROVIDER || '',
    POCKETBASE_URL: process.env.POCKETBASE_URL || '',
  };
  
  // Log environment variable status (only log first time, no sensitive data)
  if (!injectEnvVars._logged) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      console.log('Injecting environment variables into HTML:');
      console.log(`  DIRECTUS_URL: ${envVars.DIRECTUS_URL ? 'set' : 'not set'}`);
      console.log(`  DIRECTUS_STATIC_TOKEN: ${envVars.DIRECTUS_STATIC_TOKEN ? 'set' : 'not set'}`);
      console.log(`  DIRECTUS_SCOREKEEPER_TOKEN: ${envVars.DIRECTUS_SCOREKEEPER_TOKEN ? 'set' : 'not set'}`);
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
  // Security: Debug endpoint removed in production
  // If needed for debugging, uncomment and add authentication
  // if (req.method === 'GET' && req.url === '/api/env-check') {
  //   // Add authentication check here
  //   res.setHeader('Content-Type', 'application/json');
  //   res.writeHead(200);
  //   res.end(JSON.stringify({ message: 'Debug endpoint disabled in production' }));
  //   return;
  // }
  
  // Handle API endpoints for game state (for OBS browser sources)
  // Security: Limit CORS to known origins (can be configured via env var)
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
  const origin = req.headers.origin;
  const corsOrigin = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin)) ? (origin || '*') : null;
  
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
        if (corsOrigin) {
          res.setHeader('Access-Control-Allow-Origin', corsOrigin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
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
  console.log(`Baseball Scoreboard server running on port ${port}`);
  console.log(`Serving files from: ${distDir}`);
  
  if (!isProduction) {
    console.log(`\n=== Environment Variables Summary ===`);
    console.log(`DIRECTUS_URL: ${process.env.DIRECTUS_URL ? 'set' : 'not set'}`);
    console.log(`DIRECTUS_STATIC_TOKEN: ${process.env.DIRECTUS_STATIC_TOKEN ? 'set' : 'not set'}`);
    console.log(`KEYCLOAK_URL: ${process.env.KEYCLOAK_URL ? 'set' : 'not set'}`);
    console.log(`KEYCLOAK_REALM: ${process.env.KEYCLOAK_REALM ? 'set' : 'not set'}`);
    console.log(`KEYCLOAK_CLIENT_ID: ${process.env.KEYCLOAK_CLIENT_ID ? 'set' : 'not set'}`);
    console.log(`DIRECTUS_SCOREKEEPER_TOKEN: ${process.env.DIRECTUS_SCOREKEEPER_TOKEN ? 'set' : 'not set'}`);
    console.log(`=====================================\n`);
    
    if (fs.existsSync(envFilePath)) {
      console.log(`✓ .env file found at: ${envFilePath}`);
    } else {
      console.log(`ℹ No .env file at ${envFilePath}. Using Cloudron dashboard environment variables.`);
    }
  }
});

