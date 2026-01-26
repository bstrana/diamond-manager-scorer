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

  const baseParams = {
    filter: buildScheduleSourceFilter(),
    perPage: '1',
  };

  const sortCandidates = ['-updated', '-created', ''];
  let data: PocketBaseListResponse<PocketBaseRecord> | null = null;
  let lastError: unknown = null;

  for (const sort of sortCandidates) {
    try {
      const url = buildUrl(`/api/collections/${scheduleSourceCollection}/records`, {
        ...baseParams,
        ...(sort ? { sort } : {}),
      });
      data = await requestJson<PocketBaseListResponse<PocketBaseRecord>>(url);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!data) {
    throw lastError instanceof Error ? lastError : new Error('[PocketBase] Failed to load schedule payload.');
  }

  const record = data.items?.[0];
  const payload = (record?.data || {}) as SchedulerPayload;
  cachedSchedulePayload = payload;
  cachedScheduleFetchedAt = now;
  return payload;
};

const loadSchedulePayloadFromCollection = async (collection: string): Promise<SchedulerPayload | null> => {
  const baseParams = {
    perPage: '1',
  };
  const sortCandidates = ['-updated', '-created', ''];
  const filter = buildScheduleSourceFilter();
  let lastError: unknown = null;

  const tryFetch = async (useFilter: boolean, sort: string): Promise<PocketBaseListResponse<PocketBaseRecord>> => {
    const params: Record<string, string> = {
      ...baseParams,
      ...(useFilter ? { filter } : {}),
      ...(sort ? { sort } : {}),
    };
    const url = buildUrl(`/api/collections/${collection}/records`, params);
    return requestJson<PocketBaseListResponse<PocketBaseRecord>>(url);
  };

  for (const sort of sortCandidates) {
    try {
      const data = await tryFetch(true, sort);
      const record = data.items?.[0];
      if (record?.data) {
        return (record.data || {}) as SchedulerPayload;
      }
      return null;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 400) {
        try {
          const data = await tryFetch(false, sort);
          const record = data.items?.[0];
          if (record?.data) {
            return (record.data || {}) as SchedulerPayload;
          }
          return null;
        } catch (innerError) {
          lastError = innerError;
        }
      } else {
        lastError = error;
      }
    }
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error('[PocketBase] Failed to load schedule payload.');
  }
  return null;
};

const formatTeamName = (team?: { name?: string; city?: string }) => {
  if (!team) return 'Unknown';
  return `${team.city || ''} ${team.name || ''}`.trim() || 'Unknown';
};

const formatScheduleDateTime = (date?: string, time?: string): string => {
  if (!date && !time) return '';
  const combined = date ? `${date}${time ? `T${time}` : ''}` : time || '';
  const parsed = combined ? new Date(combined) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  return `${date || ''}${time ? ` ${time}` : ''}`.trim();
};

const isActiveScheduleStatus = (status?: string): boolean => {
  if (!status) return true;
  const normalized = status.toLowerCase();
  return normalized === 'scheduled' || normalized === 'in_progress';
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

const fetchTeamByName = async (teamName: string): Promise<TeamRecord | null> => {
  const normalized = teamName.trim().toLowerCase();
  if (!normalized) return null;
  const data = await requestJson<PocketBaseListResponse<TeamRecord>>(buildUrl('/api/collections/teams/records', {
    perPage: '200',
  }));
  const match = (data.items || []).find((team) => (team.name || '').trim().toLowerCase() === normalized);
  return match || null;
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
      const games = [...(payload.games || [])]
        .filter((game) => isActiveScheduleStatus((game as { status?: string }).status))
        .sort((a, b) => {
        const left = `${a.date || ''}T${a.time || '00:00'}`;
        const right = `${b.date || ''}T${b.time || '00:00'}`;
        return left.localeCompare(right);
      });
      const teamById = new Map(teams.map((team) => [team.id, team]));
      return games.map((game) => {
        const home = teamById.get(game.homeTeamId);
        const away = teamById.get(game.awayTeamId);
        const dateTimeLabel = formatScheduleDateTime(game.date, game.time);
        return {
          id: game.id,
          title: `${formatTeamName(away)} @ ${formatTeamName(home)}${dateTimeLabel ? ` (${dateTimeLabel})` : ''}`,
        };
      });
    }

    const schedulePayload = await loadSchedulePayloadFromCollection('schedules');
    if (schedulePayload) {
      const teams = schedulePayload.teams || [];
      const games = [...(schedulePayload.games || [])]
        .filter((game) => isActiveScheduleStatus((game as { status?: string }).status))
        .sort((a, b) => {
          const left = `${a.date || ''}T${a.time || '00:00'}`;
          const right = `${b.date || ''}T${b.time || '00:00'}`;
          return left.localeCompare(right);
        });
      const teamById = new Map(teams.map((team) => [team.id, team]));
      return games.map((game) => {
        const home = teamById.get(game.homeTeamId);
        const away = teamById.get(game.awayTeamId);
        const dateTimeLabel = formatScheduleDateTime(game.date, game.time);
        return {
          id: game.id,
          title: `${formatTeamName(away)} @ ${formatTeamName(home)}${dateTimeLabel ? ` (${dateTimeLabel})` : ''}`,
        };
      });
    }

    const urlWithSort = buildUrl('/api/collections/schedules/records', {
      sort: 'date',
      perPage: '200',
    });

    try {
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(urlWithSort);
      return (data.items || [])
        .filter((game) => !game.status || game.status === 'scheduled' || game.status === 'in_progress')
        .map((game) => ({
          id: game.id,
          title: `${game.title || game.competition || `Game #${game.id}`}${game.date ? ` (${formatScheduleDateTime(game.date)})` : ''}`,
        }));
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status !== 400) {
        throw error;
      }
      const urlNoSort = buildUrl('/api/collections/schedules/records', {
        perPage: '200',
      });
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(urlNoSort);
      return (data.items || [])
        .filter((game) => !game.status || game.status === 'scheduled' || game.status === 'in_progress')
        .map((game) => ({
          id: game.id,
          title: `${game.title || game.competition || `Game #${game.id}`}${game.date ? ` (${formatScheduleDateTime(game.date)})` : ''}`,
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

    const schedulePayload = await loadSchedulePayloadFromCollection('schedules');
    if (schedulePayload) {
      const teams = schedulePayload.teams || [];
      const leagues = schedulePayload.leagues || [];
      const games = schedulePayload.games || [];
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

    const extractId = (value: unknown): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'object') {
        const asRecord = value as { id?: string | number; key?: string | number };
        if (asRecord.id !== undefined) return String(asRecord.id);
        if (asRecord.key !== undefined) return String(asRecord.key);
      }
      return undefined;
    };

    const resolveTeamId = (record: ScheduledGameRecord, candidates: string[], expandKey: string): string | undefined => {
      const expanded = getExpanded<TeamRecord>(record, expandKey);
      const expandedId = extractId(expanded?.id ?? expanded);
      if (expandedId) return expandedId;
      for (const key of candidates) {
        if (Object.prototype.hasOwnProperty.call(record, key)) {
          const value = (record as Record<string, unknown>)[key];
          const id = extractId(value);
          if (id) return id;
        }
      }
      return undefined;
    };

    const homeTeamId = resolveTeamId(game, ['home_team', 'homeTeam', 'home_team_id', 'homeTeamId'], 'home_team');
    const awayTeamId = resolveTeamId(game, ['away_team', 'awayTeam', 'away_team_id', 'awayTeamId'], 'away_team');

    const homeTeamName = (game as Record<string, unknown>).home_team_name
      || (game as Record<string, unknown>).homeTeamName
      || (game as Record<string, unknown>).home_name
      || (game as Record<string, unknown>).homeName;
    const awayTeamName = (game as Record<string, unknown>).away_team_name
      || (game as Record<string, unknown>).awayTeamName
      || (game as Record<string, unknown>).away_name
      || (game as Record<string, unknown>).awayName;

    if (!homeTeamId || !awayTeamId) {
      const resolvedHome = !homeTeamId && typeof homeTeamName === 'string'
        ? await fetchTeamByName(homeTeamName)
        : null;
      const resolvedAway = !awayTeamId && typeof awayTeamName === 'string'
        ? await fetchTeamByName(awayTeamName)
        : null;
      const finalHomeId = homeTeamId || resolvedHome?.id;
      const finalAwayId = awayTeamId || resolvedAway?.id;

      if (!finalHomeId || !finalAwayId) {
        const availableKeys = Object.keys(game).join(', ');
        throw new Error(`Game schedule is missing required team IDs. Available fields: ${availableKeys}`);
      }

      const homeTeamRecord = finalHomeId === resolvedHome?.id
        ? resolvedHome
        : await fetchTeam(finalHomeId, getExpanded<TeamRecord>(game, 'home_team'));
      const awayTeamRecord = finalAwayId === resolvedAway?.id
        ? resolvedAway
        : await fetchTeam(finalAwayId, getExpanded<TeamRecord>(game, 'away_team'));

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
          name: homeTeamRecord?.name || `Team ${finalHomeId}`,
          roster: homeRosterString,
          logoUrl: homeTeamRecord?.logo_url || '',
          color: homeTeamRecord?.color || '#ffffff',
        },
        awayTeam: {
          name: awayTeamRecord?.name || `Team ${finalAwayId}`,
          roster: awayRosterString,
          logoUrl: awayTeamRecord?.logo_url || '',
          color: awayTeamRecord?.color || '#ffffff',
        },
        competition: game.competition || '',
        location: game.location || '',
        gameDate: game.date || undefined,
      };
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
