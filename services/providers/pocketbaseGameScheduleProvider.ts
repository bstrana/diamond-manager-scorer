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
  org_id?: string;
  orgId?: string;
  schedule_name?: string;
  scheduleName?: string;
  data?: SchedulerPayload;
  home_team?: string;
  away_team?: string;
  home_roster?: string;
  away_roster?: string;
};

type SchedulerPayload = {
  leagues?: Array<{ id: string; name: string }>;
  teams?: Array<{
    id?: string;
    key?: string;
    name?: string;
    team_name?: string;
    city?: string;
    city_name?: string;
    primaryColor?: string;
    color?: string;
    primary_color?: string;
    team_color?: string;
    logoUrl?: string;
    logo_url?: string;
    logo?: string;
    roster?: Array<{ name: string; number?: number; position?: string; photoUrl?: string }>;
  }>;
  games?: Array<{
    id: string;
    homeTeamId?: string;
    home_team_id?: string;
    awayTeamId?: string;
    away_team_id?: string;
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
  logoUrl?: string;
  logo?: string;
  color?: string;
  primary_color?: string;
  primaryColor?: string;
  team_color?: string;
};

const resolveTeamLogo = (team: Record<string, unknown> | null | undefined): string => {
  if (!team) return '';
  return String(team.logoUrl || team.logo_url || team.logo || '');
};

const resolveTeamColor = (team: Record<string, unknown> | null | undefined): string => {
  if (!team) return '#ffffff';
  return String(team.primaryColor || team.primary_color || team.color || team.team_color || '#ffffff');
};

const getTeamId = (team: Record<string, unknown>): string =>
  String(team.id || team.key || '');

const resolveTeamName = (team: Record<string, unknown>): string =>
  String(team.name || team.team_name || team.teamName || team.fullName || team.full_name || team.shortName || team.short_name || '');

const resolveTeamCity = (team: Record<string, unknown>): string =>
  String(team.city || team.city_name || team.cityName || team.location || '');

const resolveGameHomeTeamId = (game: Record<string, unknown>): string =>
  String(game.homeTeamId || game.home_team_id || game.homeTeam || game.home_team || '');

const resolveGameAwayTeamId = (game: Record<string, unknown>): string =>
  String(game.awayTeamId || game.away_team_id || game.awayTeam || game.away_team || '');

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
  // When SCHEDULER_URL is set (scheduling app on a separate domain), route all
  // requests through the server-side proxy to avoid CORS. The proxy path is
  // relative so the browser resolves it against its current origin.
  if (getEnvVar('SCHEDULER_URL')) {
    return '/api/scheduler-proxy';
  }

  // Legacy: schedules live in the same PocketBase as game data.
  const raw = getEnvVar('POCKETBASE_URL') || '';
  if (!raw) {
    throw new Error('Scheduling app is not configured. Set SCHEDULER_URL to connect to the scheduling app\'s PocketBase.');
  }
  // Preserve relative paths (e.g. /_pb on Cloudron).
  if (raw.startsWith('/')) {
    return raw.replace(/\/$/, '');
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
// SCHEDULER_ORG_ID takes priority; POCKETBASE_SCHEDULE_ORG_ID kept for backwards compatibility
const scheduleSourceOrgId = getEnvVar('SCHEDULER_ORG_ID') || getEnvVar('POCKETBASE_SCHEDULE_ORG_ID');

// Returns the PocketBase collection used to fetch published schedules.
// When SCHEDULER_URL is set (dedicated scheduling app) the default is
// "published_schedules"; override with SCHEDULER_COLLECTION env var.
// Falls back to "schedules" for legacy same-instance setups.
const getSchedulesCollection = (): string =>
  getEnvVar('SCHEDULER_COLLECTION') ||
  (getEnvVar('SCHEDULER_URL') ? 'published_schedules' : 'schedules');
const scheduleSourceUserId = getEnvVar('POCKETBASE_SCHEDULE_USER_ID');
const scheduleSourceAppId = getEnvVar('POCKETBASE_SCHEDULE_APP_ID');

const shouldUseScheduleSource = () => scheduleSourceCollection.length > 0;

const buildScheduleSourceFilter = (orgIdOverride?: string): string => {
  const filters: string[] = ['active=true'];
  const resolvedOrgId = orgIdOverride || scheduleSourceOrgId;
  if (resolvedOrgId) {
    filters.push(`org_id="${resolvedOrgId}"`);
  }
  const enforceUserAppFilters = (getEnvVar('POCKETBASE_SCHEDULE_STRICT_FILTERS') || '').toLowerCase() === 'true';
  if (enforceUserAppFilters) {
    if (scheduleSourceUserId) {
      filters.push(`user_id="${scheduleSourceUserId}"`);
    }
    if (scheduleSourceAppId) {
      filters.push(`app_id="${scheduleSourceAppId}"`);
    }
  }
  return filters.join(' && ');
};

let cachedSchedulePayload: SchedulerPayload | null = null;
let cachedScheduleFetchedAt = 0;
let cachedScheduleOrgId: string | null = null;
const SCHEDULE_CACHE_MS = 30000;

const loadSchedulePayload = async (orgId?: string): Promise<SchedulerPayload> => {
  if (!scheduleSourceCollection) {
    throw new Error('[PocketBase] Missing POCKETBASE_SCHEDULE_SOURCE_COLLECTION.');
  }
  const normalizedOrgId = (orgId || scheduleSourceOrgId || '').trim();
  const now = Date.now();
  if (
    cachedSchedulePayload &&
    now - cachedScheduleFetchedAt < SCHEDULE_CACHE_MS &&
    cachedScheduleOrgId === normalizedOrgId
  ) {
    return cachedSchedulePayload;
  }

  const baseParams = {
    filter: buildScheduleSourceFilter(orgId),
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
  cachedScheduleOrgId = normalizedOrgId;
  return payload;
};

type SchedulePayloadSource = {
  payload: SchedulerPayload;
  scheduleName?: string;
  scheduleId?: string;
};

let cachedSchedulePayloadFromSchedules: SchedulePayloadSource | null = null;
let cachedScheduleSourceFetchedAt = 0;
let cachedScheduleSourceOrgId: string | null = null;
let cachedScheduleSourceId: string | null = null;

export type SchedulePayloadOption = {
  id: string;
  name: string;
};

export const fetchSchedulePayloadOptions = async (orgId?: string): Promise<SchedulePayloadOption[]> => {
  const collection = getSchedulesCollection();
  const toOptions = (items: ScheduledGameRecord[]) =>
    items.map((record) => ({
      id: record.id,
      name: record.schedule_name || record.scheduleName || record.title || `Schedule ${record.id}`,
    }));

  const upperOrgId = orgId?.toUpperCase();

  // Try server-side org_id filter first (DB stores org_id in uppercase)
  if (upperOrgId) {
    const params: Record<string, string> = { perPage: '200', filter: `org_id="${upperOrgId}"` };
    const url = buildUrl(`/api/collections/${collection}/records`, params);
    try {
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(url);
      if ((data.items || []).length > 0) return toOptions(data.items);
    } catch {
      // fall through to unfiltered query + client-side filter
    }
  }

  // Fetch all and filter client-side (handles collections with different field names
  // like orgId, organization_id, organizationId, etc.)
  const url = buildUrl(`/api/collections/${collection}/records`, { perPage: '200' });
  const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(url);
  const items = data.items || [];

  if (upperOrgId) {
    const filtered = items.filter((r) => getRecordOrgId(r)?.toUpperCase() === upperOrgId);
    if (filtered.length > 0) return toOptions(filtered);
  }

  return toOptions(items);
};

const loadSchedulePayloadFromSchedules = async (orgId?: string, scheduleId?: string): Promise<SchedulePayloadSource | null> => {
  const normalizedOrgId = (orgId || '').trim();
  const normalizedScheduleId = (scheduleId || '').trim();
  const now = Date.now();
  if (
    cachedSchedulePayloadFromSchedules &&
    now - cachedScheduleSourceFetchedAt < SCHEDULE_CACHE_MS &&
    cachedScheduleSourceOrgId === normalizedOrgId &&
    cachedScheduleSourceId === normalizedScheduleId
  ) {
    return cachedSchedulePayloadFromSchedules;
  }

  const baseParams: Record<string, string> = {
    perPage: '1',
  };
  const filters: string[] = [];
  if (normalizedOrgId) {
    filters.push(`org_id="${normalizedOrgId.toUpperCase()}"`);
  }
  if (normalizedScheduleId) {
    filters.push(`id="${normalizedScheduleId}"`);
  }
  const filter = filters.join(' && ');
  let lastError: unknown = null;

  try {
    const url = buildUrl(`/api/collections/${getSchedulesCollection()}/records`, {
      ...baseParams,
      filter,
    });
    const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(url);
    const record = data.items?.[0];
    if (record?.data) {
      const scheduleName = record.schedule_name || record.scheduleName || record.title;
      const payloadSource = { payload: record.data, scheduleName, scheduleId: record.id };
      cachedSchedulePayloadFromSchedules = payloadSource;
      cachedScheduleSourceFetchedAt = now;
      cachedScheduleSourceOrgId = normalizedOrgId;
      cachedScheduleSourceId = normalizedScheduleId;
      return payloadSource;
    }
    cachedSchedulePayloadFromSchedules = null;
    cachedScheduleSourceFetchedAt = now;
    cachedScheduleSourceOrgId = normalizedOrgId;
    cachedScheduleSourceId = normalizedScheduleId;
    return null;
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 400) {
      // Filter not supported — fall back to unfiltered + client-side match
      try {
        const fallbackUrl = buildUrl(`/api/collections/${getSchedulesCollection()}/records`, baseParams);
        const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(fallbackUrl);
        const record = (data.items || []).find((item) => {
          if (!item.data) return false;
          if (!normalizedOrgId) return true;
          const recOrgId = getRecordOrgId(item);
          return recOrgId?.toUpperCase() === normalizedOrgId.toUpperCase();
        });
        if (record?.data) {
          const scheduleName = record.schedule_name || record.scheduleName || record.title;
          const payloadSource = { payload: record.data, scheduleName, scheduleId: record.id };
          cachedSchedulePayloadFromSchedules = payloadSource;
          cachedScheduleSourceFetchedAt = now;
          cachedScheduleSourceOrgId = normalizedOrgId;
          cachedScheduleSourceId = normalizedScheduleId;
          return payloadSource;
        }
        cachedSchedulePayloadFromSchedules = null;
        cachedScheduleSourceFetchedAt = now;
        cachedScheduleSourceOrgId = normalizedOrgId;
        cachedScheduleSourceId = normalizedScheduleId;
        return null;
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    } else {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error('[PocketBase] Failed to load schedule payload.');
  }
  return null;
};

const formatTeamName = (team?: Record<string, unknown> | null) => {
  if (!team) return 'Unknown';
  const city = resolveTeamCity(team);
  const name = resolveTeamName(team);
  return `${city} ${name}`.trim() || getTeamId(team) || 'Unknown';
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

const buildRosterStringFromSchedule = (roster?: Array<{ name: string; number?: number; position?: string; photoUrl?: string }>): string => {
  if (!roster || roster.length === 0) return '';
  return roster.map((player, index) => {
    const battingOrder = index < 9 ? index + 1 : 0;
    const number = player.number ?? 0;
    const name = player.name?.trim() || 'Unknown Player';
    const position = player.position || 'BENCH';
    const photoUrl = player.photoUrl || PLAYER_PHOTO_PLACEHOLDER;
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

const extractOrgId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const record = value as { id?: string | number; key?: string | number };
    if (record.id !== undefined) return String(record.id);
    if (record.key !== undefined) return String(record.key);
  }
  return undefined;
};

const getRecordOrgId = (record: ScheduledGameRecord): string | undefined => {
  const raw =
    record.org_id ??
    record.orgId ??
    (record as Record<string, unknown>).organization_id ??
    (record as Record<string, unknown>).organizationId ??
    (record as Record<string, unknown>).org ??
    (record as Record<string, unknown>).organization;
  return extractOrgId(raw);
};

const matchesOrg = (record: ScheduledGameRecord, orgId?: string): boolean => {
  if (!orgId) return true;
  const recordOrgId = getRecordOrgId(record);
  if (!recordOrgId) return false;
  return String(recordOrgId) === String(orgId);
};

export const pocketbaseGameScheduleProvider: GameScheduleProvider = {
  provider: 'pocketbase',
  // Configured when the dedicated scheduler URL is present, or when the legacy
  // schedule collection is explicitly pointed at the shared PocketBase instance.
  isConfigured: () => !!(getEnvVar('SCHEDULER_URL') || getEnvVar('POCKETBASE_SCHEDULE_SOURCE_COLLECTION')),
  fetchUserScheduledGames: async (context?: { orgId?: string; scheduleId?: string }): Promise<ScheduledGameSummary[]> => {
    const orgId = context?.orgId;
    const scheduleId = context?.scheduleId;
    if (shouldUseScheduleSource() && !scheduleId) {
      const payload = await loadSchedulePayload(orgId);
      const teams = payload.teams || [];
      const games = [...(payload.games || [])]
        .filter((game) => isActiveScheduleStatus((game as { status?: string }).status))
        .sort((a, b) => {
        const left = `${a.date || ''}T${a.time || '00:00'}`;
        const right = `${b.date || ''}T${b.time || '00:00'}`;
        return left.localeCompare(right);
      });
      const teamById = new Map(teams.map((team) => [getTeamId(team as Record<string, unknown>), team as Record<string, unknown>]));
      const missingIds2 = new Set<string>();
      for (const game of games) {
        const g = game as Record<string, unknown>;
        const hId = resolveGameHomeTeamId(g);
        const aId = resolveGameAwayTeamId(g);
        if (hId && !teamById.has(hId)) missingIds2.add(hId);
        if (aId && !teamById.has(aId)) missingIds2.add(aId);
      }
      if (missingIds2.size > 0) {
        const fetched = await Promise.allSettled([...missingIds2].map((id) => fetchTeam(id)));
        fetched.forEach((result, i) => {
          if (result.status === 'fulfilled') teamById.set([...missingIds2][i], result.value as Record<string, unknown>);
        });
      }
      return games.map((game) => {
        const g = game as Record<string, unknown>;
        const home = teamById.get(resolveGameHomeTeamId(g));
        const away = teamById.get(resolveGameAwayTeamId(g));
        const dateTimeLabel = formatScheduleDateTime(game.date, game.time);
        return {
          id: game.id,
          title: `${formatTeamName(away)} @ ${formatTeamName(home)}${dateTimeLabel ? ` (${dateTimeLabel})` : ''}`,
        };
      });
    }

    const scheduleSource = await loadSchedulePayloadFromSchedules(orgId, scheduleId);
    if (scheduleSource) {
      const payload = scheduleSource.payload;
      const teams = payload.teams || [];
      const games = [...(payload.games || [])]
        .filter((game) => isActiveScheduleStatus((game as { status?: string }).status))
        .sort((a, b) => {
          const left = `${a.date || ''}T${a.time || '00:00'}`;
          const right = `${b.date || ''}T${b.time || '00:00'}`;
          return left.localeCompare(right);
        });
      const teamById = new Map(teams.map((team) => [getTeamId(team as Record<string, unknown>), team as Record<string, unknown>]));

      // Fetch any team IDs referenced in games but missing from the payload
      const missingIds = new Set<string>();
      for (const game of games) {
        const g = game as Record<string, unknown>;
        const hId = resolveGameHomeTeamId(g);
        const aId = resolveGameAwayTeamId(g);
        if (hId && !teamById.has(hId)) missingIds.add(hId);
        if (aId && !teamById.has(aId)) missingIds.add(aId);
      }
      if (missingIds.size > 0) {
        const fetched = await Promise.allSettled(
          [...missingIds].map((id) => fetchTeam(id))
        );
        fetched.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const id = [...missingIds][i];
            teamById.set(id, result.value as Record<string, unknown>);
          }
        });
      }

      const schedulePrefix = scheduleSource.scheduleName ? `${scheduleSource.scheduleName} - ` : '';
      return games.map((game) => {
        const g = game as Record<string, unknown>;
        const home = teamById.get(resolveGameHomeTeamId(g));
        const away = teamById.get(resolveGameAwayTeamId(g));
        const dateTimeLabel = formatScheduleDateTime(game.date, game.time);
        return {
          id: game.id,
          title: `${schedulePrefix}${formatTeamName(away)} @ ${formatTeamName(home)}${dateTimeLabel ? ` (${dateTimeLabel})` : ''}`,
        };
      });
    }

    const urlWithSort = buildUrl(`/api/collections/${getSchedulesCollection()}/records`, {
      sort: 'date',
      perPage: '200',
    });

    try {
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(urlWithSort);
      return (data.items || [])
        .filter((game) => isActiveScheduleStatus(game.status))
        .filter((game) => matchesOrg(game, orgId))
        .map((game) => ({
          id: game.id,
          title: `${game.title || game.competition || `Game #${game.id}`}${game.date ? ` (${formatScheduleDateTime(game.date)})` : ''}`,
        }));
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status !== 400) {
        throw error;
      }
      const urlNoSort = buildUrl(`/api/collections/${getSchedulesCollection()}/records`, {
        perPage: '200',
      });
      const data = await requestJson<PocketBaseListResponse<ScheduledGameRecord>>(urlNoSort);
      return (data.items || [])
        .filter((game) => isActiveScheduleStatus(game.status))
        .filter((game) => matchesOrg(game, orgId))
        .map((game) => ({
          id: game.id,
          title: `${game.title || game.competition || `Game #${game.id}`}${game.date ? ` (${formatScheduleDateTime(game.date)})` : ''}`,
        }));
    }
  },
  fetchGameScheduleData: async (gameId: number | string, context?: { orgId?: string; scheduleId?: string }): Promise<FetchedGameScheduleData> => {
    const orgId = context?.orgId;
    const scheduleId = context?.scheduleId;
    if (shouldUseScheduleSource() && !scheduleId) {
      const payload = await loadSchedulePayload(orgId);
      const teams = payload.teams || [];
      const leagues = payload.leagues || [];
      const games = payload.games || [];
      const teamById = new Map(teams.map((team) => [getTeamId(team as Record<string, unknown>), team]));
      const leagueById = new Map(leagues.map((league) => [league.id, league]));

      const game = games.find((item) => String(item.id) === String(gameId));
      if (!game) {
        throw new Error(`Schedule game ${gameId} was not found.`);
      }
      const gameRaw = game as Record<string, unknown>;
      const homeTeam = teamById.get(resolveGameHomeTeamId(gameRaw));
      const awayTeam = teamById.get(resolveGameAwayTeamId(gameRaw));

      const leagueId = game.leagueIds?.[0] || game.leagueId;
      const competition = leagueId ? leagueById.get(leagueId)?.name || '' : '';

      return {
        homeTeam: {
          name: formatTeamName(homeTeam),
          roster: buildRosterStringFromSchedule(homeTeam?.roster),
          logoUrl: resolveTeamLogo(homeTeam as Record<string, unknown>),
          color: resolveTeamColor(homeTeam as Record<string, unknown>),
        },
        awayTeam: {
          name: formatTeamName(awayTeam),
          roster: buildRosterStringFromSchedule(awayTeam?.roster),
          logoUrl: resolveTeamLogo(awayTeam as Record<string, unknown>),
          color: resolveTeamColor(awayTeam as Record<string, unknown>),
        },
        competition,
        location: game.location || '',
        gameDate: `${game.date}T${game.time || '19:00'}:00`,
      };
    }

    const scheduleSource = await loadSchedulePayloadFromSchedules(orgId, scheduleId);
    if (scheduleSource) {
      const payload = scheduleSource.payload;
      const teams = payload.teams || [];
      const leagues = payload.leagues || [];
      const games = payload.games || [];
      const teamById = new Map(teams.map((team) => [getTeamId(team as Record<string, unknown>), team]));
      const leagueById = new Map(leagues.map((league) => [league.id, league]));

      const game = games.find((item) => String(item.id) === String(gameId));
      if (!game) {
        throw new Error(`Schedule game ${gameId} was not found.`);
      }
      const gameRaw = game as Record<string, unknown>;
      const homeTeam = teamById.get(resolveGameHomeTeamId(gameRaw));
      const awayTeam = teamById.get(resolveGameAwayTeamId(gameRaw));

      const leagueId = game.leagueIds?.[0] || game.leagueId;
      const competition = leagueId ? leagueById.get(leagueId)?.name || '' : '';

      return {
        homeTeam: {
          name: formatTeamName(homeTeam),
          roster: buildRosterStringFromSchedule(homeTeam?.roster),
          logoUrl: resolveTeamLogo(homeTeam as Record<string, unknown>),
          color: resolveTeamColor(homeTeam as Record<string, unknown>),
        },
        awayTeam: {
          name: formatTeamName(awayTeam),
          roster: buildRosterStringFromSchedule(awayTeam?.roster),
          logoUrl: resolveTeamLogo(awayTeam as Record<string, unknown>),
          color: resolveTeamColor(awayTeam as Record<string, unknown>),
        },
        competition,
        location: game.location || '',
        gameDate: `${game.date}T${game.time || '19:00'}:00`,
      };
    }

    const url = buildUrl(`/api/collections/${getSchedulesCollection()}/records/${gameId}`, {
      expand: 'home_team,away_team,home_roster,away_roster,home_roster.players,away_roster.players',
    });

    const game = await requestJson<ScheduledGameRecord>(url);
    if (!matchesOrg(game, orgId)) {
      throw new Error('Scheduled game is not available for the current organization.');
    }

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
          logoUrl: resolveTeamLogo(homeTeamRecord as Record<string, unknown>),
          color: resolveTeamColor(homeTeamRecord as Record<string, unknown>),
        },
        awayTeam: {
          name: awayTeamRecord?.name || `Team ${finalAwayId}`,
          roster: awayRosterString,
          logoUrl: resolveTeamLogo(awayTeamRecord as Record<string, unknown>),
          color: resolveTeamColor(awayTeamRecord as Record<string, unknown>),
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
        logoUrl: resolveTeamLogo(homeTeamRecord as Record<string, unknown>),
        color: resolveTeamColor(homeTeamRecord as Record<string, unknown>),
      },
      awayTeam: {
        name: awayTeamRecord.name || `Team ${awayTeamId}`,
        roster: awayRosterString,
        logoUrl: resolveTeamLogo(awayTeamRecord as Record<string, unknown>),
        color: resolveTeamColor(awayTeamRecord as Record<string, unknown>),
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
      await requestJson<unknown>(buildUrl(`/api/collections/${getSchedulesCollection()}/records/${gameId}`), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.warn('[PocketBase] Failed to update game status:', error);
    }
  },
};
