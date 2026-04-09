import React, { useMemo, useState } from 'react';
import { useOverlayGameState } from '../hooks/useOverlayGameState';
import type { PlateAppearance, Player, Team, Bases } from '../types';
import { generateHitDescriptionText } from './HitDescriptionModal';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]?.toUpperCase() ?? ''}. ${parts[parts.length - 1]}`;
};

const fmtAvg = (avg: number): string =>
  Number.isFinite(avg) && avg > 0 ? avg.toFixed(3).replace(/^0/, '') : '.000';

const fmtEra = (era: number): string =>
  Number.isFinite(era) ? era.toFixed(2) : '0.00';

const fmtIp = (ipOuts: number): string =>
  `${Math.floor(ipOuts / 3)}.${ipOuts % 3}`;

const getLineup = (roster: Player[]): Player[] =>
  roster
    .filter(p => p.battingOrder > 0 && p.position.toUpperCase() !== 'BENCH')
    .sort((a, b) => a.battingOrder - b.battingOrder);

// ─── PA result config ─────────────────────────────────────────────────────────

const RESULT_CONFIG: Record<string, { badge: string; label: string; bg: string; text: string }> = {
  single:           { badge: '1B',  label: 'singles',                     bg: 'bg-green-700',  text: 'text-white' },
  double:           { badge: '2B',  label: 'doubles',                     bg: 'bg-green-600',  text: 'text-white' },
  triple:           { badge: '3B',  label: 'triples',                     bg: 'bg-green-500',  text: 'text-white' },
  homerun:          { badge: 'HR',  label: 'homers',                      bg: 'bg-yellow-400', text: 'text-black' },
  walk:             { badge: 'BB',  label: 'walks',                       bg: 'bg-blue-600',   text: 'text-white' },
  IBB:              { badge: 'IBB', label: 'intentionally walked',        bg: 'bg-blue-700',   text: 'text-white' },
  HBP:              { badge: 'HBP', label: 'hit by pitch',                bg: 'bg-sky-500',    text: 'text-white' },
  strikeout:        { badge: 'K',   label: 'strikes out',                 bg: 'bg-red-600',    text: 'text-white' },
  flyout:           { badge: 'FO',  label: 'flies out',                   bg: 'bg-orange-600', text: 'text-white' },
  groundout:        { badge: 'GO',  label: 'grounds out',                 bg: 'bg-orange-500', text: 'text-white' },
  sac_fly:          { badge: 'SF',  label: 'hits a sacrifice fly',        bg: 'bg-indigo-500', text: 'text-white' },
  sac_bunt:         { badge: 'SB',  label: 'sacrifice bunt',              bg: 'bg-indigo-600', text: 'text-white' },
  fielders_choice:  { badge: 'FC',  label: "reaches on fielder's choice", bg: 'bg-teal-600',   text: 'text-white' },
  reached_on_error: { badge: 'ROE', label: 'reaches on error',            bg: 'bg-rose-600',   text: 'text-white' },
};

function describePA(pa: PlateAppearance): { badge: string; badgeBg: string; badgeText: string; main: string; meta: string } {
  const cfg = RESULT_CONFIG[pa.result] ?? { badge: pa.result.toUpperCase(), label: pa.result, bg: 'bg-gray-500', text: 'text-white' };
  const batter  = formatName(pa.batter.name);
  const pitcher = formatName(pa.pitcher.name);

  let main = `${batter} ${cfg.label}`;

  if (pa.hitDescription && ['single', 'double', 'triple', 'homerun'].includes(pa.result)) {
    const hitText = generateHitDescriptionText(pa.hitDescription);
    if (hitText) main += ` — ${hitText.charAt(0).toLowerCase()}${hitText.slice(1)}`;
  }

  const rbis: number = (pa as any).rbis ?? (pa as any).runnersBattedIn ?? 0;
  if (rbis > 0) main += `  ·  ${rbis} RBI`;

  const metaParts: string[] = [`vs ${pitcher}`];
  if (pa.defensivePlays?.putoutBy) metaParts.push(`out: ${formatName(pa.defensivePlays.putoutBy.name)}`);
  if (pa.defensivePlays?.errorBy)  metaParts.push(`error: ${formatName(pa.defensivePlays.errorBy.name)}`);
  if (pa.pitchSequence)             metaParts.push(pa.pitchSequence);

  return { badge: cfg.badge, badgeBg: cfg.bg, badgeText: cfg.text, main, meta: metaParts.join('  ·  ') };
}

// ─── Mini diamond (light-theme colours) ──────────────────────────────────────

const MiniDiamond: React.FC<{ bases: Bases }> = ({ bases }) => (
  <svg viewBox="-15 -15 90 90" className="w-full h-full" style={{ display: 'block' }}>
    {/* 2nd */}
    <rect x="19" y="1" width="22" height="22" transform="rotate(45 30 12)"
      fill={bases.second ? '#f59e0b' : 'rgba(0,0,0,0.1)'} stroke="rgba(0,0,0,0.25)" strokeWidth="0.9" />
    {/* 3rd */}
    <rect x="1" y="33" width="22" height="22" transform="rotate(45 12 44)"
      fill={bases.third  ? '#f59e0b' : 'rgba(0,0,0,0.1)'} stroke="rgba(0,0,0,0.25)" strokeWidth="0.9" />
    {/* 1st */}
    <rect x="37" y="33" width="22" height="22" transform="rotate(45 48 44)"
      fill={bases.first  ? '#f59e0b' : 'rgba(0,0,0,0.1)'} stroke="rgba(0,0,0,0.25)" strokeWidth="0.9" />
  </svg>
);

// ─── Roster / lineup icon ─────────────────────────────────────────────────────

const RosterIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

// ─── Lineup modal ─────────────────────────────────────────────────────────────

interface LineupModalProps {
  team: Team;
  label: 'Away' | 'Home';
  onClose: () => void;
}

const LineupModal: React.FC<LineupModalProps> = ({ team, label, onClose }) => {
  const lineup = getLineup(team.roster);
  const pitchers = team.roster
    .filter(p => p.position.toUpperCase() === 'P' || p.stats.pitchCount > 0 || p.stats.IPOuts > 0)
    .sort((a, b) => b.stats.IPOuts - a.stats.IPOuts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: team.color || '#374151' }}
        >
          <div className="flex items-center gap-2.5">
            {team.logoUrl && (
              <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain" />
            )}
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider leading-none">{label}</p>
              <p className="text-base font-black text-white leading-tight">{team.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* ── Batting order ── */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Batting Order</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-1.5 pl-4 pr-1 text-left font-semibold w-6">#</th>
                <th className="pb-1.5 px-1 text-left font-semibold">Name</th>
                <th className="pb-1.5 px-1 text-center font-semibold w-9">Pos</th>
                <th className="pb-1.5 px-1 text-center font-semibold w-12">AVG</th>
                <th className="pb-1.5 px-1 text-center font-semibold w-9">PA</th>
                <th className="pb-1.5 px-1 text-center font-semibold w-8">H</th>
                <th className="pb-1.5 px-1 text-center font-semibold w-9">HR</th>
                <th className="pb-1.5 px-1 text-center font-semibold w-10">RBI</th>
                <th className="pb-1.5 pl-1 pr-4 text-center font-semibold w-9">SB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineup.map((p, i) => (
                <tr key={p.id} className="hover:bg-amber-50/60 transition-colors">
                  <td className="py-1.5 pl-4 pr-1 text-gray-400 text-xs tabular-nums">{i + 1}</td>
                  <td className="py-1.5 px-1">
                    <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                    <span className="text-gray-400 text-xs ml-1">#{p.number}</span>
                  </td>
                  <td className="py-1.5 px-1 text-center text-xs text-gray-500 font-medium">{p.position}</td>
                  <td className="py-1.5 px-1 text-center font-mono text-xs text-gray-700">{fmtAvg(p.stats.AVG)}</td>
                  <td className="py-1.5 px-1 text-center text-xs text-gray-700">{p.stats.PA}</td>
                  <td className="py-1.5 px-1 text-center text-xs text-gray-700">{p.stats.H}</td>
                  <td className="py-1.5 px-1 text-center text-xs text-gray-700">{p.stats.HR}</td>
                  <td className="py-1.5 px-1 text-center text-xs text-gray-700">{p.stats.RBI}</td>
                  <td className="py-1.5 pl-1 pr-4 text-center text-xs text-gray-700">{p.stats.SB}</td>
                </tr>
              ))}
              {lineup.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 text-xs">No lineup set</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Pitchers ── */}
          {pitchers.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1 border-t border-gray-100 mt-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pitchers</p>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-1.5 pl-4 pr-1 text-left font-semibold">Name</th>
                    <th className="pb-1.5 px-1 text-center font-semibold w-12">IP</th>
                    <th className="pb-1.5 px-1 text-center font-semibold w-12">ERA</th>
                    <th className="pb-1.5 px-1 text-center font-semibold w-10">PC</th>
                    <th className="pb-1.5 px-1 text-center font-semibold w-9">K</th>
                    <th className="pb-1.5 pl-1 pr-4 text-center font-semibold w-9">BB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pitchers.map(p => (
                    <tr key={p.id} className="hover:bg-amber-50/60 transition-colors">
                      <td className="py-1.5 pl-4 pr-1">
                        <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                        <span className="text-gray-400 text-xs ml-1">#{p.number}</span>
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono text-xs text-gray-700">{fmtIp(p.stats.IPOuts)}</td>
                      <td className="py-1.5 px-1 text-center font-mono text-xs text-gray-700">{fmtEra(p.stats.ERA)}</td>
                      <td className="py-1.5 px-1 text-center text-xs text-gray-700">{p.stats.pitchCount}</td>
                      <td className="py-1.5 px-1 text-center text-xs text-gray-700">{p.stats.SO_pitched}</td>
                      <td className="py-1.5 pl-1 pr-4 text-center text-xs text-gray-700">{p.stats.BB_allowed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Half-inning group ────────────────────────────────────────────────────────

interface HalfInningGroup {
  inning: number;
  isTopInning: boolean;
  teamName: string;
  teamColor: string;
  pas: PlateAppearance[];
  runsScored: number;
}

// ─── Main page component ──────────────────────────────────────────────────────

const GameStreamPage: React.FC = () => {
  const gameState = useOverlayGameState();
  const [rosterModal, setRosterModal] = useState<'away' | 'home' | null>(null);

  const {
    homeTeam, awayTeam, gameStatus, inning, isTopInning,
    competition, location, bases, outs, balls, strikes,
    currentPitcher, currentBatterIndex,
  } = gameState;

  const isPlaying = gameStatus === 'playing';

  // Batting team lineup + current/on-deck batter
  const awayLineup = useMemo(() => getLineup(awayTeam.roster), [awayTeam]);
  const homeLineup = useMemo(() => getLineup(homeTeam.roster), [homeTeam]);
  const activeLineup  = isTopInning ? awayLineup : homeLineup;
  const batterIdx     = isTopInning ? currentBatterIndex.away : currentBatterIndex.home;
  const currentBatter = activeLineup.length > 0 ? activeLineup[batterIdx % activeLineup.length] : null;
  const onDeckBatter  = activeLineup.length > 1  ? activeLineup[(batterIdx + 1) % activeLineup.length] : null;
  const pitcher       = isTopInning ? currentPitcher.home : currentPitcher.away;

  // Play-by-play groups
  const groups = useMemo((): HalfInningGroup[] => {
    const map = new Map<string, HalfInningGroup>();

    for (const pa of gameState.plateAppearances) {
      const ing   = pa.inning ?? 1;
      const isTop = pa.isTopInning ?? true;
      const key   = `${ing}-${isTop ? 'top' : 'bot'}`;

      if (!map.has(key)) {
        const team = isTop ? awayTeam : homeTeam;
        map.set(key, { inning: ing, isTopInning: isTop, teamName: team.name, teamColor: team.color || '#888', pas: [], runsScored: 0 });
      }

      const group = map.get(key)!;
      group.pas.push(pa);
      const rbis: number = (pa as any).rbis ?? (pa as any).runnersBattedIn ?? 0;
      group.runsScored += rbis;
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.inning !== a.inning) return b.inning - a.inning;
      return (a.isTopInning ? 1 : 0) - (b.isTopInning ? 1 : 0);
    });
  }, [gameState.plateAppearances, awayTeam, homeTeam]);

  return (
    <div className="min-h-screen bg-amber-50 text-gray-900 font-sans">

      {/* ── Sticky top area ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20">

        {/* Score header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-3 py-2.5">
            {(competition || location) && (
              <p className="text-[10px] text-gray-400 text-center mb-1.5 tracking-wider uppercase">
                {[competition, location].filter(Boolean).join(' · ')}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">

              {/* Away team */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <button
                  onClick={() => setRosterModal('away')}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  title="Away lineup"
                >
                  <RosterIcon />
                </button>
                {awayTeam.logoUrl && (
                  <img src={awayTeam.logoUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-0.5 truncate">{awayTeam.name}</p>
                  <p className="text-3xl font-black tabular-nums leading-none text-gray-900">{awayTeam.score}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col items-center shrink-0 px-1">
                {gameStatus === 'final' ? (
                  <span className="text-amber-600 font-black text-xs tracking-widest uppercase">Final</span>
                ) : isPlaying ? (
                  <>
                    <span className="text-amber-600 font-bold text-base leading-none">
                      {isTopInning ? '▲' : '▼'} {inning}
                    </span>
                    <span className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-green-600 font-semibold">Live</span>
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">Not started</span>
                )}
              </div>

              {/* Home team */}
              <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                <div className="min-w-0 text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-0.5 truncate">{homeTeam.name}</p>
                  <p className="text-3xl font-black tabular-nums leading-none text-gray-900">{homeTeam.score}</p>
                </div>
                {homeTeam.logoUrl && (
                  <img src={homeTeam.logoUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
                )}
                <button
                  onClick={() => setRosterModal('home')}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  title="Home lineup"
                >
                  <RosterIcon />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Live game strip */}
        {isPlaying && (
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-2xl mx-auto px-4 py-2 grid grid-cols-3 gap-3 items-center">

              {/* Left: Pitching */}
              <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pitching</p>
                {pitcher?.name ? (
                  <>
                    <p className="text-xs font-bold text-gray-900 truncate leading-snug">
                      {formatName(pitcher.name)}
                      <span className="text-gray-400 font-normal ml-1">#{pitcher.number}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 leading-snug tabular-nums">
                      PC&nbsp;{pitcher.stats?.pitchCount ?? 0}
                      <span className="mx-1 text-gray-300">·</span>
                      {pitcher.stats?.strikesThrown ?? 0}S&nbsp;{pitcher.stats?.ballsThrown ?? 0}B
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">—</p>
                )}
              </div>

              {/* Center: B·S·O + diamond + outs */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2.5 text-[11px] font-bold tabular-nums">
                  <span><span className="text-green-700">B</span> {balls}</span>
                  <span><span className="text-red-700">S</span> {strikes}</span>
                  <span><span className="text-gray-600">O</span> {outs}</span>
                </div>
                <div className="w-10 h-10">
                  <MiniDiamond bases={bases} />
                </div>
                <div className="flex gap-1.5">
                  {[0, 1].map(i => (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                        i < outs
                          ? 'bg-red-500 border-red-500'
                          : 'bg-transparent border-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Batting */}
              <div className="min-w-0 text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Batting</p>
                {currentBatter ? (
                  <>
                    <p className="text-xs font-bold text-gray-900 truncate leading-snug">
                      {formatName(currentBatter.name)}
                      <span className="text-gray-400 font-normal ml-1">#{currentBatter.number}</span>
                    </p>
                    {onDeckBatter && (
                      <p className="text-[10px] text-gray-500 truncate leading-snug">
                        On deck: {formatName(onDeckBatter.name)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">—</p>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── Play-by-play timeline ─────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">

        {groups.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Play-by-play will appear here once scoring begins.</p>
          </div>
        )}

        {groups.map((group) => (
          <div
            key={`${group.inning}-${group.isTopInning}`}
            className="rounded-xl overflow-hidden shadow-sm bg-white"
            style={{ border: `1px solid ${group.teamColor}33` }}
          >
            {/* Half-inning header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: `linear-gradient(to right, ${group.teamColor}1a 0%, transparent 70%)`,
                borderLeft: `3px solid ${group.teamColor}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-sm" style={{ color: group.teamColor }}>
                  {group.isTopInning ? '▲' : '▼'} {ordinal(group.inning)}
                </span>
                <span className="text-gray-800 font-semibold text-sm">{group.teamName}</span>
              </div>
              {group.runsScored > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                  +{group.runsScored} {group.runsScored === 1 ? 'run' : 'runs'}
                </span>
              )}
            </div>

            {/* PA rows */}
            <div className="divide-y divide-gray-100">
              {[...group.pas].reverse().map((pa, i) => {
                const { badge, badgeBg, badgeText, main, meta } = describePA(pa);
                return (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 hover:bg-amber-50/50 transition-colors">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 min-w-[28px] text-center ${badgeBg} ${badgeText}`}>
                      {badge}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 leading-snug">{main}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{meta}</p>
                    </div>
                    <span className="text-xs text-gray-300 shrink-0 mt-0.5 font-mono">#{pa.batter.number}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Roster modals ─────────────────────────────────────────────────── */}
      {rosterModal === 'away' && (
        <LineupModal team={awayTeam} label="Away" onClose={() => setRosterModal(null)} />
      )}
      {rosterModal === 'home' && (
        <LineupModal team={homeTeam} label="Home" onClose={() => setRosterModal(null)} />
      )}

    </div>
  );
};

export default GameStreamPage;
