import React, { useMemo } from 'react';
import { useOverlayGameState } from '../hooks/useOverlayGameState';
import type { PlateAppearance } from '../types';
import { generateHitDescriptionText } from './HitDescriptionModal';

interface HalfInningGroup {
  inning: number;
  isTopInning: boolean;
  teamName: string;
  teamColor: string;
  pas: PlateAppearance[];
  runsScored: number;
}

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

const RESULT_CONFIG: Record<string, { badge: string; label: string; bg: string; text: string }> = {
  single:           { badge: '1B',  label: 'singles',                     bg: 'bg-green-700',   text: 'text-white' },
  double:           { badge: '2B',  label: 'doubles',                     bg: 'bg-green-600',   text: 'text-white' },
  triple:           { badge: '3B',  label: 'triples',                     bg: 'bg-green-500',   text: 'text-white' },
  homerun:          { badge: 'HR',  label: 'homers',                      bg: 'bg-yellow-400',  text: 'text-black' },
  walk:             { badge: 'BB',  label: 'walks',                       bg: 'bg-blue-600',    text: 'text-white' },
  IBB:              { badge: 'IBB', label: 'intentionally walked',        bg: 'bg-blue-700',    text: 'text-white' },
  HBP:              { badge: 'HBP', label: 'hit by pitch',                bg: 'bg-sky-500',     text: 'text-white' },
  strikeout:        { badge: 'K',   label: 'strikes out',                 bg: 'bg-red-600',     text: 'text-white' },
  flyout:           { badge: 'FO',  label: 'flies out',                   bg: 'bg-orange-600',  text: 'text-white' },
  groundout:        { badge: 'GO',  label: 'grounds out',                 bg: 'bg-orange-500',  text: 'text-white' },
  sac_fly:          { badge: 'SF',  label: 'hits a sacrifice fly',        bg: 'bg-indigo-500',  text: 'text-white' },
  sac_bunt:         { badge: 'SB',  label: 'sacrifice bunt',              bg: 'bg-indigo-600',  text: 'text-white' },
  fielders_choice:  { badge: 'FC',  label: "reaches on fielder's choice", bg: 'bg-teal-600',    text: 'text-white' },
  reached_on_error: { badge: 'ROE', label: 'reaches on error',            bg: 'bg-rose-600',    text: 'text-white' },
};

function describePA(pa: PlateAppearance): { badge: string; badgeBg: string; badgeText: string; main: string; meta: string } {
  const cfg = RESULT_CONFIG[pa.result] ?? { badge: pa.result.toUpperCase(), label: pa.result, bg: 'bg-gray-600', text: 'text-white' };
  const batter = formatName(pa.batter.name);
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

const GameStreamPage: React.FC = () => {
  const gameState = useOverlayGameState();

  const groups = useMemo((): HalfInningGroup[] => {
    const map = new Map<string, HalfInningGroup>();

    for (const pa of gameState.plateAppearances) {
      const inning = pa.inning ?? 1;
      const isTop = pa.isTopInning ?? true;
      const key = `${inning}-${isTop ? 'top' : 'bot'}`;

      if (!map.has(key)) {
        const team = isTop ? gameState.awayTeam : gameState.homeTeam;
        map.set(key, {
          inning,
          isTopInning: isTop,
          teamName: team.name,
          teamColor: team.color || '#888',
          pas: [],
          runsScored: 0,
        });
      }

      const group = map.get(key)!;
      group.pas.push(pa);
      const rbis: number = (pa as any).rbis ?? (pa as any).runnersBattedIn ?? 0;
      group.runsScored += rbis;
    }

    // Latest half-inning first; within same inning: bottom (isTop=false) is later
    return Array.from(map.values()).sort((a, b) => {
      if (b.inning !== a.inning) return b.inning - a.inning;
      return (a.isTopInning ? 1 : 0) - (b.isTopInning ? 1 : 0);
    });
  }, [gameState.plateAppearances, gameState.awayTeam, gameState.homeTeam]);

  const { homeTeam, awayTeam, gameStatus, inning, isTopInning, competition, location } = gameState;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* Sticky score header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {(competition || location) && (
            <p className="text-[11px] text-gray-500 text-center mb-1.5 tracking-wider uppercase">
              {[competition, location].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="flex items-center justify-between gap-4">
            {/* Away team */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {awayTeam.logoUrl && (
                <img src={awayTeam.logoUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider leading-none mb-0.5">{awayTeam.name}</p>
                <p className="text-3xl font-black tabular-nums leading-none text-white">{awayTeam.score}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col items-center shrink-0 px-2">
              {gameStatus === 'final' ? (
                <span className="text-yellow-400 font-black text-xs tracking-widest uppercase">Final</span>
              ) : gameStatus === 'playing' ? (
                <>
                  <span className="text-yellow-400 font-bold text-base leading-none">
                    {isTopInning ? '▲' : '▼'} {inning}
                  </span>
                  <span className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] text-green-400 font-medium">Live</span>
                  </span>
                </>
              ) : (
                <span className="text-gray-500 text-xs">Not started</span>
              )}
            </div>

            {/* Home team */}
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider leading-none mb-0.5">{homeTeam.name}</p>
                <p className="text-3xl font-black tabular-nums leading-none text-white">{homeTeam.score}</p>
              </div>
              {homeTeam.logoUrl && (
                <img src={homeTeam.logoUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">

        {groups.length === 0 && (
          <div className="text-center text-gray-600 py-16">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Play-by-play will appear here once scoring begins.</p>
          </div>
        )}

        {groups.map((group) => (
          <div
            key={`${group.inning}-${group.isTopInning}`}
            className="rounded-lg overflow-hidden"
            style={{ border: `1px solid ${group.teamColor}22` }}
          >
            {/* Half-inning header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: `linear-gradient(to right, ${group.teamColor}28 0%, transparent 75%)`,
                borderLeft: `3px solid ${group.teamColor}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-sm" style={{ color: group.teamColor }}>
                  {group.isTopInning ? '▲' : '▼'} {ordinal(group.inning)}
                </span>
                <span className="text-white font-semibold text-sm">{group.teamName}</span>
              </div>
              {group.runsScored > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/30">
                  +{group.runsScored} {group.runsScored === 1 ? 'run' : 'runs'}
                </span>
              )}
            </div>

            {/* Play-by-play rows — newest first within each half-inning */}
            <div className="bg-gray-900/60 divide-y divide-gray-800/40">
              {[...group.pas].reverse().map((pa, i) => {
                const { badge, badgeBg, badgeText, main, meta } = describePA(pa);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-800/30 transition-colors"
                  >
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 min-w-[28px] text-center ${badgeBg} ${badgeText}`}>
                      {badge}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug">{main}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{meta}</p>
                    </div>
                    <span className="text-xs text-gray-700 shrink-0 mt-0.5 font-mono">
                      #{pa.batter.number}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameStreamPage;
