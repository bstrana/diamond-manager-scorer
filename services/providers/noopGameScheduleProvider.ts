import type { GameScheduleProvider, ScheduledGameSummary } from '../gameScheduleProvider';
import type { FetchedGameScheduleData } from '../gameScheduleProvider';

const notConfigured = (): Error =>
  new Error('Game schedule integration is disabled. Set SCHEDULE_PROVIDER to directus or pocketbase and provider credentials to enable.');

export const noopGameScheduleProvider: GameScheduleProvider = {
  provider: 'none',
  isConfigured: () => false,
  fetchUserScheduledGames: async (): Promise<ScheduledGameSummary[]> => {
    throw notConfigured();
  },
  fetchGameScheduleData: async (_gameId: number | string): Promise<FetchedGameScheduleData> => {
    throw notConfigured();
  },
  updateGameScheduleStatus: async (_gameId: number | string, _status: 'in_progress' | 'finished'): Promise<void> => {
    throw notConfigured();
  },
};
