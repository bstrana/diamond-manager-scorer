# Plate Appearance Data Structure

## Overview
A `PlateAppearance` object represents a single batter's turn at the plate during a game. It contains comprehensive information about the at-bat, including the players involved, the outcome, and detailed play information.

## TypeScript Interface

```typescript
export interface PlateAppearance {
  battingTeam: string;              // Name of the team at bat
  batter: Player;                    // The batter's player object
  pitcher: Player;                   // The pitcher's player object
  pitchSequence: string;             // Sequence of pitches (e.g., "BBSF" for ball, ball, strike, foul)
  result: PlateAppearanceResult;     // The outcome of the plate appearance
  runnersBattedIn: number;          // Number of RBIs from this plate appearance
  hitDescription?: HitDescription;  // Detailed hit location/trajectory (only for hits)
  defensivePlays?: {                 // Defensive play information (for outs)
    putoutBy?: Player;               // Player who made the putout
    assistBy?: Player[];             // Players who made assists
    errorBy?: Player;                // Player who committed an error
    errorType?: 'fielding' | 'throwing'; // Type of error
  };
}
```

## Field Details

### Required Fields

1. **`battingTeam`** (string)
   - The name of the team that is batting
   - Example: `"Home Team"` or `"Away Team"`

2. **`batter`** (Player object)
   - Complete player information including:
     - `id`: Unique identifier
     - `name`: Player's name
     - `number`: Jersey number
     - `position`: Current position
     - `battingOrder`: Position in batting order
     - `stats`: Current statistics
     - `photoUrl`: Optional player photo URL

3. **`pitcher`** (Player object)
   - Complete pitcher information (same structure as batter)

4. **`pitchSequence`** (string)
   - String representation of all pitches in the at-bat
   - Characters: `B` = Ball, `S` = Strike, `F` = Foul
   - Example: `"BBSF"` = ball, ball, strike, foul

5. **`result`** (PlateAppearanceResult)
   - The outcome of the plate appearance
   - Possible values:
     - Hits: `'single'`, `'double'`, `'triple'`, `'homerun'`
     - Walks: `'walk'`, `'HBP'` (Hit By Pitch), `'IBB'` (Intentional Walk)
     - Outs: `'strikeout'`, `'flyout'`, `'groundout'`
     - Special: `'sac_fly'`, `'sac_bunt'`, `'fielders_choice'`, `'reached_on_error'`

6. **`runnersBattedIn`** (number)
   - Number of runs scored as a result of this plate appearance
   - Includes the batter if they score (e.g., on a home run)

### Optional Fields

7. **`hitDescription`** (HitDescription object, optional)
   - Only present when `result` is a hit (`single`, `double`, `triple`, `'homerun'`)
   - Contains detailed information about where and how the ball was hit:
   ```typescript
   {
     trajectory: 'line_drive' | 'grounder' | 'fly_ball' | 'popup' | 'bunt';
     locationType: 'outfield' | 'infield_position' | 'position_gap' | 'special';
     fieldDirection?: 'left' | 'left_center' | 'center' | 'right_center' | 'right';
     positionGap?: 'ss_3b' | '1b_2b' | '2b_ss' | '3b_ss' | 'pitcher_mound' | 'up_middle';
     infieldPosition?: 'pitcher' | 'catcher' | 'first' | 'second' | 'shortstop' | 'third';
     depth?: 'shallow' | 'medium' | 'deep' | 'warning_track' | 'wall';
     specialLocation?: 'third_base_line' | 'first_base_line' | 'up_middle' | 'through_box';
   }
   ```

8. **`defensivePlays`** (object, optional)
   - Only present when `result` is an out or error
   - Contains information about defensive players involved:
   ```typescript
   {
     putoutBy?: Player;        // Player who recorded the putout
     assistBy?: Player[];      // Players who recorded assists
     errorBy?: Player;          // Player who committed an error
     errorType?: 'fielding' | 'throwing'; // Type of error
   }
   ```

## Storage in Data Provider

When saved to a configured data provider, the plate appearance is stored in the `plate_appearances` collection with the following fields:

| Directus Field | Source | Description |
|----------------|--------|-------------|
| `game` | `gameId` | Reference to the game |
| `inning` | `inning` | Inning number |
| `is_top_inning` | `isTopInning` | Boolean: top or bottom of inning |
| `result` | `result` | Outcome of plate appearance |
| `rbis` | `runnersBattedIn` | Runs batted in |
| `pitch_sequence` | `pitchSequence` | String of pitch types |
| `batter_name` | `batter.name + number` | Formatted as "Name (#Number)" |
| `pitcher_name` | `pitcher.name + number` | Formatted as "Name (#Number)" |
| `defensive_plays_json` | `defensivePlays` | JSON string of defensive play info |
| `hit_description_json` | `hitDescription` | JSON string of hit description |

## Example Plate Appearance

### Single Hit with Description
```typescript
{
  battingTeam: "Home Team",
  batter: {
    id: "player-123",
    name: "John Doe",
    number: 7,
    position: "2B",
    battingOrder: 1,
    stats: { ... },
    photoUrl: "https://..."
  },
  pitcher: {
    id: "player-456",
    name: "Jane Smith",
    number: 22,
    position: "P",
    battingOrder: 0,
    stats: { ... }
  },
  pitchSequence: "BBSF",
  result: "single",
  runnersBattedIn: 1,
  hitDescription: {
    trajectory: "line_drive",
    locationType: "outfield",
    fieldDirection: "left_center",
    depth: "medium"
  }
}
```

### Strikeout
```typescript
{
  battingTeam: "Away Team",
  batter: { ... },
  pitcher: { ... },
  pitchSequence: "SSS",
  result: "strikeout",
  runnersBattedIn: 0,
  defensivePlays: {
    putoutBy: {
      id: "player-789",
      name: "Catcher Name",
      number: 5,
      ...
    }
  }
}
```

### Fly Out with Defensive Plays
```typescript
{
  battingTeam: "Home Team",
  batter: { ... },
  pitcher: { ... },
  pitchSequence: "BSF",
  result: "flyout",
  runnersBattedIn: 0,
  defensivePlays: {
    putoutBy: { id: "player-101", name: "Center Fielder", ... },
    assistBy: [
      { id: "player-102", name: "Left Fielder", ... }
    ]
  }
}
```

### Home Run
```typescript
{
  battingTeam: "Away Team",
  batter: { ... },
  pitcher: { ... },
  pitchSequence: "BS",
  result: "homerun",
  runnersBattedIn: 3, // Includes batter + 2 runners on base
  hitDescription: {
    trajectory: "fly_ball",
    locationType: "outfield",
    fieldDirection: "center"
    // No depth (home runs go over the fence)
  }
}
```

## Usage in Application

Plate appearances are:
1. **Created** when a plate appearance ends (via `startNewPlateAppearance` in `useGameState.ts`)
2. **Stored** in `gameState.plateAppearances[]` array
3. **Saved to data provider** automatically when created (if configured)
4. **Used for**:
   - Game summaries
   - Player statistics
   - AI recap generation
   - Game history
   - Play-by-play records

## Notes

- Each plate appearance is a complete record of one at-bat
- The `pitchSequence` tracks every pitch, not just the final count
- `runnersBattedIn` includes the batter if they score (e.g., home run = 1 RBI minimum)
- `hitDescription` is only populated for hits (single, double, triple, homerun)
- `defensivePlays` is only populated for outs, errors, or fielder's choice
- All player objects contain full player information, not just IDs


