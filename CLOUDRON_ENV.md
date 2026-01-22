# Cloudron Environment Variables Configuration

## Overview

The Baseball Scoreboard app supports environment variables that can be configured in two ways on Cloudron:

1. **Cloudron Built-in System** (Recommended - via Dashboard or CLI)
2. **`.env` file in `/app/data/`** (Alternative method - editable after installation)

According to [Cloudron documentation](https://docs.cloudron.io/packaging/cheat-sheet/), the recommended way to set environment variables is using Cloudron's built-in system via `cloudron env` command or the dashboard UI.

## Method 1: Cloudron Built-in Environment Variables (Recommended)

**Using Cloudron Dashboard:**
1. Go to your Cloudron dashboard
2. Select the Baseball Scoreboard app
3. Click on **Settings** → **Environment Variables**
4. Add your environment variables:
   - `UNLOCK_KEY` = your unlock password
   - `DIRECTUS_URL` = https://your-directus-instance.com
   - `DIRECTUS_STATIC_TOKEN` = your-admin-static-token
   - `DIRECTUS_SCOREKEEPER_TOKEN` = your-scorekeeper-user-token
5. Click **Save**
6. Restart the app for changes to take effect

**Using Cloudron CLI:**
```bash
cloudron env set --app <your-app-location> UNLOCK_KEY=your-password
cloudron env set --app <your-app-location> DIRECTUS_URL=https://your-directus-instance.com
cloudron env set --app <your-app-location> DIRECTUS_STATIC_TOKEN=your-token
cloudron env set --app <your-app-location> DIRECTUS_SCOREKEEPER_TOKEN=your-token
```

Then restart the app:
```bash
cloudron restart --app <your-app-location>
```

## Method 2: Using .env File in /app/data/ (Alternative)

The app will automatically load environment variables from `/app/data/.env` if it exists. This file takes precedence over Cloudron dashboard environment variables.

### Creating/Editing the .env File

**Option 1: Using Cloudron File Manager**
1. Go to your Cloudron dashboard
2. Select the Baseball Scoreboard app
3. Click on **"File Manager"** tab
4. Navigate to `/app/data/`
5. Create or edit `.env` file
6. Restart the app for changes to take effect

**Option 2: Using Cloudron Terminal**
1. Go to your Cloudron dashboard
2. Select the Baseball Scoreboard app
3. Click on **"Terminal"** tab
4. Run:
   ```bash
   cd /app/data
   nano .env  # or use your preferred editor
   ```
5. Restart the app for changes to take effect

### .env File Format

Create a file at `/app/data/.env` with the following format:

```env
# Unlock Key (password to unlock the app on first load)
UNLOCK_KEY=unlock

# Directus CMS Integration (optional)
DIRECTUS_URL=https://your-directus-instance.com
DIRECTUS_STATIC_TOKEN=your-admin-static-token-here
DIRECTUS_SCOREKEEPER_TOKEN=your-scorekeeper-user-token-here

# WordPress Integration (optional - deprecated, use Directus instead)
WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your-wp-username
WP_APP_PASS=your-wp-application-password
```

### Available Environment Variables

- **UNLOCK_KEY**: Password to unlock the app on first load (default: "unlock")
- **DIRECTUS_URL**: Your Directus CMS instance URL
- **DIRECTUS_STATIC_TOKEN**: Directus admin/static token for saving game data
- **DIRECTUS_SCOREKEEPER_TOKEN**: Directus scorekeeper user token for fetching scheduled games
- **WP_SITE_URL**: WordPress site URL (deprecated)
- **WP_USERNAME**: WordPress username (deprecated)
- **WP_APP_PASS**: WordPress application password (deprecated)

### Notes

- Lines starting with `#` are comments and will be ignored
- Values can be wrapped in quotes (single or double) or used without quotes
- Empty lines are ignored
- The `.env` file takes precedence over Cloudron dashboard environment variables (if both are set)
- **Note**: Cloudron's built-in environment variable system (Method 1) is the recommended approach per [Cloudron documentation](https://docs.cloudron.io/packaging/cheat-sheet/)
- Changes require an app restart to take effect
- The `/app/data/` directory is persistent across app updates and backups

### Troubleshooting

If environment variables aren't loading:
1. Check file permissions: `/app/data/.env` should be readable
2. Verify the file format (KEY=value, one per line)
3. Check app logs for any error messages about loading the .env file
4. Ensure the app has been restarted after creating/editing the file

