import PocketBase from 'pocketbase';
import type { GameState, PlateAppearance } from '../../types';
import type { GameDataStore, GameId } from '../gameDataStore';
import { getEnvVar } from '../../utils/env';

let _pb: PocketBase | null = null;

const getPbClient = (): PocketBase => {
  const url = getEnvVar('POCKETBASE_URL') || '';
  if (!_pb || _pb.baseURL !== url) {
    _pb = new PocketBase(url);
  }
  return _pb;
};

export const pocketbaseGameDataStore: GameDataStore = {
  provider: 'pocketbase',
  isConfigured: () => !!getEnvVar('POCKETBASE_URL'),

  createGame: async (gameState: GameState): Promise<GameId | null> => {
    try {
      const pb = getPbClient();
      const record = await pb.collection('games').create({
        status:                 gameState.gameStatus,
        competition:            gameState.competition ?? '',
        location:               gameState.location ?? '',
        game_date:              gameState.gameDate ? String(gameState.gameDate) : '',
        game_start_time:        gameState.gameStartTime ? String(gameState.gameStartTime) : '',
        home_team:              gameState.homeTeam.name,
        away_team:              gameState.awayTeam.name,
        home_score:             gameState.homeTeam.score,
        away_score:             gameState.awayTeam.score,
        home_team_roster_text:  gameState.homeRosterString ?? '',
        away_team_roster_text:  gameState.awayRosterString ?? '',
        game_state_json:        gameState,
      });
      return record.id as GameId;
    } catch (err) {
      console.error('[PocketBase] createGame failed:', err);
      return null;
    }
  },

  updateGameScores: async (gameId: GameId, homeScore: number, awayScore: number): Promise<void> => {
    try {
      const pb = getPbClient();
      await pb.collection('games').update(String(gameId), {
        home_score: homeScore,
        away_score: awayScore,
      });
    } catch (err) {
      console.error('[PocketBase] updateGameScores failed:', err);
    }
  },

  updateGameStatus: async (
    gameId: GameId,
    status: 'playing' | 'final',
    endTime?: number
  ): Promise<void> => {
    try {
      const pb = getPbClient();
      await pb.collection('games').update(String(gameId), {
        status,
        ...(endTime ? { game_end_time: String(endTime) } : {}),
      });
    } catch (err) {
      console.error('[PocketBase] updateGameStatus failed:', err);
    }
  },

  createPlateAppearance: async (
    pa: PlateAppearance,
    gameId: GameId,
    inning: number,
    isTopInning: boolean
  ): Promise<void> => {
    try {
      const pb = getPbClient();
      await pb.collection('plate_appearances').create({
        game:                  String(gameId),
        inning,
        is_top_inning:         isTopInning,
        result:                pa.result,
        rbis:                  pa.runnersBattedIn,
        pitch_sequence:        pa.pitchSequence,
        batter_name:           `${pa.batter.name} (#${pa.batter.number})`,
        pitcher_name:          `${pa.pitcher.name} (#${pa.pitcher.number})`,
        defensive_plays_json:  pa.defensivePlays ?? null,
        hit_description_json:  pa.hitDescription ?? null,
      });
    } catch (err) {
      console.error('[PocketBase] createPlateAppearance failed:', err);
    }
  },
};
