# Diamond Manager Scorer — Cloudron package
# https://docs.cloudron.io/packaging/
#
# Stage 1: build the React/Vite SPA.
# Stage 2: Cloudron runtime with nginx, supervisord, Node.js 20, and PocketBase.
# server.js injects env vars into HTML at request time via window.__ENV__,
# so no sed-stamping of the built bundle is needed.

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Cloudron runtime ─────────────────────────────────────────────────
FROM cloudron/base:5.0.0

WORKDIR /app

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
        unzip \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 ────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── PocketBase ─────────────────────────────────────────────────────────────────
ARG PB_VERSION=0.26.3
RUN mkdir -p /app/pocketbase \
    && curl -fsSL \
       "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
       -o /tmp/pb.zip \
    && unzip -q /tmp/pb.zip -d /app/pocketbase \
    && rm /tmp/pb.zip \
    && chmod +x /app/pocketbase/pocketbase

# ── Copy built SPA and server ─────────────────────────────────────────────────
# package.json must be present so Node.js recognises server.js as ESM
# ("type": "module" in package.json is required for import syntax).
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/server.js   ./server.js
COPY --from=builder /app/package.json ./package.json

# ── PocketBase migrations ──────────────────────────────────────────────────────
COPY pb_migrations/ /app/pb_migrations/

# ── Cloudron config files ─────────────────────────────────────────────────────
COPY cloudron/nginx.conf       /app/nginx.conf.template
COPY cloudron/supervisord.conf /etc/supervisor/conf.d/diamond.conf
COPY cloudron/start.sh         /app/start.sh
RUN chmod +x /app/start.sh

# ── Nginx temp dirs & log paths ────────────────────────────────────────────────
# Cloudron's /app filesystem is read-only at runtime; redirect nginx's temp
# dirs to /tmp (always a writable tmpfs) and logs to stdout/stderr.
# Also redirect sites-enabled include to /tmp/nginx/sites-enabled/ so
# start.sh can render the site config there without touching /etc/nginx.
RUN printf 'client_body_temp_path /tmp/nginx/client_body;\n\
proxy_temp_path      /tmp/nginx/proxy;\n\
fastcgi_temp_path    /tmp/nginx/fastcgi;\n\
scgi_temp_path       /tmp/nginx/scgi;\n\
uwsgi_temp_path      /tmp/nginx/uwsgi;\n' \
    > /etc/nginx/conf.d/cloudron-temp-paths.conf \
    && sed -i \
        -e 's|error_log /var/log/nginx/error.log.*|error_log /dev/stderr warn;|' \
        -e 's|access_log /var/log/nginx/access.log.*|access_log /dev/stdout;|' \
        -e 's|include /etc/nginx/sites-enabled/\*;|include /tmp/nginx/sites-enabled/*;|' \
        /etc/nginx/nginx.conf

RUN rm -f /etc/nginx/sites-enabled/default \
          /etc/nginx/sites-enabled/default.bak

# Cloudron listens on 8000; PocketBase and Node.js are internal only.
EXPOSE 8000

CMD ["/app/start.sh"]
