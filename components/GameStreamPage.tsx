import React, { useMemo, useState, useEffect } from 'react';
import { useOverlayGameState } from '../hooks/useOverlayGameState';
import type { PlateAppearance, Player, Team, Bases, GameEvent, GameEventType } from '../types';
import { generateHitDescriptionText } from './HitDescriptionModal';

// ─── Game duration ────────────────────────────────────────────────────────────

const fmtDuration = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const useGameDuration = (startTime?: number, endTime?: number): string => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startTime || endTime) return; // stopped — no need to tick
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startTime, endTime]);
  if (!startTime) return '';
  return fmtDuration((endTime ?? now) - startTime);
};

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

function buildDefensiveNotation(plays: PlateAppearance['defensivePlays']): string {
  if (!plays) return '';
  const parts: string[] = [];
  if (plays.assistBy?.length) {
    plays.assistBy.forEach(p => parts.push(p.position.toUpperCase()));
  }
  if (plays.putoutBy) parts.push(plays.putoutBy.position.toUpperCase());
  return parts.length ? `[${parts.join('-')}]` : '';
}

function describePA(pa: PlateAppearance): { badge: string; badgeBg: string; badgeText: string; main: string; meta: string } {
  const cfg = RESULT_CONFIG[pa.result] ?? { badge: pa.result.toUpperCase(), label: pa.result, bg: 'bg-gray-500', text: 'text-white' };
  const batter  = formatName(pa.batter.name);
  const pitcher = formatName(pa.pitcher.name);

  let main = `${batter} ${cfg.label}`;

  if (pa.hitDescription && ['single', 'double', 'triple', 'homerun'].includes(pa.result)) {
    const hitText = generateHitDescriptionText(pa.hitDescription);
    if (hitText) main += ` — ${hitText.charAt(0).toLowerCase()}${hitText.slice(1)}`;
  }

  const notation = buildDefensiveNotation(pa.defensivePlays);
  if (notation) main += `  ${notation}`;

  const rbis: number = (pa as any).rbis ?? (pa as any).runnersBattedIn ?? 0;
  if (rbis > 0) main += `  ·  ${rbis} RBI`;

  const metaParts: string[] = [`vs ${pitcher}`];
  if (pa.defensivePlays?.errorBy) metaParts.push(`E: ${pa.defensivePlays.errorBy.position.toUpperCase()}`);
  if (pa.pitchSequence)           metaParts.push(pa.pitchSequence.toUpperCase());

  return { badge: cfg.badge, badgeBg: cfg.bg, badgeText: cfg.text, main, meta: metaParts.join('  ·  ') };
}

// ─── Game event description ───────────────────────────────────────────────────

const EVENT_CONFIG: Record<GameEventType, { badge: string; bg: string; text: string }> = {
  stolen_base:      { badge: 'SB',  bg: 'bg-emerald-600', text: 'text-white' },
  caught_stealing:  { badge: 'CS',  bg: 'bg-rose-600',    text: 'text-white' },
  runner_out:       { badge: 'OUT', bg: 'bg-orange-600',  text: 'text-white' },
  balk:             { badge: 'BLK', bg: 'bg-purple-600',  text: 'text-white' },
  advance_on_error: { badge: 'AOE', bg: 'bg-rose-500',    text: 'text-white' },
  runner_advance:   { badge: 'ADV', bg: 'bg-sky-600',     text: 'text-white' },
  pinch_runner:     { badge: 'PR',  bg: 'bg-indigo-500',  text: 'text-white' },
};

const BASE_LABEL: Record<string, string> = { first: '1st', second: '2nd', third: '3rd', home: 'home' };

function describeGameEvent(e: GameEvent): { badge: string; badgeBg: string; badgeText: string; main: string } {
  const cfg = EVENT_CONFIG[e.type];
  const runner   = e.runner   ? formatName(e.runner.name)   : 'Runner';
  const pitcher  = e.pitcher  ? formatName(e.pitcher.name)  : 'Pitcher';
  const inRunner = e.inRunner ? formatName(e.inRunner.name) : '?';
  const outRunner= e.outRunner? formatName(e.outRunner.name): '?';

  let main: string;
  switch (e.type) {
    case 'stolen_base':
      main = `${runner} steals ${e.toBase ? BASE_LABEL[e.toBase] : 'base'}`;
      break;
    case 'caught_stealing':
      main = `${runner} caught stealing ${e.toBase ? BASE_LABEL[e.toBase] : 'base'}`;
      break;
    case 'runner_out':
      main = `${runner} thrown out on the bases`;
      break;
    case 'balk':
      main = `Balk — ${pitcher}. Runners advance.`;
      break;
    case 'advance_on_error':
      main = `${runner} advances on error (${e.fromBase ? BASE_LABEL[e.fromBase] : '?'} → ${e.toBase ? BASE_LABEL[e.toBase] : '?'})`;
      break;
    case 'runner_advance':
      main = `${runner} advances (${e.fromBase ? BASE_LABEL[e.fromBase] : '?'} → ${e.toBase ? BASE_LABEL[e.toBase] : '?'})`;
      break;
    case 'pinch_runner':
      main = `Pinch runner: ${inRunner} for ${outRunner}`;
      break;
    default:
      main = e.type;
  }

  return { badge: cfg.badge, badgeBg: cfg.bg, badgeText: cfg.text, main };
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

// ─── Line score ──────────────────────────────────────────────────────────────

interface LineScoreProps {
  awayTeam: Team;
  homeTeam: Team;
  currentInning: number;
  isTopInning: boolean;
  gameStatus: 'setup' | 'playing' | 'final';
  halfInningsWithData: Set<string>; // e.g. "3-top", "5-bot"
}

const LineScore: React.FC<LineScoreProps> = ({
  awayTeam, homeTeam, currentInning, isTopInning, gameStatus, halfInningsWithData,
}) => {
  const awayRuns = awayTeam.runsByInning ?? [];
  const homeRuns = homeTeam.runsByInning ?? [];
  const totalInnings = Math.max(9, awayRuns.length, homeRuns.length,
    gameStatus !== 'setup' ? currentInning : 1);
  const innings = Array.from({ length: totalInnings }, (_, i) => i + 1);
  const isFinal = gameStatus === 'final';

  // "x" in home's last cell when they won and didn't need to bat
  const homeDidntBat = isFinal && homeTeam.score > awayTeam.score &&
    homeRuns.length < awayRuns.length;

  const scrollTo = (ing: number, isTop: boolean) => {
    const el = document.getElementById(`inning-${ing}-${isTop ? 'top' : 'bot'}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const runCell = (
    runs: number | undefined,
    isActive: boolean,
    hasData: boolean,
    isXCell: boolean,
    onClick: () => void,
  ) => {
    const base = 'text-center tabular-nums min-w-[1.75rem] px-1 py-1.5 text-xs leading-none select-none';
    const active = isActive ? 'font-black text-amber-700' : 'font-medium text-gray-700';
    const link = hasData ? 'cursor-pointer hover:bg-amber-100 hover:text-amber-900 rounded transition-colors' : '';
    return (
      <td key={undefined} className={`${base} ${active} ${link} ${isActive ? 'bg-amber-50' : ''}`}
        onClick={hasData ? onClick : undefined}
      >
        {isXCell ? <span className="text-gray-400 font-normal">x</span>
          : runs !== undefined ? runs
          : isActive ? <span className="text-gray-400">·</span>
          : ''}
      </td>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-3 pb-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {/* Team name col */}
                <th className="sticky left-0 bg-white z-10 text-left pl-3 pr-2 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[4.5rem]" />
                {/* Inning numbers */}
                {innings.map(i => (
                  <th key={i} className={`text-center min-w-[1.75rem] px-1 py-1.5 text-[10px] font-bold ${
                    i === currentInning && gameStatus === 'playing' ? 'text-amber-600' : 'text-gray-400'
                  }`}>{i}</th>
                ))}
                {/* Totals */}
                <th className="text-center px-2 py-1.5 text-[10px] font-black text-gray-500 border-l border-gray-200 min-w-[1.75rem]">R</th>
                <th className="text-center px-2 py-1.5 text-[10px] font-black text-gray-400 min-w-[1.75rem]">H</th>
                <th className="text-center pl-2 pr-3 py-1.5 text-[10px] font-black text-gray-400 min-w-[1.75rem]">E</th>
              </tr>
            </thead>
            <tbody>
              {/* Away */}
              <tr className="border-b border-gray-100">
                <td className="sticky left-0 bg-white z-10 pl-3 pr-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {awayTeam.logoUrl && <img src={awayTeam.logoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />}
                    <span className="text-xs font-black text-gray-800 truncate" style={{ maxWidth: '3rem' }}>
                      {awayTeam.name.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                </td>
                {innings.map(i => runCell(
                  awayRuns[i - 1],
                  i === currentInning && isTopInning && gameStatus === 'playing',
                  halfInningsWithData.has(`${i}-top`),
                  false,
                  () => scrollTo(i, true),
                ))}
                <td className="text-center px-2 py-1.5 text-xs font-black text-gray-900 border-l border-gray-200">{awayTeam.score}</td>
                <td className="text-center px-2 py-1.5 text-xs font-medium text-gray-600">{awayTeam.hits}</td>
                <td className="text-center pl-2 pr-3 py-1.5 text-xs font-medium text-gray-600">{awayTeam.errors}</td>
              </tr>
              {/* Home */}
              <tr>
                <td className="sticky left-0 bg-white z-10 pl-3 pr-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {homeTeam.logoUrl && <img src={homeTeam.logoUrl} alt="" className="w-4 h-4 object-contain shrink-0" />}
                    <span className="text-xs font-black text-gray-800 truncate" style={{ maxWidth: '3rem' }}>
                      {homeTeam.name.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                </td>
                {innings.map(i => runCell(
                  homeRuns[i - 1],
                  i === currentInning && !isTopInning && gameStatus === 'playing',
                  halfInningsWithData.has(`${i}-bot`),
                  homeDidntBat && i === awayRuns.length,
                  () => scrollTo(i, false),
                ))}
                <td className="text-center px-2 py-1.5 text-xs font-black text-gray-900 border-l border-gray-200">{homeTeam.score}</td>
                <td className="text-center px-2 py-1.5 text-xs font-medium text-gray-600">{homeTeam.hits}</td>
                <td className="text-center pl-2 pr-3 py-1.5 text-xs font-medium text-gray-600">{homeTeam.errors}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Half-inning group ────────────────────────────────────────────────────────

type StreamItem =
  | { kind: 'pa';    pa: PlateAppearance }
  | { kind: 'event'; event: GameEvent };

interface HalfInningGroup {
  inning: number;
  isTopInning: boolean;
  teamName: string;
  teamColor: string;
  items: StreamItem[];
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
  const duration = useGameDuration(gameState.gameStartTime, gameState.gameEndTime);

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

    const getOrCreate = (ing: number, isTop: boolean): HalfInningGroup => {
      const key = `${ing}-${isTop ? 'top' : 'bot'}`;
      if (!map.has(key)) {
        const team = isTop ? awayTeam : homeTeam;
        map.set(key, { inning: ing, isTopInning: isTop, teamName: team.name, teamColor: team.color || '#888', items: [], runsScored: 0 });
      }
      return map.get(key)!;
    };

    for (const pa of gameState.plateAppearances) {
      const group = getOrCreate(pa.inning ?? 1, pa.isTopInning ?? true);
      group.items.push({ kind: 'pa', pa });
      const rbis: number = (pa as any).rbis ?? (pa as any).runnersBattedIn ?? 0;
      group.runsScored += rbis;
    }

    for (const event of (gameState.gameEvents ?? [])) {
      const group = getOrCreate(event.inning, event.isTopInning);
      group.items.push({ kind: 'event', event });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.inning !== a.inning) return b.inning - a.inning;
      return (a.isTopInning ? 1 : 0) - (b.isTopInning ? 1 : 0);
    });
  }, [gameState.plateAppearances, gameState.gameEvents, awayTeam, homeTeam]);

  const halfInningsWithData = useMemo(
    () => new Set(groups.map(g => `${g.inning}-${g.isTopInning ? 'top' : 'bot'}`)),
    [groups],
  );

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
                    {duration && (
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5">{duration}</span>
                    )}
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

      {/* ── Line score ───────────────────────────────────────────────────── */}
      {gameStatus !== 'setup' && (
        <div className="pt-3">
          <LineScore
            awayTeam={awayTeam}
            homeTeam={homeTeam}
            currentInning={inning}
            isTopInning={isTopInning}
            gameStatus={gameStatus}
            halfInningsWithData={halfInningsWithData}
          />
        </div>
      )}

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
            id={`inning-${group.inning}-${group.isTopInning ? 'top' : 'bot'}`}
            className="rounded-xl overflow-hidden shadow-sm bg-white"
            style={{ border: `1px solid ${group.teamColor}33`, scrollMarginTop: '10rem' }}
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

            {/* Stream rows (PAs + game events) */}
            <div className="divide-y divide-gray-100">
              {[...group.items].reverse().map((item, i) => {
                if (item.kind === 'pa') {
                  const { badge, badgeBg, badgeText, main, meta } = describePA(item.pa);
                  return (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 hover:bg-amber-50/50 transition-colors">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 min-w-[28px] text-center ${badgeBg} ${badgeText}`}>
                        {badge}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 leading-snug">{main}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{meta}</p>
                      </div>
                      <span className="text-xs text-gray-300 shrink-0 mt-0.5 font-mono">#{item.pa.batter.number}</span>
                    </div>
                  );
                } else {
                  const { badge, badgeBg, badgeText, main } = describeGameEvent(item.event);
                  return (
                    <div key={i} className="flex items-start gap-3 px-3 py-2 hover:bg-amber-50/50 transition-colors">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 min-w-[28px] text-center ${badgeBg} ${badgeText}`}>
                        {badge}
                      </span>
                      <p className="text-sm text-gray-700 leading-snug flex-1 min-w-0">{main}</p>
                    </div>
                  );
                }
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
