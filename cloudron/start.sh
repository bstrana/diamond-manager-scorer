#!/bin/bash
# Cloudron startup script for Diamond Manager Scorer
# Cloudron sets APP_DOMAIN, APP_ORIGIN, CLOUDRON_API_ORIGIN, and any
# user-configured env vars before this script runs.
set -eu

echo "==> Diamond Manager Scorer starting"

# ── Persistent storage ────────────────────────────────────────────────────────
# Cloudron mounts the localstorage addon at /app/data (read-write, persisted).
PB_DATA_DIR="/app/data/pb_data"
mkdir -p "${PB_DATA_DIR}"

# ── Admin config file ─────────────────────────────────────────────────────────
# On first boot write a template to /app/data/config.env so the admin can
# edit it via the Cloudron file manager (App → Files) and restart the app.
CONFIG_FILE="/app/data/config.env"
if [ ! -f "${CONFIG_FILE}" ]; then
    echo "==> Creating config template at ${CONFIG_FILE}"
    cat > "${CONFIG_FILE}" <<'TEMPLATE'
# Diamond Manager Scorer configuration
# Edit this file via the Cloudron file manager (App → Files → /app/data/config.env)
# then restart the app for changes to take effect.

# ── Keycloak (optional) ───────────────────────────────────────────────────────
KEYCLOAK_URL=https://keycloak.example.com
KEYCLOAK_REALM=diamond
KEYCLOAK_CLIENT_ID=diamond-manager-scorer

# ── Diamond Manager Scheduler connection (optional) ──────────────────────────
# Point SCHEDULER_URL at the PocketBase of a separately hosted Diamond Manager
# Scheduler app (can be on a different domain). SCHEDULER_ORG_ID filters the
# schedule data to your organisation. No need to set SCHEDULE_PROVIDER when
# SCHEDULER_URL is present – it is detected automatically.
# SCHEDULER_URL=https://scheduler.yourdomain.com
# SCHEDULER_ORG_ID=your-org-id

# ── Legacy schedule source (optional, kept for backwards compatibility) ────────
# SCHEDULE_PROVIDER=pocketbase
# POCKETBASE_SCHEDULE_SOURCE_COLLECTION=published_schedules
# POCKETBASE_SCHEDULE_ORG_ID=
# POCKETBASE_SCHEDULE_USER_ID=
# POCKETBASE_SCHEDULE_APP_ID=scheduler

# ── OpenRouter AI recap generation (optional) ─────────────────────────────────
OPENROUTER_API_KEY=
OPENROUTER_MODEL=

# ── OBS browser source sync ───────────────────────────────────────────────────
ENABLE_OBS_SYNC=true
# Comma-separated list of allowed CORS origins for /api/gamestate.
# Leave blank to restrict to same-origin only.
ALLOWED_ORIGINS=

# ── App unlock key (optional) ─────────────────────────────────────────────────
UNLOCK_KEY=unlock
TEMPLATE
    chmod 644 "${CONFIG_FILE}"
    echo "    Edit it and restart the app to apply your settings."
fi

echo "==> Loading config from ${CONFIG_FILE}"
# Parse config.env manually so that lines with spaces around '=' are handled
# gracefully instead of causing "command not found" errors.
while IFS= read -r _line || [ -n "${_line}" ]; do
  _line="${_line#"${_line%%[![:space:]]*}"}"
  _line="${_line%"${_line##*[![:space:]]}"}"  
  [[ -z "${_line}" || "${_line}" == \#* ]] && continue
  if [[ "${_line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*) ]]; then
    export "${BASH_REMATCH[1]}"="${BASH_REMATCH[2]}"
  fi
done < "${CONFIG_FILE}"

# ── Fixed internal URLs (embedded PocketBase) ─────────────────────────────────
# POCKETBASE_URL is what the browser uses (nginx proxies /_pb/ → PocketBase).
# APP_ORIGIN is always set by Cloudron (e.g. https://scorer.myserver.com).
# A full URL is required so getBaseUrl() helpers in service files don't
# accidentally prepend https:// to a bare path like /_pb.
if [ -n "${APP_ORIGIN:-}" ]; then
    export POCKETBASE_URL="${APP_ORIGIN}/_pb"
else
    export POCKETBASE_URL="/_pb"
fi
export PB_URL="http://127.0.0.1:8090"
export DATA_PROVIDER="pocketbase"

# ── Defaults for optional vars ────────────────────────────────────────────────
export SCHEDULER_URL="${SCHEDULER_URL:-}"
export SCHEDULER_ORG_ID="${SCHEDULER_ORG_ID:-}"
export SCHEDULE_PROVIDER="${SCHEDULE_PROVIDER:-}"
export ENABLE_OBS_SYNC="${ENABLE_OBS_SYNC:-true}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
export OPENROUTER_MODEL="${OPENROUTER_MODEL:-}"
export UNLOCK_KEY="${UNLOCK_KEY:-unlock}"

# ── Stamp Keycloak origin into nginx CSP ──────────────────────────────────────
# frame-src needs the Keycloak origin so the OIDC silent-check-sso iframe works.
KC_ORIGIN="'none'"
if [ -n "${KEYCLOAK_URL:-}" ]; then
    _extracted="$(echo "${KEYCLOAK_URL}" | grep -oP '^https?://[^/]+' || true)"
    [ -n "${_extracted}" ] && KC_ORIGIN="${_extracted}"
fi
# /etc/nginx/sites-enabled/ is read-only at runtime; render into writable /tmp.
mkdir -p /tmp/nginx/sites-enabled
sed "s|__KC_ORIGIN__|${KC_ORIGIN}|g" /app/nginx.conf.template \
    > /tmp/nginx/sites-enabled/default

# ── Nginx writable temp dirs ──────────────────────────────────────────────────
mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi \
         /tmp/nginx/scgi /tmp/nginx/uwsgi

# ── PocketBase migrations ─────────────────────────────────────────────────────
echo "==> Running PocketBase migrations"
/app/pocketbase/pocketbase migrate up \
    --dir="${PB_DATA_DIR}" \
    --migrationsDir=/app/pb_migrations \
    2>&1 || {
    echo "WARNING: PocketBase migrations failed – collections may be missing."
    echo "         Open ${PB_URL}/_/ to inspect."
}

# ── Launch via supervisord ────────────────────────────────────────────────────
echo "==> Starting supervisord"
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/diamond.conf
