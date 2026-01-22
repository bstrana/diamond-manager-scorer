# Installing Keycloak on Cloudron

## Option 1: Install from Cloudron App Store (Recommended)

1. **Access Cloudron Dashboard**
   - Log in to your Cloudron dashboard at `https://my.bstrana.com` (or your Cloudron domain)

2. **Navigate to App Store**
   - Click on **"App Store"** in the left sidebar
   - Search for **"Keycloak"**

3. **Install Keycloak**
   - Click on the Keycloak app
   - Click **"Install"** button
   - Choose a subdomain (e.g., `keycloak.my.bstrana.com`)
   - Click **"Install"** to proceed

4. **Wait for Installation**
   - Cloudron will automatically:
     - Pull the Keycloak Docker image
     - Set up the database (PostgreSQL)
     - Configure networking
     - Start the service

5. **Access Keycloak Admin Console**
   - Once installed, access Keycloak at your chosen subdomain
   - Default admin credentials are usually shown in the Cloudron app details
   - Or check Cloudron's app logs/notes for initial admin username/password

## Option 2: Install as Custom App (If not in App Store)

If Keycloak is not available in the Cloudron app store, you can install it as a custom Docker app:

1. **Prepare Keycloak Docker Image**
   - Use official Keycloak image: `quay.io/keycloak/keycloak:latest`
   - Or a specific version: `quay.io/keycloak/keycloak:24.0`

2. **Create Cloudron Manifest**
   - Similar to your baseball-scorer app
   - Keycloak requires:
     - PostgreSQL database (Cloudron provides this)
     - Environment variables for admin credentials
     - Port 8080 (HTTP) or 8443 (HTTPS)

3. **Install via Cloudron CLI**
   ```bash
   cloudron install --location keycloak \
     --image quay.io/keycloak/keycloak:latest \
     --env KEYCLOAK_ADMIN=admin \
     --env KEYCLOAK_ADMIN_PASSWORD=your-secure-password
   ```

## Initial Keycloak Setup

After installation, you need to configure Keycloak:

### 1. Access Admin Console
- URL: `https://keycloak.yourdomain.com` (or your chosen subdomain)
- Login with admin credentials

### 2. Create a Realm
- Click on the realm dropdown (top left, usually shows "master")
- Click **"Create Realm"**
- Name: `baseball-scorer` (or your preferred name)
- Click **"Create"**

### 3. Create a Client (for your React app)
- In your new realm, go to **"Clients"** → **"Create client"**
- **Client type**: `OpenID Connect`
- **Client ID**: `baseball-scorer-app`
- Click **"Next"**

### 4. Configure Client Settings
- **Client authentication**: `Off` (Public client for React app)
- **Authorization**: `Off` (unless you need fine-grained permissions)
- **Standard flow**: `Enabled`
- **Direct access grants**: `Disabled` (more secure)
- **Valid redirect URIs**: 
  - `https://your-baseball-app-domain.com/*`
  - `http://localhost:5173/*` (for local development)
- **Web origins**: 
  - `https://your-baseball-app-domain.com`
  - `http://localhost:5173` (for local development)
- Click **"Save"**

### 5. Note Down Configuration
You'll need these values for your React app:
- **Keycloak URL**: `https://keycloak.yourdomain.com`
- **Realm**: `baseball-scorer`
- **Client ID**: `baseball-scorer-app`

## Environment Variables for React App

After Keycloak is set up, you'll add these to your baseball-scorer app:

```env
KEYCLOAK_URL=https://keycloak.yourdomain.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app
```

## Testing Keycloak Installation

1. **Access Keycloak Admin Console**
   - Should load without errors
   - You should be able to create realms and clients

2. **Test Well-Known Endpoint**
   - Visit: `https://keycloak.yourdomain.com/realms/baseball-scorer/.well-known/openid-configuration`
   - Should return JSON configuration

3. **Test Login Page**
   - Visit: `https://keycloak.yourdomain.com/realms/baseball-scorer/protocol/openid-connect/auth?client_id=baseball-scorer-app&redirect_uri=https://your-baseball-app-domain.com&response_type=code&scope=openid`
   - Should show Keycloak login page

## Troubleshooting

### Keycloak Not Starting
- Check Cloudron app logs: `cloudron logs keycloak`
- Verify database connection
- Check if port 8080/8443 is available

### Can't Access Admin Console
- Verify the subdomain is correct
- Check Cloudron app status (should be "Running")
- Try accessing via IP if DNS not configured

### Database Connection Issues
- Cloudron should automatically provision PostgreSQL
- Check database credentials in Cloudron app settings
- Verify database is running

## Next Steps

Once Keycloak is installed and configured:
1. ✅ Keycloak is running and accessible
2. ✅ Realm `baseball-scorer` is created
3. ✅ Client `baseball-scorer-app` is configured
4. ✅ Redirect URIs are set correctly
5. → Proceed to integrate Keycloak into React app

## Resources

- [Keycloak Documentation](https://www.keycloak.org/docs)
- [Cloudron Documentation](https://docs.cloudron.io/)
- [Keycloak Admin Console Guide](https://www.keycloak.org/docs/latest/server_admin/)


