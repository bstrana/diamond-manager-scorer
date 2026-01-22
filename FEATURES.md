# Baseball Scoreboard - Feature List

## 🎯 Core Features

### Game Management
- **Game Setup**
  - Team name and logo configuration
  - Roster management with batting order
  - Player number, name, and position assignment
  - Team color customization
  - Competition and location tracking
  - Game date/time from Directus integration

- **Game Flow Control**
  - Start/Resume/Pause game
  - Finalize game
  - Inning management (top/bottom)
  - Automatic inning advancement
  - Out tracking (0-3)

### Scoring System
- **Pitch Tracking**
  - Ball/Strike count
  - Foul ball tracking
  - Pitch sequence recording
  - Automatic walk on 4 balls
  - Strikeout with type selection (Looking/Swinging)

- **Hit Recording**
  - Single (1B)
  - Double (2B)
  - Triple (3B)
  - Home Run (HR)
  - **Hit Descriptions** with visual field diagram:
    - Trajectory selection (Line Drive, Grounder, Fly Ball, Popup, Bunt)
    - Location selection (Outfield zones, Infield positions, Position gaps, Base lines)
    - Depth selection for outfield hits (Shallow, Medium, Deep, Warning Track, Wall)

- **Out Types**
  - Strikeout (with Looking/Swinging distinction)
  - Fly Out
  - Ground Out
  - Sacrifice Fly
  - Sacrifice Bunt
  - Fielder's Choice
  - Reached on Error

- **Base Running**
  - Automatic runner advancement on hits
  - Manual runner advancement
  - Stolen base tracking
  - Caught stealing
  - Runner out on base
  - Pinch runner substitution
  - Runner advance on error

- **Other Plays**
  - Walk (Base on Balls)
  - Intentional Walk
  - Hit By Pitch (HBP)
  - Balk
  - Error tracking

### Statistics Tracking
- **Batter Stats**
  - Plate Appearances (PA)
  - At Bats (AB)
  - Hits (H)
  - Singles, Doubles, Triples, Home Runs
  - Runs Batted In (RBI)
  - Runs Scored
  - Walks (BB)
  - Strikeouts (SO)
  - Stolen Bases (SB)
  - Caught Stealing (CS)
  - Batting Average (AVG)
  - On-Base Percentage (OBP)
  - Slugging Percentage (SLG)

- **Pitcher Stats**
  - Innings Pitched (IP)
  - Runs Allowed (R)
  - Earned Runs (ER)
  - Earned Run Average (ERA)
  - Hits Allowed
  - Walks Allowed
  - Strikeouts Pitched
  - Pitch Count
  - Balls/Strikes Thrown

- **Defensive Stats**
  - Putouts (PO)
  - Assists (A)
  - Errors (E)
  - Error type (Fielding/Throwing)

- **Team Stats**
  - Total Score
  - Total Hits
  - Total Errors
  - Left On Base (LOB)
  - Runs by Inning (Linescore)

### Display & Overlays
- **Main Scoreboard**
  - Team names and logos
  - Current score
  - Inning indicator (top/bottom)
  - Ball/Strike/Out count
  - Current batter and pitcher
  - On-deck batter
  - Base runners
  - Team statistics (hits, errors, LOB)
  - Customizable display options

- **Batter Lower Thirds**
  - Current batter information
  - Player photo with team color border
  - Batting stats
  - Game setup information (when not playing)
  - Team logos
  - Customizable background and text colors

- **Linescore Overlay**
  - Runs by inning for both teams
  - Total runs
  - Clean, broadcast-ready display

### User Interface
- **Control Panel**
  - Intuitive button-based controls
  - Organized sections (Pitch, Hit, Out, etc.)
  - Real-time game state display
  - Base runner management
  - Corrections panel for adjustments

- **Keyboard Shortcuts**
  - **B** - Ball
  - **S** - Strike
  - **F** - Foul
  - **1** - Single
  - **2** - Double
  - **3** - Triple
  - **H** - Home Run
  - **O** - Fly Out
  - **G** - Ground Out
  - **W** - Intentional Walk
  - **P** - Hit By Pitch
  - **E** - Reached on Error
  - **?** - Show/Hide Shortcuts Help

- **Modals & Forms**
  - Hit description modal with visual field diagram
  - Strikeout type selection (Looking/Swinging)
  - Defensive play recording
  - Game setup form
  - Settings modal
  - Game summary modal

### Data Integration
- **Directus CMS Integration**
  - Game creation and updates
  - Plate appearance recording
  - Score synchronization
  - Game schedule import
  - Team and roster import
  - Player photo integration

- **Game Schedule Import**
  - Fetch games from Directus
  - Import team rosters
  - Import player data with photos
  - Automatic team logo loading

### Game Summary & Reporting
- **Game Summary**
  - Final score
  - Game duration
  - Winning/Losing pitcher
  - Top performers (hitters, RBI leaders)
  - Home runs
  - Key plays with hit descriptions

- **AI-Powered Game Recaps**
  - OpenRouter AI integration
  - Configurable AI models
  - Professional narrative recaps
  - Includes hit descriptions and key moments
  - Free model support (e.g., Mistral 7B)

### Settings & Customization
- **Scoreboard Display Options**
  - Show/Hide hits
  - Show/Hide errors
  - Show/Hide LOB
  - Show/Hide current pitcher
  - Show/Hide current batter
  - Show/Hide on-deck batter

- **Lower Thirds Customization**
  - Background color picker
  - Text color picker
  - Real-time preview

### Security & Authentication
- **Keycloak Integration**
  - OpenID Connect authentication
  - Secure user management
  - Single Sign-On (SSO) support
  - Configurable realms and clients

### Deployment & Infrastructure
- **Docker Support**
  - Multi-stage build
  - Optimized production image
  - Health checks
  - Cloudron-ready

- **OBS Integration**
  - Browser source compatibility
  - Real-time state updates
  - Server-side polling
  - No-cache headers
  - Multiple overlay pages

- **Real-Time Synchronization**
  - BroadcastChannel API
  - localStorage fallback
  - Server-side API polling
  - Cross-tab/window updates

### Advanced Features
- **Player Management**
  - Roster editing
  - Player substitution
  - Position swapping
  - Pinch runner assignment
  - Drag-and-drop roster reordering

- **Corrections & Adjustments**
  - Count corrections (balls/strikes/outs)
  - Inning corrections
  - Pitch count corrections
  - Base runner corrections
  - Error corrections
  - Manual adjustments

- **Export & Sharing**
  - Game summary export
  - Copy scoreboard links
  - Copy linescore links
  - Copy batter lower thirds links
  - Share game data

## 🎨 Visual Features

### Field Diagram
- Interactive baseball field visualization
- Clickable zones for hit location selection
- Outfield areas (LF, LC, CF, RC, RF)
- Infield positions (P, C, 1B, 2B, SS, 3B)
- Position gaps (between players)
- Base lines (first base line, third base line)
- Visual feedback on hover and selection
- Real-time description preview

### Team Branding
- Team logo display
- Team color customization
- Logo integration in lower thirds
- Player photo support with fallback

## 🔧 Technical Features

### Performance
- Optimized React rendering
- Efficient state management
- Lazy loading
- Code splitting
- Production build optimization

### Browser Compatibility
- Modern browser support
- OBS browser source compatible
- Mobile-responsive design
- Touch-friendly controls

### Data Persistence
- LocalStorage backup
- Server-side caching
- Real-time synchronization
- Game state recovery

## 📊 Statistics & Analytics

- Comprehensive player statistics
- Team performance tracking
- Inning-by-inning breakdown
- Pitching performance metrics
- Defensive statistics
- Game summary generation

## 🌐 Integration Capabilities

- Directus CMS
- Keycloak authentication
- OpenRouter AI
- WordPress (optional)
- Google Sheets (optional)

---

## Feature Highlights

✨ **Visual Hit Descriptions** - Click on a baseball field diagram to record exactly where hits went  
⌨️ **Keyboard Shortcuts** - Fast scoring with keyboard controls  
🎯 **Strikeout Types** - Distinguish between looking and swinging strikeouts  
🤖 **AI Game Recaps** - Generate professional game summaries with AI  
📊 **Comprehensive Stats** - Track every aspect of the game  
🎨 **Customizable Display** - Tailor the scoreboard to your needs  
🔐 **Secure Authentication** - Keycloak integration for user management  
📱 **OBS Ready** - Multiple overlay pages for streaming  


