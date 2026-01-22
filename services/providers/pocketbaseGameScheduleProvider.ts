import type { GameScheduleProvider, ScheduledGameSummary, FetchedGameScheduleData } from '../gameScheduleProvider';
import { getEnvVar } from '../../utils/env';

const notImplemented = (action: string): Error =>
  new Error(`[PocketBase] ${action} not implemented yet. Configure PocketBase and implement schedule access.`);

export const pocketbaseGameScheduleProvider: GameScheduleProvider = {
  provider: 'pocketbase',
  isConfigured: () => !!getEnvVar('POCKETBASE_URL'),
  fetchUserScheduledGames: async (): Promise<ScheduledGameSummary[]> => {
    throw notImplemented('fetchUserScheduledGames');
  },
  fetchGameScheduleData: async (_gameId: number | string): Promise<FetchedGameScheduleData> => {
    throw notImplemented('fetchGameScheduleData');
  },
  updateGameScheduleStatus: async (_gameId: number | string, _status: 'in_progress' | 'finished'): Promise<void> => {
    throw notImplemented('updateGameScheduleStatus');
  },
};
