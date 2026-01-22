# Fixing CORS Error in Keycloak

## Problem
The error shows that Keycloak is blocking requests from your app domain:
```
Access to 'https://usergate.bstrana.com/realms/baseball-scorer/.well-known/openid-configuration' 
from origin 'https://baseball-scorer.yourball.club' has been blocked by CORS policy
```

## Solution: Configure CORS in Keycloak

### Option 1: Configure Web Origins in Client Settings (Recommended)

1. **Log in to Keycloak Admin Console**
   - Go to `https://usergate.bstrana.com`
   - Log in as admin

2. **Navigate to Your Client**
   - Select realm: `baseball-scorer`
   - Go to **Clients** → Find `baseball-scorer-app`
   - Click on the client to edit

3. **Set Web Origins**
   - Find the **Web Origins** field
   - Add: `https://baseball-scorer.yourball.club`
   - Or use `*` for all origins (less secure, but works for testing)
   - Click **Save**

4. **Verify Valid Redirect URIs**
   - Make sure **Valid redirect URIs** includes:
     - `https://baseball-scorer.yourball.club/*`
     - `https://baseball-scorer.yourball.club`
   - Click **Save**

### Option 2: Configure CORS at Realm Level (If Option 1 doesn't work)

1. **Go to Realm Settings**
   - Select realm: `baseball-scorer`
   - Go to **Realm Settings** → **Security Defenses**

2. **Configure CORS**
   - Find **CORS** section
   - Add to **Web Origins**:
     - `https://baseball-scorer.yourball.club`
   - Or use `*` for all origins (less secure)
   - Click **Save**

### Option 3: Configure CORS via Keycloak Configuration File

If you have access to Keycloak's configuration files:

1. **Edit `standalone.xml` or `keycloak.conf`**
   - Find CORS configuration
   - Add your domain to allowed origins

2. **Restart Keycloak**

## Quick Test: Allow All Origins (Temporary)

For testing purposes, you can temporarily allow all origins:

1. In client settings, set **Web Origins** to: `*`
2. In **Valid redirect URIs**, add: `*`
3. **Save** and test

**⚠️ Warning:** Using `*` is less secure and should only be used for testing. For production, use specific domains.

## Verify the Fix

After configuring CORS:

1. **Clear browser cache** or use incognito mode
2. **Visit your app**: `https://baseball-scorer.yourball.club`
3. **Check browser console** - CORS error should be gone
4. **You should be redirected to Keycloak login**

## Common Issues

### Issue: Still getting CORS error after configuration
- **Solution**: Make sure you clicked **Save** in Keycloak admin console
- **Solution**: Clear browser cache completely
- **Solution**: Check that the domain matches exactly (no trailing slashes, correct protocol)

### Issue: Redirect URI mismatch
- **Solution**: Ensure **Valid redirect URIs** includes your exact app URL
- **Solution**: Check for trailing slashes - Keycloak is strict about this

### Issue: Web Origins not working
- **Solution**: Try adding both with and without trailing slash
- **Solution**: Check Keycloak logs for more details
- **Solution**: Verify the realm name is correct: `baseball-scorer`

## Keycloak Version Notes

- **Keycloak 18+**: CORS is configured per-client in client settings
- **Keycloak 17 and below**: May need realm-level CORS configuration

## Additional Resources

- [Keycloak CORS Documentation](https://www.keycloak.org/docs/latest/server_admin/#_cors)
- [Keycloak Client Configuration](https://www.keycloak.org/docs/latest/server_admin/#_oidc_clients)


