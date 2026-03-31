import { getEnvVar } from '../utils/env';
import { noopGameScheduleProvider } from './providers/noopGameScheduleProvider';
import { pocketbaseGameScheduleProvider } from './providers/pocketbaseGameScheduleProvider';

export type ScheduledGameSummary = { id: number | string; title: string };

export interface FetchedGameScheduleData {
  homeTeam: {
    name: string;
    roster: string;
    logoUrl?: string;
    color: string;
  };
  awayTeam: {
    name: string;
    roster: string;
    logoUrl?: string;
    color: string;
  };
  competition: string;
  location: string;
  gameDate?: string | Date;
}

export interface GameScheduleProvider {
  provider: 'none' | 'pocketbase';
  isConfigured: () => boolean;
  fetchUserScheduledGames: (context?: { orgId?: string; scheduleId?: string }) => Promise<ScheduledGameSummary[]>;
  fetchGameScheduleData: (gameId: number | string, context?: { orgId?: string; scheduleId?: string }) => Promise<FetchedGameScheduleData>;
  updateGameScheduleStatus: (gameId: number | string, status: 'in_progress' | 'finished') => Promise<void>;
}

const resolveProvider = (): GameScheduleProvider => {
  const configuredProvider = getEnvVar('SCHEDULE_PROVIDER')?.toLowerCase();
  if (configuredProvider === 'pocketbase') return pocketbaseGameScheduleProvider;
  if (configuredProvider === 'none') return noopGameScheduleProvider;

  // Auto-activate when either the dedicated scheduler URL or the shared PocketBase URL is set
  if (getEnvVar('SCHEDULER_URL') || getEnvVar('POCKETBASE_URL')) return pocketbaseGameScheduleProvider;

  return noopGameScheduleProvider;
};

export const getGameScheduleProvider = (): GameScheduleProvider => resolveProvider();

