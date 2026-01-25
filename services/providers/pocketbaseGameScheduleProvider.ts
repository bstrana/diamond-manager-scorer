import type { GameScheduleProvider, ScheduledGameSummary, FetchedGameScheduleData } from '../gameScheduleProvider';
import { getEnvVar } from '../../utils/env';

type PocketBaseListResponse<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

type PocketBaseRecord = {
  id: string;
  expand?: Record<string, any>;
  [key: string]: any;
};

type ScheduledGameRecord = PocketBaseRecord & {
  title?: string;
  date?: string;
  competition?: string;
  location?: string;
  status?: string;
  home_team?: string;
  away_team?: string;
  home_roster?: string;
  away_roster?: string;
};

type SchedulerPayload = {
  leagues?: Array<{ id: string; name: string }>;
  teams?: Array<{ id: string; name: string; city?: string; primaryColor?: string; logoUrl?: string }>;
  games?: Array<{
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    date: string;
    time: string;
    location: string;
    leagueId?: string;
    leagueIds?: string[];
  }>;
};

type TeamRecord = PocketBaseRecord & {
  name?: string;
  logo_url?: string;
  color?: string;
};

type PlayerRecord = PocketBaseRecord & {
  first_name?: string;
  last_name?: string;
  number?: number;
  position?: string;
  photo_url?: string;
};

type RosterRecord = PocketBaseRecord & {
  players?: string[];
};

const PLAYER_PHOTO_PLACEHOLDER = 'https://bstrana.sirv.com/ybc/player.png';

const getBaseUrl = (): string => {
  const raw = getEnvVar('POCKETBASE_URL') || '';
  if (!raw) {
    throw new Error('PocketBase schedule is not configured. Set POCKETBASE_URL and SCHEDULE_PROVIDER=pocketbase.');
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, '');
};

const buildUrl = (path: string, params?: Record<string, string>): string => {
  const base = getBaseUrl();
  if (!params || Object.keys(params).length === 0) {
    return `${base}${path}`;
  }
  const search = new URLSearchParams(params).toString();
  return `${base}${path}?${search}`;
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`[PocketBase] Request failed (${response.status}). ${detail || 'No response body.'}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
};

const getExpanded = <T>(record: PocketBaseRecord | undefined, key: string): T | undefined => {
  if (!record?.expand) return undefined;
  return record.expand[key] as T | undefined;
};

const scheduleSourceCollection = (getEnvVar('POCKETBASE_SCHEDULE_SOURCE_COLLECTION') || '').trim();
const scheduleSourceOrgId = getEnvVar('POCKETBASE_SCHEDULE_ORG_ID');
const scheduleSourceUserId = getEnvVar('POCKETBASE_SCHEDULE_USER_ID');
const scheduleSourceAppId = getEnvVar('POCKETBASE_SCHEDULE_APP_ID');

const shouldUseScheduleSource = () => scheduleSourceCollection.length > 0;

const buildScheduleSourceFilter = (): string => {
  const filters: string[] = ['active=true'];
  if (scheduleSourceOrgId) {
    filters.push(`org_id="${scheduleSourceOrgId}"`);
  }
  if (scheduleSourceUserId) {
    filters.push(`user_id="${scheduleSourceUserId}"`);
  }
  if (scheduleSourceAppId) {
    filters.push(`app_id="${scheduleSourceAppId}"`);
  }
  return filters.join(' && ');
};

let cachedSchedulePayload: SchedulerPayload | null = null;
let cachedScheduleFetchedAt = 0;
const SCHEDULE_CACHE_MS = 30000;

const loadSchedulePayload = async (): Promise<SchedulerPayload> => {
  if (!scheduleSourceCollection) {
    throw new Error('[PocketBase] Missing POCKETBASE_SCHEDULE_SOURCE_COLLECTION.');
  }
  const now = Date.now();
  if (cachedSchedulePayload && now - cachedScheduleFetchedAt < SCHEDULE_CACHE_MS) {
    return cachedSchedulePayload;
  }

  const url = buildUrl(`/api/collections/${scheduleSourceCollection}/records`, {
    filter: buildScheduleSourceFilter(),
    perPage: '1',
    sort: '-updated',
  });

  const data = await requestJson<PocketBaseListResponse<PocketBaseRecord>>(url);
  const record = data.items?.[0];
  const payload = (record?.data || {}) as SchedulerPayload;
  cachedSchedulePayload = payload;
  cachedScheduleFetchedAt = now;
  return payload;
};

const formatTeamName = (team?: { name?: string; city?: string }) => {
  if (!team) return 'Unknown';
  return `${team.city || ''} ${team.name || ''}`.trim() || 'Unknown';
};

const buildRosterString = (players: PlayerRecord[], playerIds?: string[]): string => {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const orderedPlayers = Array.isArray(playerIds) && playerIds.length > 0
    ? playerIds.map((id) => playersById.get(id)).filter(Boolean) as PlayerRecord[]
    : players;

  if (!orderedPlayers.length) return '';

  return orderedPlayers.map((player, index) => {
    const battingOrder = index < 9 ? index + 1 : 0;
    const number = player.number ?? 0;
    const name = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player';
    const position = player.position || 'BENCH';
    const photoUrl = player.photo_url || PLAYER_PHOTO_PLACEHOLDER;
    return `${battingOrder}, ${number}, ${name}, ${position}, ${photoUrl}`;
  }).join('\n');
};

const fetchTeam = async (teamId: string, expanded?: TeamRecord): Promise<TeamRecord> => {
  if (expanded?.id) return expanded;
  return requestJson<TeamRecord>(buildUrl(`/api/collections/teams/records/${teamId}`));
};

const fetchRoster = async (rosterId: string, expanded?: RosterRecord): Promise<RosterRecord> => {
  if (expanded?.id && expanded.expand?.players) return expanded;
  return requestJson<RosterRecord>(buildUrl(`/api/collections/rosters/records/${rosterId}`, {
    expand: 'players',
  }));
};

export const pocketbaseGameScheduleProvider: GameScheduleProvider = {
  provider: 'pocketbase',
  isConfigured: () => !!getEnvVar('POCKETBASE_URL'),
  fetchUserScheduledGames: async (): Promise<ScheduledGameSummary[]> => {
    if (shouldUseScheduleSource()) {
      const payload = await loadSchedulePayload();
      const teams = payload.teams || [];
      const games = payload.games || [];
      const teamById = new Map(teams.map((team) => [team.id, team]));
      return games.map((game) => {
        const home = teamById.get(game.homeTeamId);
        const away = teamById.get(game.awayTeamId);
        return {
          id: game.id,
          title: `${formatTeamName(away)} @ ${formatTeamName(home)}`,
        };
      });
    }

    const filteredUrl = buildUrl('/api/collections/schedules/records', {
      filter: 'status="scheduled" || status="in_progress"',
      sort: 'date',
      perPage: '200',
    });

    try {
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(filteredUrl);
      return (data.items || []).map((game) => ({
        id: game.id,
        title: game.title || game.competition || `Game #${game.id}`,
      }));
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status !== 400) {
        throw error;
      }
      const fallbackUrl = buildUrl('/api/collections/schedules/records', {
        sort: 'date',
        perPage: '200',
      });
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(fallbackUrl);
      return (data.items || [])
        .filter((game) => game.status === 'scheduled' || game.status === 'in_progress')
        .map((game) => ({
          id: game.id,
          title: game.title || game.competition || `Game #${game.id}`,
        }));
    }
  },
  fetchGameScheduleData: async (gameId: number | string): Promise<FetchedGameScheduleData> => {
    if (shouldUseScheduleSource()) {
      const payload = await loadSchedulePayload();
      const teams = payload.teams || [];
      const leagues = payload.leagues || [];
      const games = payload.games || [];
      const teamById = new Map(teams.map((team) => [team.id, team]));
      const leagueById = new Map(leagues.map((league) => [league.id, league]));

      const game = games.find((item) => String(item.id) === String(gameId));
      if (!game) {
        throw new Error(`Schedule game ${gameId} was not found.`);
      }

      const homeTeam = teamById.get(game.homeTeamId);
      const awayTeam = teamById.get(game.awayTeamId);

      const leagueId = game.leagueIds?.[0] || game.leagueId;
      const competition = leagueId ? leagueById.get(leagueId)?.name || '' : '';

      return {
        homeTeam: {
          name: formatTeamName(homeTeam),
          roster: '',
          logoUrl: homeTeam?.logoUrl || '',
          color: homeTeam?.primaryColor || '#ffffff',
        },
        awayTeam: {
          name: formatTeamName(awayTeam),
          roster: '',
          logoUrl: awayTeam?.logoUrl || '',
          color: awayTeam?.primaryColor || '#ffffff',
        },
        competition,
        location: game.location || '',
        gameDate: `${game.date}T${game.time || '19:00'}:00`,
      };
    }

    const url = buildUrl(`/api/collections/schedules/records/${gameId}`, {
      expand: 'home_team,away_team,home_roster,away_roster,home_roster.players,away_roster.players',
    });

    const game = await requestJson<ScheduledGameRecord>(url);
    const homeTeamId = game.home_team || getExpanded<TeamRecord>(game, 'home_team')?.id;
    const awayTeamId = game.away_team || getExpanded<TeamRecord>(game, 'away_team')?.id;

    if (!homeTeamId || !awayTeamId) {
      throw new Error('Game schedule is missing required team IDs (home_team or away_team).');
    }

    const homeTeamRecord = await fetchTeam(homeTeamId, getExpanded<TeamRecord>(game, 'home_team'));
    const awayTeamRecord = await fetchTeam(awayTeamId, getExpanded<TeamRecord>(game, 'away_team'));

    const homeRosterId = game.home_roster || getExpanded<RosterRecord>(game, 'home_roster')?.id;
    const awayRosterId = game.away_roster || getExpanded<RosterRecord>(game, 'away_roster')?.id;

    let homeRosterString = '';
    let awayRosterString = '';

    if (homeRosterId) {
      const roster = await fetchRoster(homeRosterId, getExpanded<RosterRecord>(game, 'home_roster'));
      const rosterPlayers = (getExpanded<PlayerRecord[]>(roster, 'players') || []) as PlayerRecord[];
      homeRosterString = buildRosterString(rosterPlayers, roster.players);
    }

    if (awayRosterId) {
      const roster = await fetchRoster(awayRosterId, getExpanded<RosterRecord>(game, 'away_roster'));
      const rosterPlayers = (getExpanded<PlayerRecord[]>(roster, 'players') || []) as PlayerRecord[];
      awayRosterString = buildRosterString(rosterPlayers, roster.players);
    }

    return {
      homeTeam: {
        name: homeTeamRecord.name || `Team ${homeTeamId}`,
        roster: homeRosterString,
        logoUrl: homeTeamRecord.logo_url || '',
        color: homeTeamRecord.color || '#ffffff',
      },
      awayTeam: {
        name: awayTeamRecord.name || `Team ${awayTeamId}`,
        roster: awayRosterString,
        logoUrl: awayTeamRecord.logo_url || '',
        color: awayTeamRecord.color || '#ffffff',
      },
      competition: game.competition || '',
      location: game.location || '',
      gameDate: game.date || undefined,
    };
  },
  updateGameScheduleStatus: async (gameId: number | string, status: 'in_progress' | 'finished'): Promise<void> => {
    if (shouldUseScheduleSource()) {
      console.warn('[PocketBase] Schedule source records are read-only. Status update skipped.');
      return;
    }
    try {
      await requestJson<unknown>(buildUrl(`/api/collections/schedules/records/${gameId}`), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.warn('[PocketBase] Failed to update game status:', error);
    }
  },
};
