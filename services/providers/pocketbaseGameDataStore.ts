import type { GameState, PlateAppearance } from '../../types';
import type { GameDataStore, GameId } from '../gameDataStore';
import { getEnvVar } from '../../utils/env';

const warnNotImplemented = (action: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[PocketBase] ${action} not implemented yet. Set up PocketBase integration.`);
  }
};

export const pocketbaseGameDataStore: GameDataStore = {
  provider: 'pocketbase',
  isConfigured: () => !!getEnvVar('POCKETBASE_URL'),
  createGame: async (_gameState: GameState): Promise<GameId | null> => {
    warnNotImplemented('createGame');
    return null;
  },
  updateGameScores: async (_gameId: GameId, _homeScore: number, _awayScore: number): Promise<void> => {
    warnNotImplemented('updateGameScores');
  },
  updateGameStatus: async (_gameId: GameId, _status: 'playing' | 'final', _endTime?: number): Promise<void> => {
    warnNotImplemented('updateGameStatus');
  },
  createPlateAppearance: async (
    _pa: PlateAppearance,
    _gameId: GameId,
    _inning: number,
    _isTopInning: boolean
  ): Promise<void> => {
    warnNotImplemented('createPlateAppearance');
  },
};
