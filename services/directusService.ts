
// FIX: Import `staticToken` from the Directus SDK to handle static token authentication.
import { createDirectus, rest, createItem, updateItem, staticToken } from '@directus/sdk';
import type { GameState, PlateAppearance } from '../types';

// Helper function to get environment variable (checks window.__ENV__ first, then process.env)
function getEnvVar(key: string): string | undefined {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key];
  }
  return process.env[key];
}

// Initialize the Directus client dynamically (can be called after window.__ENV__ is available)
let client: ReturnType<typeof createDirectus> | null = null;

// Track if we've already warned (to avoid spam)
let hasWarnedDirectus = false;

function initializeDirectusClient() {
  const directusUrl = getEnvVar('DIRECTUS_URL');
  const staticTokenValue = getEnvVar('DIRECTUS_STATIC_TOKEN');
  
  if (directusUrl && staticTokenValue) {
    if (!client) {
      client = createDirectus(directusUrl)
        .with(rest())
        .with(staticToken(staticTokenValue));
      // Client initialized (no logging in production)
    }
    return client;
  } else {
    // Only warn once, and only if window.__ENV__ is available (meaning injection happened)
    if (!client && !hasWarnedDirectus) {
      // Check if window.__ENV__ exists - if it does, we know injection happened and vars are truly missing
      if (typeof window !== 'undefined' && (window as any).__ENV__) {
        console.warn("Directus environment variables (DIRECTUS_URL, DIRECTUS_STATIC_TOKEN) are not set. Data will not be saved to Directus.");
        hasWarnedDirectus = true;
      }
      // If window.__ENV__ doesn't exist yet, don't warn - injection might happen later
    }
    return null;
  }
}

// Try to initialize on module load (but don't warn if window.__ENV__ isn't ready yet)
initializeDirectusClient();

/**
 * Maps the application's GameState to a format suitable for the 'Games' collection in Directus.
 * This assumes a Directus collection named 'Games' with corresponding fields.
 * @param gameState - The current state of the game.
 * @returns An object ready to be sent to Directus.
 */
const mapGameStateToDirectus = (gameState: GameState) => ({
    status: gameState.gameStatus,
    competition: gameState.competition,
    location: gameState.location,
    scorekeeper_name: gameState.scorekeeperName,
    game_start_time: gameState.gameStartTime ? new Date(gameState.gameStartTime).toISOString() : null,
    home_team_name: gameState.homeTeam.name,
    away_team_name: gameState.awayTeam.name,
    home_team_roster_json: gameState.homeRosterString,
    away_team_roster_json: gameState.awayRosterString,
    home_team_score: gameState.homeTeam.score,
    away_team_score: gameState.awayTeam.score,
    game_id: gameState.gameId,
});

/**
 * Creates a new game record in the Directus 'Games' collection.
 * @param gameState - The initial state of the game to be created.
 * @returns The ID of the newly created game item in Directus.
 */
export const createGame = async (gameState: GameState): Promise<number> => {
    // Initialize client if not already initialized (in case window.__ENV__ wasn't available at module load)
    const directusClient = initializeDirectusClient();
    if (!directusClient) throw new Error("Directus URL not configured.");
    const gameData = mapGameStateToDirectus(gameState);
    const result = await directusClient.request(createItem('Games', gameData));
    return result.id;
};

/**
 * Updates the scores for a specific game in Directus.
 * @param gameId - The ID of the game to update.
 * @param homeScore - The new score for the home team.
 * @param awayScore - The new score for the away team.
 */
export const updateGameScores = async (gameId: number, homeScore: number, awayScore: number): Promise<void> => {
    // Initialize client if not already initialized
    const directusClient = initializeDirectusClient();
    if (!directusClient) return;
    await directusClient.request(updateItem('Games', gameId, {
        home_team_score: homeScore,
        away_team_score: awayScore,
    }));
};

/**
 * Updates the status and end time of a game, typically used when a game is finalized.
 * @param gameId - The ID of the game to update.
 * @param status - The new status of the game (e.g., 'final').
 * @param endTime - The timestamp of when the game ended.
 */
export const updateGameStatus = async (gameId: number, status: 'playing' | 'final', endTime?: number): Promise<void> => {
    // Initialize client if not already initialized
    const directusClient = initializeDirectusClient();
    if (!directusClient) return;
    await directusClient.request(updateItem('Games', gameId, {
        status,
        game_end_time: endTime ? new Date(endTime).toISOString() : null,
    }));
};

/**
 * Creates a new plate appearance record in the 'plate_appearances' collection.
 * @param pa - The PlateAppearance object to record.
 * @param gameId - The ID of the game this plate appearance belongs to.
 * @param inning - The inning number.
 * @param isTopInning - Whether it's the top of the inning.
 */
export const createPlateAppearance = async (pa: PlateAppearance, gameId: number, inning: number, isTopInning: boolean): Promise<void> => {
    // Initialize client if not already initialized
    const directusClient = initializeDirectusClient();
    if (!directusClient) return;

    // Create a simplified JSON representation of defensive plays for storage.
    const defensivePlaysJson = pa.defensivePlays ? JSON.stringify({
        putoutBy: pa.defensivePlays.putoutBy ? `${pa.defensivePlays.putoutBy.name} (#${pa.defensivePlays.putoutBy.number})` : undefined,
        assistBy: pa.defensivePlays.assistBy?.map(p => `${p.name} (#${p.number})`),
        errorBy: pa.defensivePlays.errorBy ? `${pa.defensivePlays.errorBy.name} (#${pa.defensivePlays.errorBy.number})` : undefined,
        errorType: pa.defensivePlays.errorType,
    }) : null;

    const paData = {
        game: gameId,
        inning: inning,
        is_top_inning: isTopInning,
        result: pa.result,
        rbis: pa.runnersBattedIn,
        pitch_sequence: pa.pitchSequence,
        batter_name: `${pa.batter.name} (#${pa.batter.number})`,
        pitcher_name: `${pa.pitcher.name} (#${pa.pitcher.number})`,
        defensive_plays_json: defensivePlaysJson,
        hit_description_json: pa.hitDescription ? JSON.stringify(pa.hitDescription) : null,
    };
    
    await directusClient.request(createItem('plate_appearances', paData));
};
