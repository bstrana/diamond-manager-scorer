# Keycloak Troubleshooting Guide

## Error: 404 Not Found on `.well-known/openid-configuration`

### What This Means

The error `GET https://usergate.bstrana.com/realms/baseball-scorer/.well-known/openid-configuration net::ERR_FAILED 404` means:

- The realm `baseball-scorer` **doesn't exist** in Keycloak, OR
- The realm name is **spelled differently**, OR
- Keycloak is not accessible at that URL

### How to Fix

#### Step 1: Verify the Realm Exists

1. **Log in to Keycloak Admin Console**
   - Go to `https://usergate.bstrana.com`
   - Log in with admin credentials

2. **Check Realm Dropdown**
   - Look at the top-left corner for the realm dropdown
   - See if `baseball-scorer` is listed
   - If not, you need to create it

#### Step 2: Create the Realm (If It Doesn't Exist)

1. **Click on Realm Dropdown** (top-left)
2. **Click "Create Realm"**
3. **Enter Realm Name**: `baseball-scorer`
4. **Click "Create"**

#### Step 3: Verify the Realm URL

After creating the realm, test the endpoint:

1. **Open a new browser tab**
2. **Visit**: `https://usergate.bstrana.com/realms/baseball-scorer/.well-known/openid-configuration`
3. **You should see JSON** (not a 404 error)

If you see JSON, the realm exists and is accessible.

#### Step 4: Check Environment Variables

Make sure your app has the correct environment variables:

```env
KEYCLOAK_URL=https://usergate.bstrana.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app
```

**Important**: 
- `KEYCLOAK_URL` should NOT include `/realms/baseball-scorer`
- `KEYCLOAK_REALM` should be just the realm name: `baseball-scorer`
- The app will construct: `{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/.well-known/openid-configuration`

#### Step 5: Verify Realm Name Spelling

Common mistakes:
- ❌ `baseball_scorer` (underscore instead of hyphen)
- ❌ `Baseball-Scorer` (capital letters)
- ❌ `baseball-scorer ` (trailing space)
- ✅ `baseball-scorer` (correct)

The realm name is **case-sensitive** and must match exactly.

### Alternative: Use the Master Realm

If you want to test with the default `master` realm:

1. **Update environment variables**:
   ```env
   KEYCLOAK_REALM=master
   ```

2. **Create client in master realm**:
   - Go to `master` realm
   - Create client `baseball-scorer-app`
   - Configure Web Origins and Redirect URIs

3. **Test the endpoint**:
   - Visit: `https://usergate.bstrana.com/realms/master/.well-known/openid-configuration`
   - Should return JSON

## Error: CORS Policy Blocked

### What This Means

The browser blocks requests because Keycloak doesn't allow your app's domain.

### How to Fix

1. **Log in to Keycloak Admin Console**
2. **Select realm**: `baseball-scorer` (or `master`)
3. **Go to Clients** → Find `baseball-scorer-app`
4. **Set Web Origins**: `https://baseball-scorer.yourball.club`
   - Or use `*` for testing (less secure)
5. **Set Valid Redirect URIs**: 
   - `https://baseball-scorer.yourball.club/*`
   - `https://baseball-scorer.yourball.club`
6. **Click Save**

## Testing the Configuration

### Test 1: Check Realm Endpoint

Visit in browser:
```
https://usergate.bstrana.com/realms/baseball-scorer/.well-known/openid-configuration
```

**Expected**: JSON response with OpenID Connect configuration
**If 404**: Realm doesn't exist or name is wrong

### Test 2: Check Keycloak Admin Console

1. Visit: `https://usergate.bstrana.com`
2. Log in
3. Check if `baseball-scorer` realm exists in dropdown

### Test 3: Check Client Configuration

1. In Keycloak Admin Console
2. Select `baseball-scorer` realm
3. Go to **Clients**
4. Verify `baseball-scorer-app` exists
5. Check **Web Origins** and **Valid Redirect URIs** are set

## Common Issues

### Issue: "Realm not found"
- **Solution**: Create the realm in Keycloak Admin Console
- **Solution**: Check realm name spelling matches exactly

### Issue: "Client not found"
- **Solution**: Create the client in the realm
- **Solution**: Check client ID matches: `baseball-scorer-app`

### Issue: "CORS error persists"
- **Solution**: Clear browser cache completely
- **Solution**: Verify Web Origins includes your exact domain
- **Solution**: Check for trailing slashes in URLs

### Issue: "Redirect URI mismatch"
- **Solution**: Add exact redirect URI to **Valid Redirect URIs**
- **Solution**: Include both with and without trailing slash
- **Solution**: Use wildcard: `https://baseball-scorer.yourball.club/*`

## Quick Checklist

- [ ] Realm `baseball-scorer` exists in Keycloak
- [ ] Client `baseball-scorer-app` exists in the realm
- [ ] Web Origins includes `https://baseball-scorer.yourball.club`
- [ ] Valid Redirect URIs includes `https://baseball-scorer.yourball.club/*`
- [ ] Environment variables are set correctly
- [ ] Realm endpoint returns JSON (not 404)
- [ ] Browser cache is cleared

## Getting Help

If issues persist:

1. **Check Keycloak logs** for more details
2. **Verify Keycloak version** - some versions have different CORS handling
3. **Test with master realm** to isolate realm-specific issues
4. **Check network tab** in browser DevTools for exact error responses


