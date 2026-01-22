import { fetchGameScheduleData, fetchUserScheduledGames, updateGameScheduleStatus } from '../directusGameScheduleService';
import type { GameScheduleProvider } from '../gameScheduleProvider';
import { getEnvVar } from '../../utils/env';

export const directusGameScheduleProvider: GameScheduleProvider = {
  provider: 'directus',
  isConfigured: () => !!(getEnvVar('DIRECTUS_URL') && getEnvVar('DIRECTUS_SCOREKEEPER_TOKEN')),
  fetchUserScheduledGames,
  fetchGameScheduleData,
  updateGameScheduleStatus,
};
