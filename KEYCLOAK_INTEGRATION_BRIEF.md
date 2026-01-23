# Keycloak Integration Brief

## What is Keycloak?

**Keycloak** is an open-source Identity and Access Management (IAM) solution that provides:
- **Single Sign-On (SSO)** - Users authenticate once, access multiple apps
- **User Federation** - Connect to LDAP, Active Directory, or social providers (GitHub, Facebook, etc.)
- **Multi-factor Authentication (MFA)** - Support for 2FA, SMS, hardware tokens
- **Fine-grained Authorization** - Role-based access control (RBAC)
- **Token-based Authentication** - Uses OpenID Connect (OIDC) and OAuth 2.0 standards

## Current Authentication vs. Keycloak

### Current System
- Simple password-based unlock (`UNLOCK_KEY` environment variable)
- No user management
- No session management
- No multi-user support
- No audit logging

### With Keycloak
- **User accounts** - Each user has their own login credentials
- **Centralized authentication** - One Keycloak instance can serve multiple applications
- **Session management** - Automatic token refresh, logout, session timeout
- **Multi-user support** - Different users can have different roles/permissions
- **Audit trails** - Track who accessed what and when
- **Social login** - Optional integration with common social providers

## How It Would Work

### Architecture Flow

```
User → React App → Keycloak Login Page → User Authenticates → 
Keycloak Issues Tokens → React App Receives Tokens → App Unlocked
```

### Technical Implementation

1. **Keycloak Server Setup** (separate service)
   - Install Keycloak (Docker, Kubernetes, or standalone)
   - Create a "realm" for your application
   - Create a "client" (your React app)
   - Configure redirect URIs

2. **React App Integration**
   - Install Keycloak JavaScript adapter or `react-oidc-context` library
   - Initialize Keycloak with client ID and realm URL
   - Replace `LockScreen` component with Keycloak login redirect
   - Store access tokens in memory/sessionStorage
   - Use tokens to verify authentication status

3. **Token Validation**
   - Access tokens are JWTs (JSON Web Tokens)
   - Can be validated locally (no server call needed)
   - Tokens include user info (username, roles, etc.)
   - Tokens expire and can be refreshed automatically

## Implementation Approach

### Option 1: Keycloak JavaScript Adapter (Official)
```javascript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://keycloak.example.com',
  realm: 'baseball-scorer',
  clientId: 'baseball-scorer-app'
});

keycloak.init({ onLoad: 'login-required' })
  .then(authenticated => {
    if (authenticated) {
      // User is authenticated, unlock app
      setIsUnlocked(true);
    }
  });
```

**Pros:**
- Official Keycloak library
- Well-maintained
- Full feature support

**Cons:**
- Larger bundle size
- More complex API

### Option 2: react-oidc-context (Recommended for React)
```javascript
import { AuthProvider } from 'react-oidc-context';

const oidcConfig = {
  authority: 'https://keycloak.example.com/realms/baseball-scorer',
  client_id: 'baseball-scorer-app',
  redirect_uri: window.location.origin,
  // ... other config
};

<AuthProvider {...oidcConfig}>
  <App />
</AuthProvider>
```

**Pros:**
- React-specific, hooks-based API
- Smaller bundle size
- Modern React patterns
- Better TypeScript support

**Cons:**
- Third-party library (but well-maintained)

## Required Changes

### 1. Package Dependencies
```json
{
  "dependencies": {
    "react-oidc-context": "^3.0.0"  // or "keycloak-js": "^24.0.0"
  }
}
```

### 2. Environment Variables
```env
KEYCLOAK_URL=https://keycloak.example.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app
```

### 3. Component Changes
- **Replace `LockScreen.tsx`** - Use Keycloak login redirect instead of password input
- **Update `App.tsx`** - Check Keycloak authentication status instead of `sessionStorage`
- **Add Auth Context** - Wrap app with Keycloak provider

### 4. Server Changes (Optional)
- Add token validation endpoint if needed
- Store user info in session if needed

## Benefits

### Security
✅ **No password in environment variables** - More secure than `UNLOCK_KEY`  
✅ **Token-based** - JWTs with expiration and refresh  
✅ **Industry standard** - OIDC/OAuth 2.0 compliant  
✅ **Audit logging** - Track authentication events  

### User Experience
✅ **Single Sign-On** - Users login once, access multiple apps  
✅ **Social login** - Optional social provider login  
✅ **Password reset** - Built-in password recovery  
✅ **Remember me** - Session persistence  

### Management
✅ **User management** - Admin console for user accounts  
✅ **Role-based access** - Different permissions per user  
✅ **Multi-user support** - Multiple users can access the app  
✅ **Centralized** - One Keycloak instance for all apps  

## Considerations

### Deployment Complexity
- **Additional service** - Keycloak needs to be deployed separately
- **Database** - Keycloak requires a database (PostgreSQL, MySQL, etc.)
- **Configuration** - More setup required than simple password

### Cloudron Compatibility
✅ **Keycloak available on Cloudron** - Can be installed as a Cloudron app  
✅ **Same platform** - Both apps on Cloudron, easier integration  
✅ **Internal networking** - Apps can communicate internally  

### Migration Path
1. **Phase 1**: Keep both systems (Keycloak + password unlock)
2. **Phase 2**: Make Keycloak primary, password as fallback
3. **Phase 3**: Remove password unlock entirely

## Estimated Implementation Time

- **Keycloak setup**: 1-2 hours (if using Cloudron app)
- **React integration**: 2-4 hours
- **Testing & refinement**: 1-2 hours
- **Total**: 4-8 hours

## Recommendation

**Yes, Keycloak integration is feasible and recommended** if you:
- Need multi-user support
- Want better security than password-based unlock
- Plan to have multiple applications
- Want centralized user management
- Are already using Cloudron (Keycloak available as app)

**Consider keeping password unlock** if you:
- Only need single-user access
- Want the simplest possible setup
- Don't need user management features

## Next Steps (If Proceeding)

1. **Install Keycloak on Cloudron** (or your server)
2. **Create realm and client** in Keycloak admin console
3. **Install React library** (`react-oidc-context` recommended)
4. **Replace LockScreen** with Keycloak authentication
5. **Test authentication flow**
6. **Remove password unlock** (optional, can keep as fallback)

## Resources

- [Keycloak Documentation](https://www.keycloak.org/docs)
- [react-oidc-context GitHub](https://github.com/authts/react-oidc-context)
- [Keycloak JavaScript Adapter](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter)
- [Cloudron Keycloak App](https://www.cloudron.io/store/com.keycloak.cloudronapp.html)


