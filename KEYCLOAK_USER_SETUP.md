# Setting Up Users in Keycloak

## Yes, You Need to Create Users

Keycloak acts as your authentication provider, so you need to create user accounts in Keycloak for anyone who needs to access the baseball scorer app.

## How to Create Users in Keycloak

### Step 1: Access Keycloak Admin Console

1. Go to `https://usergate.bstrana.com`
2. Log in with your admin credentials
3. Select the realm: `baseball-scorer`

### Step 2: Create a User

1. **Navigate to Users**
   - Click on **Users** in the left sidebar
   - Click **Add user** button (top right)

2. **Fill in User Details**
   - **Username**: Enter a username (e.g., `scorekeeper`, `admin`, `john.doe`)
   - **Email**: Enter user's email address (optional but recommended)
   - **First name**: User's first name (optional)
   - **Last name**: User's last name (optional)
   - **Email verified**: Toggle ON if you want to skip email verification
   - **Enabled**: Make sure this is ON (user account is active)

3. **Save the User**
   - Click **Create** button

### Step 3: Set User Password

1. **Go to Credentials Tab**
   - After creating the user, click on the **Credentials** tab
   - Click **Set password**

2. **Set Password**
   - Enter the password
   - **Temporary**: Toggle OFF (so user doesn't have to change password on first login)
   - Click **Save**

3. **Confirm Password**
   - You'll be asked to confirm - click **Set password**

### Step 4: Assign Roles (Optional)

If you want to use role-based access control:

1. **Go to Role Mappings Tab**
   - Click on **Role mappings** tab
   - Click **Assign role**

2. **Assign Realm Roles**
   - Select roles to assign (if you've created custom roles)
   - Or use default roles like `offline_access` for token refresh

## User Login Flow

Once a user is created:

1. **User visits your app**: `https://baseball-scorer.yourball.club`
2. **App redirects to Keycloak**: User sees Keycloak login page
3. **User enters credentials**: Username and password you created
4. **Keycloak authenticates**: Validates credentials
5. **User redirected back**: Returns to your app, now authenticated

## Multiple Users

You can create as many users as needed:

- **Scorekeepers**: Create separate accounts for each scorekeeper
- **Admins**: Create admin accounts with different permissions
- **Test Users**: Create test accounts for development

## User Management Options

### Self-Registration (Optional)

You can enable user self-registration in Keycloak:

1. Go to **Realm Settings** → **Login**
2. Enable **User registration**
3. Users can then create their own accounts

### Email Verification (Optional)

1. Configure email server in Keycloak
2. Enable **Email verification** in realm settings
3. Users receive verification emails

### Password Reset (Optional)

1. Enable **Forgot password** in realm settings
2. Users can reset passwords via email

## Quick Setup Example

**Creating your first user:**

1. Admin Console → `baseball-scorer` realm
2. **Users** → **Add user**
3. Username: `scorekeeper`
4. Email: `scorekeeper@yourball.club`
5. Enabled: ON
6. **Save**
7. **Credentials** tab → **Set password**
8. Password: `your-secure-password`
9. Temporary: OFF
10. **Save**

**Test login:**
- Visit `https://baseball-scorer.yourball.club`
- Should redirect to Keycloak login
- Enter `scorekeeper` / `your-secure-password`
- Should redirect back and unlock app

## Important Notes

- **No app-side user management needed**: All users are managed in Keycloak
- **Centralized authentication**: One Keycloak instance can serve multiple apps
- **Single Sign-On (SSO)**: Users logged into Keycloak can access other apps without re-logging
- **Password policies**: Configure password requirements in Keycloak realm settings

## Troubleshooting

### User can't log in
- Check user is **Enabled** in Keycloak
- Verify password is set correctly
- Check user is in the correct realm (`baseball-scorer`)

### User not redirected back to app
- Verify **Valid redirect URIs** includes your app domain
- Check **Web Origins** is configured correctly

### User sees "Access Denied"
- Check user has necessary roles/permissions
- Verify client configuration allows the user


