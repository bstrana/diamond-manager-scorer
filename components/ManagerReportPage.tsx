import React, { useEffect, useMemo, useState } from 'react';
import { useKeycloakAuth } from './KeycloakAuth';
import {
  fetchGames,
  fetchPlateAppearancesForGames,
  ScheduleRecord,
  GameRecord,
  PlateAppearanceRecord,
} from '../services/pocketbaseReportService';
import { getGameScheduleProvider } from '../services/gameScheduleProvider';

type AggregatedPlayerStats = {
  name: string;
  team?: string;
  PA: number;
  AB: number;
  H: number;
  HR: number;
  RBI: number;
  BB: number;
  SO: number;
  SF: number;
  SH: number;
  singles: number;
  doubles: number;
  triples: number;
  AVG: number;
  OBP: number;
  SLG: number;
  A: number;
  PO: number;
  E: number;
  SO_pitched: number;
  BB_allowed: number;
  H_allowed: number;
};

const STAT_DEFAULTS: Omit<AggregatedPlayerStats, 'name' | 'team'> = {
  PA: 0,
  AB: 0,
  H: 0,
  HR: 0,
  RBI: 0,
  BB: 0,
  SO: 0,
  SF: 0,
  SH: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  AVG: 0,
  OBP: 0,
  SLG: 0,
  A: 0,
  PO: 0,
  E: 0,
  SO_pitched: 0,
  BB_allowed: 0,
  H_allowed: 0,
};

const normalizeName = (value?: string) => value?.trim().toLowerCase() || '';

const getTeamName = (game: GameRecord, side: 'home' | 'away'): string | undefined => {
  const expanded = (game.expand || {})[`${side}_team`] as { name?: string } | undefined;
  if (expanded?.name) return expanded.name;
  const directKey = side === 'home' ? 'home_team' : 'away_team';
  const direct = (game as Record<string, unknown>)[directKey];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const fallbackKey = side === 'home' ? 'home_team_name' : 'away_team_name';
  const fallback = (game as Record<string, unknown>)[fallbackKey];
  return typeof fallback === 'string' ? fallback : undefined;
};

const parseRosterNames = (rosterText?: string): string[] => {
  if (!rosterText) return [];
  return rosterText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      return parts[2] || parts[0];
    })
    .filter(Boolean);
};

const buildRosterTeamMap = (game: GameRecord): Map<string, string> => {
  const map = new Map<string, string>();
  const homeTeam = getTeamName(game, 'home') || 'Home';
  const awayTeam = getTeamName(game, 'away') || 'Away';
  parseRosterNames(game.home_team_roster_text).forEach((name) => {
    map.set(normalizeName(name), homeTeam);
  });
  parseRosterNames(game.away_team_roster_text).forEach((name) => {
    map.set(normalizeName(name), awayTeam);
  });
  return map;
};

const extractName = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidates = [record.name, record.full_name, record.fullName, record.player_name, record.playerName];
    const match = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
    if (typeof match === 'string') return match;
  }
  return undefined;
};

const parseDefensivePlays = (value: unknown): {
  putoutBy?: string;
  assistBy?: string[];
  errorBy?: string;
} => {
  let plays: any = value;
  if (!plays) return {};
  if (typeof plays === 'string') {
    try {
      plays = JSON.parse(plays);
    } catch {
      return {};
    }
  }
  const putoutBy = extractName(plays.putoutBy ?? plays.putout_by ?? plays.putoutByName);
  const errorBy = extractName(plays.errorBy ?? plays.error_by ?? plays.errorByName);
  const assistRaw = plays.assistBy ?? plays.assist_by ?? plays.assistByNames;
  const assistBy = Array.isArray(assistRaw)
    ? assistRaw.map((entry) => extractName(entry)).filter((name): name is string => Boolean(name))
    : [];
  return { putoutBy, assistBy, errorBy };
};

const isHitResult = (result?: string) =>
  result === 'single' || result === 'double' || result === 'triple' || result === 'homerun';

const isWalkResult = (result?: string) =>
  result === 'walk' || result === 'IBB' || result === 'HBP';

const isAtBatResult = (result?: string) =>
  isHitResult(result) ||
  result === 'strikeout' ||
  result === 'flyout' ||
  result === 'groundout' ||
  result === 'fielders_choice' ||
  result === 'reached_on_error';

const ManagerReportPage: React.FC = () => {
  const auth = useKeycloakAuth();
  const orgId = useMemo(() => {
    const profile = auth?.user?.profile as Record<string, unknown> | undefined;
    const raw = profile?.org_id ?? profile?.orgId ?? profile?.organization_id ?? profile?.organizationId;
    if (Array.isArray(raw)) {
      return typeof raw[0] === 'string' ? raw[0] : undefined;
    }
    if (typeof raw === 'string') return raw;
    const attributes = profile?.attributes as Record<string, unknown> | undefined;
    const attrRaw = attributes?.org_id ?? attributes?.orgId;
    if (Array.isArray(attrRaw)) {
      return typeof attrRaw[0] === 'string' ? attrRaw[0] : undefined;
    }
    return typeof attrRaw === 'string' ? attrRaw : undefined;
  }, [auth?.user]);
  const scheduleProvider = useMemo(() => getGameScheduleProvider(), []);

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialScheduleId = searchParams.get('schedule') || 'all';
  const initialGameId = searchParams.get('game') || 'all';
  const initialTeam = searchParams.get('team') || 'all';
  const initialPlayer = searchParams.get('player') || 'all';
  const isShareView = searchParams.get('share') === '1';

  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(initialScheduleId);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [selectedGameId, setSelectedGameId] = useState(initialGameId);
  const [teamFilter, setTeamFilter] = useState(initialTeam);
  const [playerFilter, setPlayerFilter] = useState(initialPlayer);
  const [isLoading, setIsLoading] = useState(false);
  const [isGamesLoading, setIsGamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reportStats, setReportStats] = useState<AggregatedPlayerStats[]>([]);
  const [teamOptions, setTeamOptions] = useState<string[]>([]);
  const [playerOptions, setPlayerOptions] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    scheduleProvider.fetchUserScheduledGames({ orgId })
      .then((data) => {
        if (!isMounted) return;
        setSchedules(data.map((schedule) => ({
          id: String(schedule.id),
          title: schedule.title,
        })));
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load schedules.');
      });
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  useEffect(() => {
    let isMounted = true;
    if (selectedScheduleId === 'all') {
      // No schedule filter: load all games so custom (non-scheduled) games are reachable
      setIsGamesLoading(true);
      fetchGames([])
        .then((data) => {
          if (!isMounted) return;
          setGames(data);
          setSelectedGameId('all');
        })
        .catch(() => {
          if (!isMounted) return;
          setGames([]);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsGamesLoading(false);
        });
      return () => { isMounted = false; };
    }
    setIsGamesLoading(true);
    fetchGames([selectedScheduleId])
      .then((data) => {
        if (!isMounted) return;
        setGames(data);
        setSelectedGameId('all');
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load games.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsGamesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedScheduleId]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const scheduleIds =
        selectedScheduleId === 'all'
          ? schedules.map((schedule) => schedule.id)
          : [selectedScheduleId];

      // When scheduleIds is empty (no schedules / custom games only), fetchGames([])
      // falls through to the fetch-all-records path and returns all PocketBase games.
      const allGames = await fetchGames(scheduleIds);
      const playedGames = allGames.filter((game) => {
        const status = (game.status || '').toLowerCase();
        return status === 'final' || status === 'finished';
      });
      const scheduleFilteredGames = scheduleIds.length === schedules.length
        ? playedGames
        : playedGames.filter((game) => scheduleIds.some((id) => String(game.external_game_id) === String(id)));
      const filteredGames = selectedGameId === 'all'
        ? scheduleFilteredGames
        : scheduleFilteredGames.filter((game) => String(game.id) === String(selectedGameId));

      const gameIds = filteredGames.map((game) => game.id);
      if (!gameIds.length) {
        setReportStats([]);
        setTeamOptions([]);
        setPlayerOptions([]);
        setIsLoading(false);
        return;
      }

      const rosterMaps = new Map<string, Map<string, string>>();
      filteredGames.forEach((game) => {
        rosterMaps.set(game.id, buildRosterTeamMap(game));
      });

      const teamSet = new Set<string>();
      filteredGames.forEach((game) => {
        const home = getTeamName(game, 'home');
        const away = getTeamName(game, 'away');
        if (home) teamSet.add(home);
        if (away) teamSet.add(away);
      });

      const plateAppearances = await fetchPlateAppearancesForGames(gameIds);
      const statsMap = new Map<string, AggregatedPlayerStats>();

      const getStats = (name: string, team?: string) => {
        const key = normalizeName(name);
        if (!key) return null;
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            name,
            team,
            ...STAT_DEFAULTS,
          });
        }
        const stats = statsMap.get(key);
        if (stats && team && !stats.team) {
          stats.team = team;
        }
        return stats || null;
      };

      plateAppearances.forEach((pa) => {
        const gameId = pa.game;
        if (!gameId) return;
        const rosterMap = rosterMaps.get(gameId) || new Map<string, string>();
        const batterName = pa.batter_name || '';
        const pitcherName = pa.pitcher_name || '';
        const result = pa.result || '';
        const rbis = Number(pa.rbis || 0);
        const batterTeam =
          rosterMap.get(normalizeName(batterName)) ||
          extractName((pa as Record<string, unknown>).batting_team) ||
          extractName((pa as Record<string, unknown>).battingTeam);
        const pitcherTeam = batterTeam
          ? [...rosterMap.values()].find((team) => team !== batterTeam)
          : rosterMap.get(normalizeName(pitcherName));

        if (batterName) {
          const batterStats = getStats(batterName, batterTeam);
          if (batterStats) {
            batterStats.PA += 1;
            if (isAtBatResult(result)) batterStats.AB += 1;
            if (isHitResult(result)) batterStats.H += 1;
            if (result === 'homerun') batterStats.HR += 1;
            if (result === 'single') batterStats.singles += 1;
            if (result === 'double') batterStats.doubles += 1;
            if (result === 'triple') batterStats.triples += 1;
            if (isWalkResult(result)) batterStats.BB += 1;
            if (result === 'strikeout') batterStats.SO += 1;
            if (result === 'sac_fly') batterStats.SF += 1;
            if (result === 'sac_bunt') batterStats.SH += 1;
            batterStats.RBI += rbis;
          }
        }

        if (pitcherName) {
          const pitcherStats = getStats(pitcherName, pitcherTeam);
          if (pitcherStats) {
            if (result === 'strikeout') pitcherStats.SO_pitched += 1;
            if (isWalkResult(result)) pitcherStats.BB_allowed += 1;
            if (isHitResult(result)) pitcherStats.H_allowed += 1;
          }
        }

        const defensive = parseDefensivePlays(pa.defensive_plays_json);
        if (defensive.putoutBy) {
          const stats = getStats(defensive.putoutBy, rosterMap.get(normalizeName(defensive.putoutBy)));
          if (stats) stats.PO += 1;
        }
        defensive.assistBy?.forEach((name) => {
          const stats = getStats(name, rosterMap.get(normalizeName(name)));
          if (stats) stats.A += 1;
        });
        if (defensive.errorBy) {
          const stats = getStats(defensive.errorBy, rosterMap.get(normalizeName(defensive.errorBy)));
          if (stats) stats.E += 1;
        }
      });

      const statsList = Array.from(statsMap.values()).map((stats) => {
        const avg = stats.AB > 0 ? stats.H / stats.AB : 0;
        const obpDenominator = stats.AB + stats.BB + stats.SF;
        const obp = obpDenominator > 0 ? (stats.H + stats.BB) / obpDenominator : 0;
        const totalBases = stats.singles + stats.doubles * 2 + stats.triples * 3 + stats.HR * 4;
        const slg = stats.AB > 0 ? totalBases / stats.AB : 0;
        return {
          ...stats,
          AVG: avg,
          OBP: obp,
          SLG: slg,
        };
      });

      const sortedTeams = Array.from(teamSet).sort((a, b) => a.localeCompare(b));
      const sortedPlayers = statsList
        .map((player) => player.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setReportStats(statsList);
      setTeamOptions(sortedTeams);
      setPlayerOptions(sortedPlayers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isShareView) {
      loadReport();
    }
  }, [isShareView]);

  useEffect(() => {
    if (isShareView) return;
    if (selectedScheduleId === 'all') return;
    if (isGamesLoading) return;
    if (selectedGameId !== 'all') {
      loadReport();
    }
  }, [selectedScheduleId, selectedGameId, isGamesLoading, isShareView]);

  const filteredStats = useMemo(() => {
    return reportStats.filter((player) => {
      const teamMatch = teamFilter === 'all' || (player.team || 'Unknown') === teamFilter;
      const playerMatch = playerFilter === 'all' || player.name === playerFilter;
      return teamMatch && playerMatch;
    });
  }, [reportStats, teamFilter, playerFilter]);

  const buildLeaders = (key: keyof AggregatedPlayerStats, minAB = 0, minPA = 0) => {
    return [...filteredStats]
      .filter((player) => player.AB >= minAB && player.PA >= minPA)
      .sort((a, b) => b[key] - a[key])
      .slice(0, 5);
  };

  const shareLink = useMemo(() => {
    const url = new URL('/manager-report', window.location.origin);
    if (selectedScheduleId !== 'all') url.searchParams.set('schedule', selectedScheduleId);
    if (selectedGameId !== 'all') url.searchParams.set('game', selectedGameId);
    if (teamFilter !== 'all') url.searchParams.set('team', teamFilter);
    if (playerFilter !== 'all') url.searchParams.set('player', playerFilter);
    url.searchParams.set('share', '1');
    return url.toString();
  }, [selectedScheduleId, selectedGameId, teamFilter, playerFilter]);

  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const scheduleLabel = (schedule: ScheduleRecord) => {
    return schedule.title || `Schedule ${schedule.id}`;
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-yellow-300">Manager Report Dashboard</h1>
          <p className="text-gray-400">
            Aggregate stats from completed games to build leaders and reports.
          </p>
        </header>

        {!isShareView && (
          <section className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Schedule</label>
                <select
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                >
                  <option value="all">All schedules</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {scheduleLabel(schedule)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Game</label>
                <select
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                >
                  <option value="all">All games</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {`${game.competition || game.location || `Game ${game.id}`}${game.game_date ? ` (${new Date(game.game_date).toLocaleDateString()})` : ''}`}
                    </option>
                  ))}
                </select>
                {isGamesLoading && (
                  <div className="text-xs text-gray-500 mt-1">Loading games...</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team</label>
                <select
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                >
                  <option value="all">All teams</option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Player</label>
                <select
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
                  value={playerFilter}
                  onChange={(e) => setPlayerFilter(e.target.value)}
                >
                  <option value="all">All players</option>
                  {playerOptions.map((player) => (
                    <option key={player} value={player}>
                      {player}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadReport}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 rounded-md font-semibold transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Build Report'}
              </button>
              <button
                type="button"
                onClick={handleCopyShare}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors"
              >
                {copied ? 'Link Copied' : 'Copy Shareable Dashboard'}
              </button>
              <a
                href={shareLink}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors"
              >
                Open Share View
              </a>
            </div>
          </section>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-4">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-300 mb-3">Offense Leaders</h2>
            <div className="space-y-4">
              {[
                { key: 'AVG', label: 'AVG', minAB: 3 },
                { key: 'H', label: 'Hits' },
                { key: 'HR', label: 'Home Runs' },
                { key: 'RBI', label: 'RBI' },
                { key: 'OBP', label: 'OBP', minPA: 3 },
                { key: 'SLG', label: 'SLG', minAB: 3 },
                { key: 'BB', label: 'Walks/HBP' },
              ].map((stat) => {
                const leaders = buildLeaders(stat.key as keyof AggregatedPlayerStats, stat.minAB || 0, stat.minPA || 0);
                return (
                  <div key={stat.key}>
                    <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
                    <ul className="text-sm text-gray-200 space-y-1">
                      {leaders.length === 0 && <li className="text-gray-500">No data.</li>}
                      {leaders.map((player, index) => (
                        <li key={`${stat.key}-${player.name}`}>
                          {index + 1}. {player.name} {player.team ? `(${player.team})` : ''} —{' '}
                          {stat.key === 'AVG' || stat.key === 'OBP' || stat.key === 'SLG'
                            ? player[stat.key as keyof AggregatedPlayerStats].toFixed(3)
                            : player[stat.key as keyof AggregatedPlayerStats]}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-300 mb-3">Defense & Pitching Leaders</h2>
            <div className="space-y-4">
              {[
                { key: 'SO_pitched', label: 'Pitching SO' },
                { key: 'BB_allowed', label: 'BB Allowed' },
                { key: 'H_allowed', label: 'Hits Allowed' },
                { key: 'PO', label: 'Putouts' },
                { key: 'A', label: 'Assists' },
                { key: 'E', label: 'Errors' },
              ].map((stat) => {
                const leaders = buildLeaders(stat.key as keyof AggregatedPlayerStats);
                return (
                  <div key={stat.key}>
                    <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
                    <ul className="text-sm text-gray-200 space-y-1">
                      {leaders.length === 0 && <li className="text-gray-500">No data.</li>}
                      {leaders.map((player, index) => (
                        <li key={`${stat.key}-${player.name}`}>
                          {index + 1}. {player.name} {player.team ? `(${player.team})` : ''} —{' '}
                          {player[stat.key as keyof AggregatedPlayerStats]}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManagerReportPage;
