## PocketBase Schema and Setup

This document describes a suggested PocketBase schema and setup flow for the current app.
It is designed to mirror the app's data flows while keeping things flexible
for PocketBase integration.

Note: The PocketBase integration is not implemented yet. Use this schema as the target.

### Environment Variables

```env
POCKETBASE_URL=https://pb.your-domain.com
DATA_PROVIDER=pocketbase
SCHEDULE_PROVIDER=pocketbase

KEYCLOAK_URL=https://keycloak.your-domain.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app
```

### Collections

#### 1) games
Stores game metadata and the live score snapshot.

Fields:
- `status` (select: setup, playing, final)
- `competition` (text)
- `location` (text)
- `scorekeeper_name` (text)
- `game_start_time` (datetime)
- `game_end_time` (datetime)
- `home_team_name` (text)
- `away_team_name` (text)
- `home_team_roster_text` (long text)
- `away_team_roster_text` (long text)
- `home_team_score` (number)
- `away_team_score` (number)
- `external_game_id` (text or number)

Notes:
- `home_team_roster_text` and `away_team_roster_text` should store the raw roster
  strings used by the app (one player per line).

#### 2) plate_appearances
Stores plate appearance events for a game.

Fields:
- `game` (relation -> games, required)
- `inning` (number)
- `is_top_inning` (bool)
- `result` (text)
- `rbis` (number)
- `pitch_sequence` (text)
- `batter_name` (text)
- `pitcher_name` (text)
- `defensive_plays_json` (long text)
- `hit_description_json` (long text)

Notes:
- `defensive_plays_json` and `hit_description_json` store JSON strings.

#### 3) teams
Optional, only needed if you plan to use the schedule import flow.

Fields:
- `name` (text)
- `logo_url` (url or text)
- `color` (text)

#### 4) players
Optional, only needed if you plan to use the schedule import flow.

Fields:
- `first_name` (text)
- `last_name` (text)
- `number` (number, optional)
- `position` (text, optional)
- `photo_url` (url or text, optional)

#### 5) rosters
Optional, only needed if you plan to use the schedule import flow.

Fields:
- `team` (relation -> teams)
- `players` (relation -> players, multiple)

#### 6) scheduled_games
Optional, only needed if you plan to use the schedule import flow.

Fields:
- `title` (text)
- `date` (datetime)
- `competition` (text)
- `location` (text)
- `status` (select: scheduled, in_progress, finished)
- `home_team` (relation -> teams)
- `away_team` (relation -> teams)
- `home_roster` (relation -> rosters)
- `away_roster` (relation -> rosters)

#### 7) team_members
Optional, only needed if you plan to restrict schedules by user.

Fields:
- `team` (relation -> teams, required)
- `user` (relation -> users auth collection, required)

Notes:
- The schedule provider should resolve the current user to a team via this collection.

### Auth (Keycloak via OIDC)

PocketBase supports OIDC authentication. Suggested setup:
1) In PocketBase Admin -> Settings -> Auth Providers, add OpenID Connect.
2) Set the issuer URL to your Keycloak realm (e.g. `https://keycloak.../realms/...`).
3) Set the client ID to match `KEYCLOAK_CLIENT_ID`.
4) Add redirect URIs required by PocketBase and your app host.

Make sure users are created or linked in PocketBase on first login.

### Access Rules (Suggested)

These are minimal suggestions and should be refined when the provider is implemented.

- `games`: read/write for authenticated users; optional server-side proxy if you want to
  keep write tokens off the client.
- `plate_appearances`: read/write for authenticated users.
- `scheduled_games`: read for authenticated users; filter by team membership if needed.
- `team_members`: read for authenticated users; write restricted to admins.

### Implementation Notes

- The app currently expects schedule import to return team names, logos, colors, rosters,
  competition, location, and game date. Mirror that in PocketBase or update the provider.
- Store rosters as raw text to avoid mapping friction during the first integration pass.
- Prefer a server-side proxy for PocketBase writes if you want to keep credentials secure.
