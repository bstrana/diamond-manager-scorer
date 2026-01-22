import { getEnvVar } from '../utils/env';
import { directusGameScheduleProvider } from './providers/directusGameScheduleProvider';
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
  provider: 'none' | 'directus' | 'pocketbase';
  isConfigured: () => boolean;
  fetchUserScheduledGames: () => Promise<ScheduledGameSummary[]>;
  fetchGameScheduleData: (gameId: number | string) => Promise<FetchedGameScheduleData>;
  updateGameScheduleStatus: (gameId: number | string, status: 'in_progress' | 'finished') => Promise<void>;
}

const resolveProvider = (): GameScheduleProvider => {
  const configuredProvider = getEnvVar('SCHEDULE_PROVIDER')?.toLowerCase();
  if (configuredProvider === 'directus') return directusGameScheduleProvider;
  if (configuredProvider === 'pocketbase') return pocketbaseGameScheduleProvider;
  if (configuredProvider === 'none') return noopGameScheduleProvider;

  if (getEnvVar('POCKETBASE_URL')) return pocketbaseGameScheduleProvider;
  if (getEnvVar('DIRECTUS_URL')) return directusGameScheduleProvider;

  return noopGameScheduleProvider;
};

export const getGameScheduleProvider = (): GameScheduleProvider => resolveProvider();

