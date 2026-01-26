# Diamond Manager Scorer ⚾

A professional, feature-rich baseball scoring application with real-time scoreboard overlays, comprehensive statistics tracking, and AI-powered game recaps.

## 📚 Documentation


## 🚀 Quick Start


See [QUICK_START.md](./QUICK_START.md) for detailed instructions.

## ⚾ Diamond Manager Scorer

A real-time baseball scoring application with live scoreboard overlay for streaming.

## Run Locally

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file (optional):**
   Create a `.env.local` file in the root directory with the following variables (all are optional - the app works without them):
   ```env
   # Unlock Key (defaults to 'unlock' if not set)
   UNLOCK_KEY=unlock
   
   # Data providers (optional)
   # DATA_PROVIDER: one of "pocketbase", "none"
   # SCHEDULE_PROVIDER: one of "pocketbase", "none"
   # POCKETBASE_URL: Your PocketBase instance URL (e.g., https://pb.your-domain.com)
   DATA_PROVIDER=pocketbase
   SCHEDULE_PROVIDER=pocketbase
   POCKETBASE_URL=https://pb.your-domain.com

  # Scheduler app schedule source (optional)
  # When set, the scorer reads schedules from the scheduler app's published collection
  POCKETBASE_SCHEDULE_SOURCE_COLLECTION=schedules
  POCKETBASE_SCHEDULE_APP_ID=scheduler
  POCKETBASE_SCHEDULE_ORG_ID=your-org-id
  POCKETBASE_SCHEDULE_USER_ID=your-user-id
   
   # WordPress Integration (optional - deprecated)
   WP_SITE_URL=https://your-wordpress-site.com
   WP_USERNAME=your-wp-username
   WP_APP_PASS=your-wp-application-password
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   The app will be available at `http://localhost:3000`

### Environment Variables Explained

- **UNLOCK_KEY**: Password to unlock the app on first load (defaults to `'unlock'` if not set)
- **DATA_PROVIDER**: Persistence provider (`pocketbase` or `none`)
- **SCHEDULE_PROVIDER**: Schedule provider (`pocketbase` or `none`)
- **POCKETBASE_URL**: Your PocketBase instance URL (optional - app works without it)
- **POCKETBASE_SCHEDULE_SOURCE_COLLECTION**: Scheduler app collection to read from
- **POCKETBASE_SCHEDULE_APP_ID**: App id stored by Scheduler (default: `scheduler`)
- **POCKETBASE_SCHEDULE_ORG_ID**: Org id filter (optional)
- **POCKETBASE_SCHEDULE_USER_ID**: User id filter (optional)
- **WP_SITE_URL**, **WP_USERNAME**, **WP_APP_PASS**: For WordPress integration (deprecated)

**Note:** The app will work perfectly fine without any environment variables. You'll just see console warnings about missing integrations, but all core scoring features will function normally.

## Testing the App

### Basic Testing Workflow

1. **Unlock the app:**
   - When you first load the app, you'll see a lock screen
   - Enter the unlock key (default: `'unlock'` or your custom `UNLOCK_KEY`)
   - The unlock state persists in sessionStorage

2. **Set up a game:**
   - Click "Game Setup" or the settings icon
   - Fill in team names, rosters, competition name, and location
   - Roster format: `batting_order, number, name, position` (one per line)
   - Example:
     ```
     1, 7, Mookie Betts, 2B
     2, 5, Corey Seager, SS
     0, 22, Clayton Kershaw, P
     ```
   - Click "Start Game"

3. **Test scoring:**
   - Use the Control Panel to record pitches, hits, and outs
   - Try different play types:
     - **Pitch Outcome**: Ball, Strike, Foul
     - **Hits**: Single (1B), Double (2B), Triple (3B), Home Run
     - **Outs**: Strikeout, Fly Out, Ground Out
     - **Special Plays**: Sac Fly, Sac Bunt, HBP, Intentional Walk, Balk
   - Watch the scoreboard update in real-time

4. **Test runner management:**
   - When runners are on base, use the "Runner Actions" section
   - Try: Stolen Base, Caught Stealing, Manual Advance, Pinch Runner

5. **Test corrections:**
   - Open "Manual Corrections" section
   - Adjust balls, strikes, outs, inning, pitch count, errors
   - Manually set/clear base runners

6. **Test the scoreboard overlay:**
   - Open a new tab/window and go to `http://localhost:3000/scoreboard`
   - This is the overlay view for streaming (OBS)
   - Make changes in the main app - the overlay should update automatically via BroadcastChannel
   - Toggle green screen background for chroma key

7. **Test game finalization:**
   - Click "Final" button when game is over
   - Confirm the action
   - View the game summary modal

### Testing Different Scenarios

- **Multiple innings**: Let the game progress through several innings
- **Substitutions**: Use the Player Stats panel to substitute players
- **Position swaps**: Change player positions during the game
- **Error tracking**: Record errors and see them reflected in team stats
- **Pitching changes**: Track different pitchers and their stats
- **Complex plays**: Test fielder's choice, reached on error, runner advances

### Browser Testing

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Should work, but BroadcastChannel may have limitations
- **Mobile**: Responsive design works on mobile browsers

### Troubleshooting

- **App won't unlock**: Check that `UNLOCK_KEY` in `.env.local` matches what you're entering, or use default `'unlock'`
- **Scoreboard overlay not updating**: Make sure both tabs are on the same origin (localhost:3000)
- **Data provider errors**: Check console - app will continue working even if the provider is unavailable
- **WordPress errors**: Only affects WordPress integration features, core scoring still works

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

