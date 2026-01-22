import type { GameScheduleProvider, ScheduledGameSummary } from '../gameScheduleProvider';
import type { FetchedGameScheduleData } from '../gameScheduleProvider';

const notConfigured = (): Error =>
  new Error('Game schedule provider is not configured. Set SCHEDULE_PROVIDER and provider credentials.');

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
