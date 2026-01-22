import type { GameState, PlateAppearance } from '../../types';
import type { GameDataStore, GameId } from '../gameDataStore';
import { createGame, createPlateAppearance, updateGameScores, updateGameStatus } from '../directusService';
import { getEnvVar } from '../../utils/env';

const toDirectusId = (gameId: GameId): number | null => {
  if (typeof gameId === 'number') {
    return Number.isFinite(gameId) ? gameId : null;
  }
  const parsed = Number(gameId);
  return Number.isFinite(parsed) ? parsed : null;
};

export const directusGameDataStore: GameDataStore = {
  provider: 'directus',
  isConfigured: () => !!(getEnvVar('DIRECTUS_URL') && getEnvVar('DIRECTUS_STATIC_TOKEN')),
  createGame: async (gameState: GameState): Promise<GameId | null> => {
    const gameId = await createGame(gameState);
    return gameId ?? null;
  },
  updateGameScores: async (gameId: GameId, homeScore: number, awayScore: number): Promise<void> => {
    const directusId = toDirectusId(gameId);
    if (directusId === null) return;
    await updateGameScores(directusId, homeScore, awayScore);
  },
  updateGameStatus: async (gameId: GameId, status: 'playing' | 'final', endTime?: number): Promise<void> => {
    const directusId = toDirectusId(gameId);
    if (directusId === null) return;
    await updateGameStatus(directusId, status, endTime);
  },
  createPlateAppearance: async (
    pa: PlateAppearance,
    gameId: GameId,
    inning: number,
    isTopInning: boolean
  ): Promise<void> => {
    const directusId = toDirectusId(gameId);
    if (directusId === null) return;
    await createPlateAppearance(pa, directusId, inning, isTopInning);
  },
};
