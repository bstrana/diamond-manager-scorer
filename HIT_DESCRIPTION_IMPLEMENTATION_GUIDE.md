# Hit Description Implementation Guide

## Overview

This guide explains how to implement detailed hit descriptions like "center field line drive" or "grounder between SS and 3B" in the Diamond Manager Scorer app.

## Current State

Currently, hits are recorded with only the base type:
- `single`, `double`, `triple`, `homerun`
- No trajectory information (line drive, grounder, fly ball, popup)
- No location information (where the ball went)

## Required Changes

### 1. Data Structure Extensions

#### A. Extend `HitType` or Create New Interface

**Option 1: Extend existing `HitType`**
- Keep current simple types for backward compatibility
- Add optional description fields

**Option 2: Create `HitDescription` interface** (Recommended)
```typescript
interface HitDescription {
  trajectory: 'line_drive' | 'grounder' | 'fly_ball' | 'popup' | 'bunt';
  location: HitLocation;
  fieldDirection?: 'left' | 'center' | 'right' | 'left_center' | 'right_center';
  positionGap?: 'ss_3b' | '1b_2b' | '2b_ss' | '3b_ss' | 'pitcher_mound';
  depth?: 'shallow' | 'medium' | 'deep' | 'warning_track' | 'wall';
}
```

#### B. Extend `PlateAppearance` Interface

Add to `types.ts`:
```typescript
export interface PlateAppearance {
  // ... existing fields ...
  hitDescription?: HitDescription; // Only present when result is a hit
}
```

### 2. UI Components

#### A. Hit Description Modal

Create a new modal component (similar to `DefensivePlayModal`) that appears when a hit button is clicked:

**Modal Structure:**
1. **Trajectory Selection** (Required)
   - Radio buttons or dropdown:
     - Line Drive
     - Grounder
     - Fly Ball
     - Popup
     - Bunt

2. **Location Selection** (Required)
   - Visual field diagram OR dropdown menu
   - Options:
     - **Outfield**: Left Field, Left-Center, Center Field, Right-Center, Right Field
     - **Infield**: Between positions (SS-3B, 1B-2B, 2B-SS, etc.)
     - **Specific positions**: To SS, To 3B, To 2B, To 1B, To P, etc.
     - **Special**: Down the line, Up the middle, etc.

3. **Depth Selection** (Optional, for outfield hits)
   - Shallow
   - Medium
   - Deep
   - Warning Track
   - Wall/Home Run

4. **Visual Field Diagram** (Optional Enhancement)
   - Clickable baseball field diagram
   - User clicks where the ball went
   - Automatically determines location description

#### B. Update Control Panel

Modify the hit buttons in `ControlPanel.tsx`:

**Current:**
```typescript
<ControlButton onClick={() => onHit('single')}>1B</ControlButton>
```

**New Approach:**
```typescript
<ControlButton onClick={() => openHitDescriptionModal('single')}>1B</ControlButton>
```

The modal collects:
- Hit type (single/double/triple/homerun) - already known from button
- Trajectory
- Location
- Optional depth

### 3. State Management

#### A. Update `handleHit` Function

In `hooks/useGameState.ts`, modify `handleHit`:

**Current signature:**
```typescript
handleHit: (type: HitType) => void
```

**New signature:**
```typescript
handleHit: (type: HitType, description?: HitDescription) => void
```

**Flow:**
1. User clicks hit button (1B, 2B, 3B, HR)
2. Modal opens with hit type pre-selected
3. User selects trajectory and location
4. Modal calls `handleHit(type, description)`
5. Description is stored in `PlateAppearance`

#### B. Store in PlateAppearance

When creating plate appearance:
```typescript
const newPA: PlateAppearance = {
  // ... existing fields ...
  hitDescription: description, // Store the description
  result: type, // single, double, triple, homerun
}
```

### 4. Description Generation Logic

#### A. Text Description Builder

Create a function to generate human-readable descriptions:

```typescript
function generateHitDescription(desc: HitDescription): string {
  const parts: string[] = [];
  
  // Trajectory
  if (desc.trajectory === 'line_drive') parts.push('line drive');
  else if (desc.trajectory === 'grounder') parts.push('grounder');
  else if (desc.trajectory === 'fly_ball') parts.push('fly ball');
  // etc.
  
  // Location
  if (desc.positionGap === 'ss_3b') parts.push('between SS and 3B');
  else if (desc.fieldDirection === 'center') parts.push('to center field');
  // etc.
  
  return parts.join(' ');
}
```

**Examples:**
- `{trajectory: 'line_drive', fieldDirection: 'center'}` → "center field line drive"
- `{trajectory: 'grounder', positionGap: 'ss_3b'}` → "grounder between SS and 3B"
- `{trajectory: 'fly_ball', fieldDirection: 'right', depth: 'deep'}` → "deep fly ball to right field"

### 5. Display Integration

#### A. Game Summary

Update `generateGameSummary` in `services/gameSummaryService.ts`:

```typescript
// When listing hits, include description:
if (pa.hitDescription) {
  summary += `- ${pa.batter.name}: ${generateHitDescription(pa.hitDescription)}\n`;
} else {
  summary += `- ${pa.batter.name}: ${pa.result}\n`;
}
```

#### B. AI Recap

Update `formatGameDataForAI` in `services/openRouterService.ts`:

Include hit descriptions in the game data sent to AI:
```typescript
keyPlays: keyPlays.map(pa => ({
  // ... existing fields ...
  hitDescription: pa.hitDescription ? generateHitDescription(pa.hitDescription) : null,
}))
```

This allows AI to write more detailed recaps like:
> "Smith hit a line drive to center field in the 3rd inning..."

#### C. Scoreboard Display (Optional)

Could show hit descriptions in real-time on the scoreboard or in a play-by-play log.

### 6. Data Storage

#### A. External Data Store (Optional)

If you persist plate appearances in an external data store, add a field such as:
- `hit_description_json`: JSON field storing the HitDescription object

Example payload:
```typescript
const paData = {
  // ... existing fields ...
  hit_description_json: pa.hitDescription ? JSON.stringify(pa.hitDescription) : null,
};
```

#### B. Local Storage

The `PlateAppearance` objects in `gameState.plateAppearances` already include all fields, so descriptions will be automatically saved to localStorage.

### 7. User Experience Flow

1. **User clicks hit button** (e.g., "1B")
2. **Modal opens** with:
   - Hit type pre-selected (Single)
   - Trajectory selection (required)
   - Location selection (required)
   - Depth selection (optional, for outfield)
3. **User makes selections**
4. **User clicks "Confirm"**
5. **Modal closes**, hit is recorded with description
6. **Description is stored** in plate appearance
7. **Description appears** in game summary and AI recaps

### 8. Optional Enhancements

#### A. Quick Select Presets

Common combinations as quick buttons:
- "Line Drive to Center"
- "Grounder Through Middle"
- "Fly Ball to Right"
- "Popup to Infield"

#### B. Visual Field Diagram

Interactive baseball field where user clicks:
- Click on field → automatically determines location
- More intuitive than dropdowns

#### C. Smart Defaults

Based on hit type, suggest common trajectories:
- Single → Usually line drive or grounder
- Double → Usually line drive or fly ball
- Triple → Usually line drive or fly ball to gap
- Home Run → Always fly ball

#### D. Voice/Text Input

Allow free-form text entry:
- User types: "line drive to center"
- System parses and creates HitDescription object

### 9. Backward Compatibility

**Important**: Existing games without descriptions should still work:

```typescript
// When displaying, check if description exists
const description = pa.hitDescription 
  ? generateHitDescription(pa.hitDescription)
  : pa.result; // Fallback to simple type
```

### 10. Implementation Steps (Summary)

1. **Define data structures** (`HitDescription` interface in `types.ts`)
2. **Extend `PlateAppearance`** to include `hitDescription?`
3. **Create `HitDescriptionModal` component**
4. **Update `ControlPanel`** to open modal instead of directly calling `onHit`
5. **Update `handleHit`** to accept optional description
6. **Create description generator** function
7. **Update game summary** to include descriptions
8. **Update AI recap** to include descriptions
9. **Update data store schema** (add `hit_description_json` field)
10. **Update persistence layer** to save descriptions

### 11. Example Data Flow

```
User Action: Click "1B" button
    ↓
Open HitDescriptionModal with type='single'
    ↓
User selects: trajectory='line_drive', location='center'
    ↓
Modal calls: onHit('single', {trajectory: 'line_drive', fieldDirection: 'center'})
    ↓
handleHit creates PlateAppearance with hitDescription
    ↓
Description stored in gameState.plateAppearances
    ↓
When generating summary: "Smith: center field line drive"
    ↓
When generating AI recap: "Smith hit a line drive to center field..."
```

### 12. UI/UX Considerations

- **Speed**: Modal should be quick to use (common options prominent)
- **Optional**: Make description optional (skip button for quick entry)
- **Defaults**: Pre-select most common options
- **Mobile-friendly**: Large touch targets, clear labels
- **Accessibility**: Keyboard navigation, screen reader support

### 13. Field Location Options

**Outfield:**
- Left Field
- Left-Center Gap
- Center Field
- Right-Center Gap
- Right Field

**Infield Positions:**
- To Pitcher
- To Catcher
- To 1st Base
- To 2nd Base
- To Shortstop
- To 3rd Base

**Between Positions:**
- Between SS and 3B
- Between 1B and 2B
- Between 2B and SS
- Between 3B and SS

**Special:**
- Down the left field line
- Down the right field line
- Up the middle
- Through the box (pitcher's mound)

### 14. Trajectory Types

- **Line Drive**: Hard hit, low trajectory
- **Grounder**: Bounces on ground
- **Fly Ball**: High arc, outfield
- **Popup**: High arc, infield
- **Bunt**: Intentional bunt

### 15. Integration Points

**Where descriptions would appear:**
1. Game Summary modal (text format)
2. AI-generated recaps (narrative format)
3. Play-by-play log (if implemented)
4. Export to external data store (JSON format)
5. Future: Live commentary, social media posts

---

## Summary

This feature requires:
- **Data layer**: New `HitDescription` interface, extend `PlateAppearance`
- **UI layer**: New modal component for description input
- **Logic layer**: Description generator, integration with hit recording
- **Display layer**: Update summary and AI recap generation
- **Storage layer**: Add field to data store, update save functions

The implementation follows the existing pattern of modals (like `DefensivePlayModal`) and integrates seamlessly with the current hit recording flow.


