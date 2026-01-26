# Diamond Manager Scorer - Quick Start Tutorial

## 🚀 Getting Started

This guide will help you get up and running with the Diamond Manager Scorer application in minutes.

## Prerequisites

- Node.js 20+ (for local development)
- Docker (for deployment)
- Keycloak instance (for authentication)
- PocketBase instance (optional, for data storage)

## 📦 Installation

### Option 1: Docker (Recommended)

```bash
# Pull the image
docker pull 7od9/baseball-scorer:latest

# Run the container
docker run -d \
  -p 3000:3000 \
  -e KEYCLOAK_URL=https://your-keycloak.com \
  -e KEYCLOAK_REALM=baseball-scorer \
  -e KEYCLOAK_CLIENT_ID=baseball-scorer-app \
  --name baseball-scorer \
  7od9/baseball-scorer:latest
```

### Option 2: Local Development

```bash
# Clone or navigate to the project
cd baseball-scorer

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local with your configuration
# (See Configuration section below)

# Start development server
npm run dev
```

## ⚙️ Configuration

### Required Environment Variables

Create a `.env.local` file (for development) or set environment variables (for production):

```env
# Keycloak Authentication (Required)
KEYCLOAK_URL=https://your-keycloak.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app

# PocketBase Integration (Optional)
POCKETBASE_URL=https://pb.your-domain.com

# OpenRouter AI (Optional, for AI recaps)
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

### Keycloak Setup

1. **Create a Realm**
   - Log into Keycloak Admin Console
   - Create a new realm: `baseball-scorer`

2. **Create a Client**
   - In the realm, go to Clients → Create
   - Client ID: `baseball-scorer-app`
   - Client authentication: **Off** (Public client)
   - Valid redirect URIs: `https://your-app-domain.com/*`
   - Web origins: `https://your-app-domain.com`
   - Standard flow: **Enabled**

3. **Create Users**
   - Go to Users → Add user
   - Set username and password
   - Enable the user account

## 🎮 Basic Usage

### 1. Start a New Game

1. Click **"New Game"** or **"Setup Game"**
2. Enter team information:
   - Home team name
   - Away team name
   - Team colors (optional)
   - Team logos (optional)
3. Set up rosters:
   - Enter players manually, or
   - Click **"Fetch from Schedule"** to import from PocketBase
4. Click **"Start Game"**

### 2. Score a Game

#### Recording Pitches
- Click **"Ball"**, **"Strike"**, or **"Foul"** buttons
- Or use keyboard shortcuts: **B**, **S**, **F**
- On the third strike, select **"Looking"** or **"Swinging"**

#### Recording Hits
1. Click a hit button (**1B**, **2B**, **3B**, or **HR**)
2. In the modal:
   - Select trajectory (Line Drive, Grounder, Fly Ball, etc.)
   - Click on the field diagram where the ball went
   - Optionally select depth for outfield hits
3. Click **"Confirm"**
   - Or use keyboard shortcuts: **1**, **2**, **3**, **H**

#### Recording Outs
- Click **"Fly Out"** or **"Ground Out"**
- Select defensive players (putout, assists, errors)
- Or use keyboard shortcuts: **O**, **G**

#### Recording Other Plays
- **Walk**: Click **"Walk"** or press **W**
- **HBP**: Click **"HBP"** or press **P**
- **Error**: Click **"Reached on Error"** or press **E**

### 3. Manage Base Runners

- Runners advance automatically on hits
- Use **"Advance (H)"** for manual advancement
- Use **"Advance (E)"** for advancement on error
- Use **"SB"** buttons for stolen bases
- Use **"CS"** buttons for caught stealing
- Use **"Pinch Run"** to substitute runners

### 4. View Statistics

- Click on player names to see detailed stats
- View team statistics in the scoreboard
- Check linescore by inning
- View current batter and pitcher stats

### 5. End the Game

1. Click **"Finalize Game"**
2. Confirm the action
3. View the game summary
4. Optionally generate an AI recap

## 🎯 Keyboard Shortcuts

Press **?** to view all keyboard shortcuts, or use:

| Key | Action |
|-----|--------|
| **B** | Ball |
| **S** | Strike |
| **F** | Foul |
| **1** | Single |
| **2** | Double |
| **3** | Triple |
| **H** | Home Run |
| **O** | Fly Out |
| **G** | Ground Out |
| **W** | Intentional Walk |
| **P** | Hit By Pitch |
| **E** | Reached on Error |
| **?** | Show/Hide Shortcuts |

## 📺 OBS Integration

### Setting Up Overlays

1. **Main Scoreboard**
   - Add Browser Source in OBS
   - URL: `https://your-app-domain.com/scoreboard`
   - Width: 1920, Height: 1080

2. **Batter Lower Thirds**
   - Add Browser Source
   - URL: `https://your-app-domain.com/batter-lower-thirds`
   - Position at bottom of screen

3. **Linescore**
   - Add Browser Source
   - URL: `https://your-app-domain.com/linescore`
   - Position as needed

### Getting Links

- Click **"Copy Scoreboard Link"** in the footer
- Click **"Copy Lower Thirds Link"** in the footer
- Click **"Copy Linescore Link"** in the footer

## 🎨 Customization

### Scoreboard Display

1. Click the **Settings** icon (gear)
2. Toggle display options:
   - Show/Hide hits
   - Show/Hide errors
   - Show/Hide LOB
   - Show/Hide current pitcher/batter
   - Show/Hide on-deck batter

### Lower Thirds Colors

1. Open Settings
2. Adjust **Background Color** for lower thirds
3. Adjust **Text Color** for lower thirds
4. Changes apply immediately

## 📊 Game Summary

### Viewing Summary

1. After finalizing a game, click **"View Summary"**
2. Review the game summary
3. Click **"Generate AI Recap"** for an AI-powered narrative
4. Copy the summary for sharing

### AI Recap Setup

1. Get an API key from [OpenRouter.ai](https://openrouter.ai)
2. Set `OPENROUTER_API_KEY` in environment variables
3. Optionally set `OPENROUTER_MODEL` (defaults to free model)
4. Click **"Generate AI Recap"** in the game summary

## 🔧 Common Tasks

### Import Roster from PocketBase

1. Ensure PocketBase is configured
2. Click **"Fetch from Schedule"** in Game Setup
3. Select a game from the dropdown
4. Click **"Import Game Data"**
5. Rosters will be automatically populated

### Make Corrections

1. Click **"Corrections"** in the Control Panel
2. Adjust:
   - Ball/Strike count
   - Out count
   - Inning
   - Pitch count
   - Base runners
   - Errors

### Substitute Players

1. Click on a player in the roster
2. Select **"Substitute"**
3. Choose replacement player
4. Player stats are preserved

## 🐛 Troubleshooting

### Authentication Issues

- **Problem**: Can't log in
- **Solution**: 
  - Verify Keycloak URL, realm, and client ID
  - Check redirect URI matches exactly
  - Ensure client is public (authentication off)
  - Verify user exists in Keycloak

### PocketBase Connection Issues

- **Problem**: Can't fetch game data
- **Solution**:
  - Verify `POCKETBASE_URL` and schedule collection names are correct
  - Check API rules allow public reads (or configure auth)

### OBS Not Updating

- **Problem**: Overlays not showing updates
- **Solution**:
  - Check browser source URL is correct
  - Refresh the browser source
  - Verify no-cache headers are working
  - Check server-side polling is active

### Keyboard Shortcuts Not Working

- **Problem**: Keys not triggering actions
- **Solution**:
  - Ensure no input fields are focused
  - Check no modals are open
  - Verify game is in "playing" status
  - Press **?** to see available shortcuts

## 📚 Next Steps

- Read [FEATURES.md](./FEATURES.md) for complete feature list
- Review [KEYCLOAK_INTEGRATION_SUMMARY.md](./KEYCLOAK_INTEGRATION_SUMMARY.md) for auth setup
- See [OPENROUTER_SETUP.md](./OPENROUTER_SETUP.md) for AI recap configuration

## 💡 Tips

- **Use keyboard shortcuts** for faster scoring
- **Save frequently** - game state auto-saves to localStorage
- **Use hit descriptions** for detailed game records
- **Generate AI recaps** for professional game summaries
- **Customize colors** to match your team branding
- **Use OBS overlays** for professional streaming

## 🆘 Support

For issues or questions:
- Check the troubleshooting section above
- Review the feature documentation
- Verify environment variables are set correctly
- Check browser console for errors

---

**Happy Scoring! ⚾**


