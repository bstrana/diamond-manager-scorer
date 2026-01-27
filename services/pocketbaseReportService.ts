import { getEnvVar } from '../utils/env';

type PocketBaseListResponse<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

export type ScheduleRecord = {
  id: string;
  title?: string;
  date?: string;
  status?: string;
  home_team?: string;
  away_team?: string;
  org_id?: string;
  orgId?: string;
  expand?: Record<string, any>;
};

export type GameRecord = {
  id: string;
  status?: string;
  competition?: string;
  location?: string;
  game_date?: string;
  game_start_time?: string;
  game_end_time?: string;
  external_game_id?: string | number;
  home_team?: string;
  away_team?: string;
  home_team_roster_text?: string;
  away_team_roster_text?: string;
  expand?: Record<string, any>;
};

export type PlateAppearanceRecord = {
  id: string;
  game?: string;
  inning?: number;
  is_top_inning?: boolean;
  result?: string;
  rbis?: number;
  pitch_sequence?: string;
  batter_name?: string;
  pitcher_name?: string;
  defensive_plays?: unknown;
  hit_description?: unknown;
};

const getBaseUrl = (): string => {
  const raw = getEnvVar('POCKETBASE_URL') || '';
  if (!raw) {
    throw new Error('PocketBase is not configured. Set POCKETBASE_URL.');
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

const requestJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
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

const fetchAllRecords = async <T>(collection: string, params: Record<string, string>): Promise<T[]> => {
  const perPage = params.perPage || '200';
  let page = 1;
  let items: T[] = [];
  let totalPages = 1;

  do {
    const url = buildUrl(`/api/collections/${collection}/records`, {
      ...params,
      perPage,
      page: String(page),
    });
    const data = await requestJson<PocketBaseListResponse<T>>(url);
    items = items.concat(data.items || []);
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
};

const tryFetchWithFilterFallback = async <T>(collection: string, params: Record<string, string>): Promise<T[]> => {
  try {
    return await fetchAllRecords<T>(collection, params);
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 400 || !params.filter) {
      throw error;
    }
    const { filter, ...rest } = params;
    return fetchAllRecords<T>(collection, rest);
  }
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

const getRecordOrgId = (record: ScheduleRecord): string | undefined => {
  const raw =
    record.org_id ??
    record.orgId ??
    (record as Record<string, unknown>).organization_id ??
    (record as Record<string, unknown>).organizationId ??
    (record as Record<string, unknown>).org ??
    (record as Record<string, unknown>).organization;
  return extractOrgId(raw);
};

export const fetchSchedules = async (orgId?: string): Promise<ScheduleRecord[]> => {
  const schedulesFromProvider = await tryFetchWithFilterFallback<ScheduleRecord>('schedules', {
    sort: 'date',
    perPage: '200',
    expand: 'home_team,away_team',
  });

  return schedulesFromProvider.filter((schedule) => {
    if (!orgId) return true;
    const recordOrgId = getRecordOrgId(schedule);
    return recordOrgId ? String(recordOrgId) === String(orgId) : false;
  });
};

export const fetchGames = async (scheduleIds: Array<string | number>): Promise<GameRecord[]> => {
  if (scheduleIds.length === 1) {
    const filter = `external_game_id="${scheduleIds[0]}"`;
    return tryFetchWithFilterFallback<GameRecord>('games', {
      sort: '-game_start_time',
      perPage: '200',
      filter,
      expand: 'home_team,away_team',
    });
  }

  return fetchAllRecords<GameRecord>('games', {
    sort: '-game_start_time',
    perPage: '200',
    expand: 'home_team,away_team',
  });
};

export const fetchPlateAppearancesForGames = async (gameIds: string[]): Promise<PlateAppearanceRecord[]> => {
  const allResults: PlateAppearanceRecord[] = [];
  for (const gameId of gameIds) {
    const results = await fetchAllRecords<PlateAppearanceRecord>('plate_appearances', {
      perPage: '200',
      filter: `game="${gameId}"`,
    });
    allResults.push(...results);
  }
  return allResults;
};
