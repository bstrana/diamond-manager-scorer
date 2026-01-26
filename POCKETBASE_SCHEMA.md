## PocketBase Schema and Setup

This document describes a suggested PocketBase schema and setup flow for the current app.
It focuses on a normalized data model (Option B) to support richer querying and future features.

### Environment Variables

```env
POCKETBASE_URL=https://scorer-db.your-domain.com
DATA_PROVIDER=pocketbase
SCHEDULE_PROVIDER=pocketbase

KEYCLOAK_URL=https://keycloak.your-domain.com
KEYCLOAK_REALM=baseball-scorer
KEYCLOAK_CLIENT_ID=baseball-scorer-app
```

### Collections

#### 1) games
Stores game metadata and live score snapshot.

Fields:
- `status` (select: setup, playing, final)
- `competition` (text)
- `location` (text)
- `scorekeeper_name` (text)
- `game_start_time` (datetime)
- `game_end_time` (datetime)
- `home_team` (relation -> teams)
- `away_team` (relation -> teams)
- `home_team_roster_text` (long text, optional)
- `away_team_roster_text` (long text, optional)
- `home_team_score` (number)
- `away_team_score` (number)
- `external_game_id` (text or number)

Notes:
- `home_team_roster_text` and `away_team_roster_text` can store raw roster strings
  used by the app (one player per line) to avoid mapping friction.

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
- `defensive_plays` (json)
- `hit_description` (json)

Notes:
- Use JSON fields to avoid manual serialization.

#### 3) teams
Stores team metadata.

Fields:
- `name` (text)
- `logo_url` (url or text)
- `color` (text)
- `short_name` (text, optional)

#### 4) players
Stores player metadata.

Fields:
- `first_name` (text)
- `last_name` (text)
- `number` (number, optional)
- `position` (text, optional)
- `photo_url` (url or text, optional)
- `full_name` (text, optional, can be derived)

#### 5) rosters
Stores roster groupings for teams (by season or game).

Fields:
- `team` (relation -> teams)
- `players` (relation -> players, multiple)
- `season` (text, optional)
- `game` (relation -> games, optional)

#### 6) schedules
Stores scheduled games for import.

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
- `schedules`: read for authenticated users; filter by team membership if needed.
- `team_members`: read for authenticated users; write restricted to admins.

### Optional: Read-Optimized Schedule Cache

If you want faster reads in the app, you can add a separate `schedule_payloads`
collection with a single `data` JSON field that contains `{ teams, leagues, games }`.
This can be kept in sync by a scheduled job or admin uploads.

### Implementation Notes

- The scorer app is expected to use its own PocketBase database (set `POCKETBASE_URL`
  to the scorer DB instance).
- The app expects schedule import to return team names, logos, colors, rosters,
  competition, location, and game date. Mirror that in PocketBase or update the provider.
- Store rosters as raw text to avoid mapping friction during the first integration pass.
- Prefer a server-side proxy for PocketBase writes if you want to keep credentials secure.
