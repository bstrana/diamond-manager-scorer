import type { GameState, PlateAppearance } from '../types';
import { getEnvVar } from '../utils/env';
import { noopGameDataStore } from './providers/noopGameDataStore';
import { pocketbaseGameDataStore } from './providers/pocketbaseGameDataStore';

export type GameId = number | string;

export interface GameDataStore {
  provider: 'none' | 'pocketbase';
  isConfigured: () => boolean;
  createGame: (gameState: GameState) => Promise<GameId | null>;
  updateGameScores: (gameId: GameId, homeScore: number, awayScore: number) => Promise<void>;
  updateGameStatus: (gameId: GameId, status: 'playing' | 'final', endTime?: number) => Promise<void>;
  createPlateAppearance: (pa: PlateAppearance, gameId: GameId, inning: number, isTopInning: boolean) => Promise<void>;
}

const resolveProvider = (): GameDataStore => {
  const configuredProvider = getEnvVar('DATA_PROVIDER')?.toLowerCase();
  if (configuredProvider === 'pocketbase') return pocketbaseGameDataStore;
  if (configuredProvider === 'none') return noopGameDataStore;

  if (getEnvVar('POCKETBASE_URL')) return pocketbaseGameDataStore;

  return noopGameDataStore;
};

export const getGameDataStore = (): GameDataStore => resolveProvider();
