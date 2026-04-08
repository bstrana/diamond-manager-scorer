import React from 'react';
import type { GameState, Player, PlateAppearanceResult } from '../types';
import { BaseballDiamondIcon } from './icons/BaseballDiamondIcon';

interface LowProfileScoreboardProps {
  gameState: GameState;
}

const getShortName = (name: string): string => {
  if (!name) return '---';
  if (name.length <= 3) return name.toUpperCase();
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const abbrev = words.map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3);
    if (abbrev.length >= 2) return abbrev;
  }
  return name.substring(0, 3).toUpperCase();
};

const getLastName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
};

const getActiveLineup = (roster: Player[]): Player[] => {
  const hasDH = roster.some(p => p.position.toUpperCase() === 'DH');
  return roster
    .filter(p => {
      const pos = p.position.toUpperCase();
      if (pos === 'BENCH' || p.battingOrder === 0) return false;
      if (hasDH && pos === 'P') return false;
      return true;
    })
    .sort((a, b) => a.battingOrder - b.battingOrder);
};

interface TeamRowProps {
  logoUrl?: string;
  shortName: string;
  score: number;
  color: string;
}

const TeamRow: React.FC<TeamRowProps> = ({ logoUrl, shortName, score, color }) => (
  <div
    className="flex items-center gap-2 px-3 py-2"
    style={{ background: `linear-gradient(to right, ${color}44 0%, rgba(8,10,18,0) 70%)` }}
  >
    <div className="w-7 h-7 shrink-0 rounded-sm overflow-hidden flex items-center justify-center"
         style={{ background: 'rgba(255,255,255,0.08)' }}>
      {logoUrl
        ? <img src={logoUrl} alt="" className="w-full h-full object-contain" />
        : <span className="text-sm font-black text-white/60">{shortName[0]}</span>
      }
    </div>
    <span className="text-xs font-extrabold tracking-wider uppercase w-8 leading-none text-white">
      {shortName}
    </span>
    <span className="text-3xl font-black tabular-nums leading-none w-7 text-right text-white">
      {score}
    </span>
  </div>
);

const Dot: React.FC<{ filled: boolean; filledColor: string }> = ({ filled, filledColor }) => (
  <div
    className="w-2 h-2 rounded-full"
    style={{ background: filled ? filledColor : 'rgba(255,255,255,0.15)' }}
  />
);

const PANEL_BORDER = 'rgba(255,255,255,0.08)';
const PANEL_BG     = 'rgba(8, 10, 18, 0.96)';
const BAR_BG       = 'rgba(255,255,255,0.04)';

const LowProfileScoreboard: React.FC<LowProfileScoreboardProps> = ({ gameState }) => {
  const {
    homeTeam, awayTeam,
    inning, isTopInning,
    outs, strikes, balls,
    bases, gameStatus,
    plateAppearances,
  } = gameState;

  const battingTeam  = isTopInning ? awayTeam  : homeTeam;
  const pitchingTeam = isTopInning ? homeTeam  : awayTeam;

  const activeLineup       = getActiveLineup(battingTeam.roster);
  const batterIndex        = isTopInning
    ? gameState.currentBatterIndex.away
    : gameState.currentBatterIndex.home;
  const currentBatter      = activeLineup[batterIndex] ?? null;
  const currentPitcher     = isTopInning
    ? gameState.currentPitcher.home
    : gameState.currentPitcher.away;

  // Batter game stat: hits / at-bats this game
  const getBatterStat = (batter: Player): string => {
    const pas = plateAppearances.filter(pa => pa.batter.id === batter.id);
    const ab  = pas.filter(pa => !['walk','HBP','IBB','sac_fly','sac_bunt'].includes(pa.result)).length;
    const h   = pas.filter(pa => ['single','double','triple','homerun'].includes(pa.result as PlateAppearanceResult)).length;
    return `${h}-${ab}`;
  };

  const isPlaying = gameStatus === 'playing';

  const Divider = () => <div className="w-px self-stretch" style={{ background: PANEL_BORDER }} />;

  return (
    <div
      className="inline-block overflow-hidden rounded font-sans shadow-2xl"
      style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
    >
      {/* ── Top bar: Pitcher ───────────────────────────── */}
      {isPlaying && currentPitcher && (
        <div
          className="flex items-center gap-2 px-3 py-1"
          style={{ background: BAR_BG, borderBottom: `1px solid ${PANEL_BORDER}` }}
        >
          <span className="text-sm font-bold text-white/90 leading-none ml-auto text-right">
            #{currentPitcher.number} {getLastName(currentPitcher.name)}
          </span>
          <span className="text-xs tabular-nums font-bold text-white/50 leading-none shrink-0">
            {currentPitcher.stats.pitchCount}<span className="text-white/25 font-normal"> pit</span>
          </span>
        </div>
      )}

      {/* ── Main scorebug row ──────────────────────────── */}
      <div className="flex items-stretch">
        {/* Teams & scores */}
        <div className="flex flex-col">
          <TeamRow
            logoUrl={awayTeam.logoUrl}
            shortName={getShortName(awayTeam.name)}
            score={awayTeam.score}
            color={awayTeam.color || '#888'}
          />
          <TeamRow
            logoUrl={homeTeam.logoUrl}
            shortName={getShortName(homeTeam.name)}
            score={homeTeam.score}
            color={homeTeam.color || '#888'}
          />
        </div>

        <Divider />

        {gameStatus === 'final' ? (
          <div className="flex items-center justify-center px-5">
            <span className="text-yellow-300 font-black text-sm tracking-widest uppercase">Final</span>
          </div>
        ) : (
          <>
            {/* Inning */}
            <div className="flex flex-col items-center justify-center px-3 gap-0">
              <span className="text-yellow-400 font-black leading-none" style={{ fontSize: 11 }}>
                {isTopInning ? '▲' : '▼'}
              </span>
              <span className="text-white text-2xl font-black tabular-nums leading-tight">{inning}</span>
            </div>

            <Divider />

            {/* Count: B-S numbers + O dots */}
            <div className="flex flex-col justify-center items-center gap-1.5 px-3 py-2">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-[10px] text-white/30 font-bold">B</span>
                <span className="text-xl font-black tabular-nums leading-none" style={{ color: '#4ade80' }}>{balls}</span>
                <span className="text-white/30 font-bold text-sm leading-none">-</span>
                <span className="text-xl font-black tabular-nums leading-none" style={{ color: '#f87171' }}>{strikes}</span>
                <span className="text-[10px] text-white/30 font-bold">S</span>
              </div>
              <div className="flex items-center gap-1">
                {[0,1].map(i => <Dot key={i} filled={i < outs} filledColor="#fbbf24" />)}
              </div>
            </div>

            <Divider />

            {/* Base diamond */}
            <div className="flex items-center justify-center px-2">
              <div className="w-16 h-16">
                <BaseballDiamondIcon
                  isFirstOccupied={!!bases.first}
                  isSecondOccupied={!!bases.second}
                  isThirdOccupied={!!bases.third}
                  baseSize={22}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar: Batter ─────────────────────────── */}
      {isPlaying && currentBatter && (
        <div
          className="flex items-center gap-2 px-3 py-1"
          style={{ background: BAR_BG, borderTop: `1px solid ${PANEL_BORDER}` }}
        >
          <span className="text-sm font-bold text-white/90 leading-none ml-auto text-right">
            #{currentBatter.number} {getLastName(currentBatter.name)}
          </span>
          <span className="text-xs tabular-nums font-bold text-white/50 leading-none shrink-0">
            {getBatterStat(currentBatter)}
          </span>
        </div>
      )}
    </div>
  );
};

export default LowProfileScoreboard;
