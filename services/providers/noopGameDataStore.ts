import type { GameState, PlateAppearance } from '../../types';
import type { GameDataStore, GameId } from '../gameDataStore';

export const noopGameDataStore: GameDataStore = {
  provider: 'none',
  isConfigured: () => false,
  createGame: async (_gameState: GameState): Promise<GameId | null> => null,
  updateGameScores: async (_gameId: GameId, _homeScore: number, _awayScore: number): Promise<void> => {},
  updateGameStatus: async (_gameId: GameId, _status: 'playing' | 'final', _endTime?: number): Promise<void> => {},
  createPlateAppearance: async (
    _pa: PlateAppearance,
    _gameId: GameId,
    _inning: number,
    _isTopInning: boolean
  ): Promise<void> => {},
};
