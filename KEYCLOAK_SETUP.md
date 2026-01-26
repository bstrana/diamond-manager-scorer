# Keycloak Integration Setup Guide

## Environment Variables

Set these environment variables in your hosting environment or `.env` file:

```env
KEYCLOAK_URL=https://usergate.bstrana.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app
```

## Keycloak Client Configuration

Make sure your Keycloak client is configured with:

1. **Client ID**: `baseball-scorer-app`
2. **Client authentication**: `Off` (Public client)
3. **Valid redirect URIs**: 
   - `https://your-baseball-app-domain.com/*`
   - `http://localhost:5173/*` (for local development)
4. **Web origins**: 
   - `https://your-baseball-app-domain.com`
   - `http://localhost:5173` (for local development)
5. **Standard flow**: `Enabled`
6. **Direct access grants**: `Disabled` (recommended for security)

## How It Works

1. **User visits the app** → If not authenticated, redirected to Keycloak login
2. **User logs in** → Keycloak authenticates and issues tokens
3. **User redirected back** → App receives tokens and unlocks
4. **Tokens refresh automatically** → Silent token renewal in background

## Fallback to Password Unlock

If Keycloak environment variables are not set, the app will automatically fall back to the password-based unlock system using `UNLOCK_KEY`.

## Testing

1. **Set environment variables** in your hosting environment or `.env` file
2. **Restart the app** to load new environment variables
3. **Visit the app** - you should be redirected to Keycloak login
4. **Login with Keycloak credentials**
5. **You should be redirected back** and the app should unlock

## Troubleshooting

### Not redirecting to Keycloak
- Check that all three environment variables are set
- Verify the Keycloak URL is accessible
- Check browser console for errors

### Redirect URI mismatch
- Ensure the redirect URI in Keycloak matches your app's domain exactly
- Check for trailing slashes or protocol mismatches (http vs https)

### Token refresh issues
- Verify `silent-renew.html` is accessible at `/silent-renew.html`
- Check browser console for silent renewal errors

### Still showing password unlock
- Verify environment variables are set correctly
- Restart the app after setting environment variables
- Check server logs to confirm variables are being loaded

## Logout

Users can logout by:
1. Closing the browser tab (session ends)
2. Clearing browser storage
3. Logging out from Keycloak directly (affects all apps using the same Keycloak session)

## Security Notes

- Tokens are stored in browser memory (not localStorage for security)
- Tokens automatically refresh before expiration
- Session ends when browser closes (unless "Remember me" is enabled in Keycloak)


