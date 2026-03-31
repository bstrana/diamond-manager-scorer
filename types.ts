
export interface ScoreboardSettings {
  showHits: boolean;
  showErrors: boolean;
  showLOB: boolean;
  showCurrentPitcher: boolean;
  showCurrentBatter: boolean;
  showOnDeck: boolean;
  lowerThirdsBackgroundColor?: string;
  lowerThirdsTextColor?: string;
  lockOverlayPositions?: boolean; // Lock positions in field players and batting order overlays
  nameTagAccentColor?: string; // Accent color for name tags in field players and batting order overlays
}

export interface PlayerStats {
  PA: number; // Plate Appearances
  AB: number; // At Bats
  H: number;  // Hits
  BB: number;  // Base on Balls (Walks) + HBP
  SO: number; // Strikeouts
  RBI: number; // Runs Batted In
  HR: number; // Home Runs
  SF: number; // Sacrifice Flies
  SH: number; // Sacrifice Hits (Bunts)
  runsScored: number;
  SB: number; // Stolen Bases
  CS: number; // Caught Stealing
  singles: number;
  doubles: number;
  triples: number;
  pitchCount: number; // Pitches thrown
  strikesThrown: number;
  ballsThrown: number;
  AVG: number; // Batting Average
  OBP: number; // On-base Percentage
  SLG: number; // Slugging Percentage
  // Defensive Stats
  A: number; // Assists
  PO: number; // Putouts
  E: number; // Errors
  // Pitching Stats
  IP: number; // Innings Pitched (baseball notation: 1.2 = 1 inning + 2 outs)
  IPOuts: number; // Outs recorded as integer (source of truth; IP derived from this)
  R: number; // Runs Allowed
  ER: number; // Earned Runs
  ERA: number; // Earned Run Average
  H_allowed: number; // Hits Allowed
  BB_allowed: number; // Walks Allowed
  SO_pitched: number; // Strikeouts Pitched
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  battingOrder: number;
  stats: PlayerStats;
  photoUrl?: string;
}

export interface Team {
  name:string;
  logoUrl?: string;
  score: number;
  hits: number;
  errors: number;
  roster: Player[]; // Full roster including bench players
  LOB: number; // Left On Base
  color: string;
  runsByInning?: number[]; // Array of runs scored per inning (index 0 = inning 1, etc.)
}

export interface TeamSetup {
  name: string;
  roster: string;
  logoUrl?: string;
  color: string;
}

export interface Bases {
  first: Player | null;
  second: Player | null;
  third: Player | null;
}

export type PitchType = 'ball' | 'strike' | 'foul';
export type HitType = 'single' | 'double' | 'triple' | 'homerun';
export type OutType = 'strikeout' | 'flyout' | 'groundout';
export type PlateAppearanceResult = HitType | 'walk' | 'HBP' | 'IBB' | 'strikeout' | 'flyout' | 'groundout' | 'sac_fly' | 'sac_bunt' | 'fielders_choice' | 'reached_on_error';

export type HitTrajectory = 'line_drive' | 'grounder' | 'fly_ball' | 'popup' | 'bunt';
export type FieldDirection = 'left' | 'left_center' | 'center' | 'right_center' | 'right';
export type PositionGap = 'ss_3b' | '1b_2b' | '2b_ss' | '3b_ss' | 'pitcher_mound' | 'up_middle';
export type HitDepth = 'shallow' | 'medium' | 'deep' | 'warning_track' | 'wall';
export type InfieldPosition = 'pitcher' | 'catcher' | 'first' | 'second' | 'shortstop' | 'third';
export type SpecialLocation = 'left_line' | 'right_line' | 'third_base_line' | 'first_base_line' | 'up_middle' | 'through_box';

export interface HitDescription {
  trajectory: HitTrajectory;
  locationType: 'outfield' | 'infield_position' | 'position_gap' | 'special';
  fieldDirection?: FieldDirection;
  positionGap?: PositionGap;
  infieldPosition?: InfieldPosition;
  depth?: HitDepth;
  specialLocation?: 'left_line' | 'right_line' | 'third_base_line' | 'first_base_line' | 'up_middle' | 'through_box';
}

export interface DefensivePlays {
  putoutById?: string;
  assistByIds?: string[];
  errorById?: string;
  errorType?: 'fielding' | 'throwing';
}

export interface PlateAppearance {
  battingTeam: string;
  batter: Player;
  pitcher: Player;
  pitchSequence: string;
  result: PlateAppearanceResult;
  runnersBattedIn: number;
  inning?: number;
  isTopInning?: boolean;
  hitDescription?: HitDescription; // Only present when result is a hit
  defensivePlays?: {
    putoutBy?: Player;
    assistBy?: Player[];
    errorBy?: Player;
    errorType?: 'fielding' | 'throwing';
  };
}

export interface GameState {
  gameStatus: 'setup' | 'playing' | 'final';
  competition?: string;
  location?: string;
  gameDate?: string | Date; // Date/time of the game from schedule provider
  scorekeeperName?: string;
  homeTeam: Team;
  awayTeam: Team;
  inning: number;
  isTopInning: boolean;
  outs: number;
  strikes: number;
  balls: number;
  bases: Bases;
  currentBatterIndex: { home: number; away: number };
  currentPitcher: { home: Player; away: Player };
  pitchSequence: string;
  plateAppearances: PlateAppearance[];
  gameStartTime?: number;
  gameEndTime?: number;
  homeRosterString: string;
  awayRosterString: string;
  gameId: number | string | null;
  scoreboardSettings: ScoreboardSettings;
}
