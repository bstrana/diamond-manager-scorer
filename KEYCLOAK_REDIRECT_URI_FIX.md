# Fixing "Invalid parameter: redirect_uri" Error

## Problem
You're seeing the error: **"Invalid parameter: redirect_uri"**

This means the redirect URI your app is sending to Keycloak doesn't match what's configured in Keycloak's client settings.

## Solution

### Step 1: Check What Redirect URI Your App Is Using

1. **Open your browser's Developer Console** (F12)
2. **Look for the log message** that shows:
   ```
   [KeycloakAuth] Redirect URI: http://localhost:3000
   ```
   (or your production URL)

3. **Note the exact URL** - it will be either:
   - **Local development**: `http://localhost:3000` (or `http://localhost:5173` if using Vite default)
   - **Production**: `https://baseball-scorer.yourball.club`

### Step 2: Update Keycloak Client Settings

1. **Log in to Keycloak Admin Console**
   - Go to: `https://usergate.bstrana.com`
   - Select realm: `baseball-scorer`

2. **Navigate to Client Settings**
   - Go to **Clients** → Click on `baseball-scorer-app`

3. **Update "Valid redirect URIs"**
   - Find the **Valid redirect URIs** field
   - Add the exact redirect URI from Step 1, plus a wildcard version:
   
   **For Local Development:**
   ```
   http://localhost:3000
   http://localhost:3000/*
   ```
   
   **For Production:**
   ```
   https://baseball-scorer.yourball.club
   https://baseball-scorer.yourball.club/*
   ```
   
   **For Both (Recommended):**
   ```
   http://localhost:3000
   http://localhost:3000/*
   https://baseball-scorer.yourball.club
   https://baseball-scorer.yourball.club/*
   ```

4. **Update "Web Origins"** (if needed)
   - Find the **Web origins** field
   - Add the same URLs (without the `/*`):
   ```
   http://localhost:3000
   https://baseball-scorer.yourball.club
   ```
   - Or use `*` for all origins (less secure, but works for testing)

5. **Click "Save"**

### Step 3: Verify Configuration

The redirect URI must match **exactly** one of these patterns:
- Exact match: `http://localhost:3000` ✅
- Wildcard match: `http://localhost:3000/*` ✅
- Root path: `http://localhost:3000/` ✅

**Common mistakes:**
- ❌ Missing protocol: `localhost:3000` (needs `http://`)
- ❌ Wrong port: `http://localhost:5173` (if your app runs on 3000)
- ❌ Trailing slash mismatch: `http://localhost:3000/` vs `http://localhost:3000`
- ❌ Protocol mismatch: `http://` vs `https://`

### Step 4: Test Again

1. **Clear your browser cache** (or use incognito mode)
2. **Restart your dev server** if running locally
3. **Visit your app** - it should redirect to Keycloak login
4. **After login**, you should be redirected back to your app

## Quick Fix: Allow All Redirect URIs (Testing Only)

⚠️ **Warning**: Only use this for testing/development, not production!

1. In Keycloak client settings, set **Valid redirect URIs** to: `*`
2. Set **Web origins** to: `*`
3. Click **Save**
4. Test your app

## Troubleshooting

### Still Getting the Error?

1. **Check the browser console** for the exact redirect URI being used
2. **Verify in Keycloak** that the redirect URI is saved (sometimes you need to click Save twice)
3. **Check for typos** - the URI must match exactly (case-sensitive, protocol matters)
4. **Try clearing Keycloak cache** - sometimes Keycloak caches client settings

### Different Ports

If your app runs on a different port:
- **Vite default**: `http://localhost:5173`
- **Custom port**: Check your `vite.config.ts` or `package.json`

Make sure the redirect URI matches the port your app is actually running on.

### Production vs Development

You may need different redirect URIs for:
- **Local development**: `http://localhost:3000`
- **Staging**: `https://staging.yourball.club`
- **Production**: `https://baseball-scorer.yourball.club`

Add all of them to Keycloak's "Valid redirect URIs" field (one per line).

## Example Keycloak Configuration

Here's what your Keycloak client settings should look like:

**Client ID**: `baseball-scorer-app`
**Client authentication**: `Off` (Public client)
**Valid redirect URIs**:
```
http://localhost:3000
http://localhost:3000/*
https://baseball-scorer.yourball.club
https://baseball-scorer.yourball.club/*
```

**Web origins**:
```
http://localhost:3000
https://baseball-scorer.yourball.club
```

**Standard flow**: `Enabled`
**Direct access grants**: `Disabled`

---

**Need Help?** Check the browser console for the exact redirect URI being used, and make sure it matches exactly (including protocol and port) what's configured in Keycloak.


