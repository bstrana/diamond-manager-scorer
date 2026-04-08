import React from 'react';
import type { GameState } from '../types';
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

interface TeamRowProps {
  logoUrl?: string;
  shortName: string;
  score: number;
  color: string;
  isBatting: boolean;
}

const TeamRow: React.FC<TeamRowProps> = ({ logoUrl, shortName, score, color, isBatting }) => (
  <div
    className="flex items-center gap-2 px-3 py-2"
    style={{ borderLeft: `4px solid ${color || '#ffffff'}` }}
  >
    {/* Logo */}
    <div className="w-7 h-7 shrink-0 rounded-sm overflow-hidden flex items-center justify-center"
         style={{ background: 'rgba(255,255,255,0.08)' }}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="w-full h-full object-contain" />
      ) : (
        <span className="text-sm font-black text-white/60">{shortName[0]}</span>
      )}
    </div>

    {/* Team abbreviation */}
    <span
      className="text-xs font-extrabold tracking-wider uppercase w-8 leading-none"
      style={{ color: isBatting ? '#ffffff' : 'rgba(255,255,255,0.55)' }}
    >
      {shortName}
    </span>

    {/* Score */}
    <span
      className="text-3xl font-black tabular-nums leading-none w-7 text-right"
      style={{ color: isBatting ? '#facc15' : '#ffffff' }}
    >
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

const LowProfileScoreboard: React.FC<LowProfileScoreboardProps> = ({ gameState }) => {
  const { homeTeam, awayTeam, inning, isTopInning, outs, strikes, balls, bases, gameStatus } = gameState;

  const awayShortName = getShortName(awayTeam.name);
  const homeShortName = getShortName(homeTeam.name);

  const Divider = () => <div className="w-px self-stretch bg-white/10" />;

  return (
    <div
      className="inline-flex items-stretch overflow-hidden rounded font-sans shadow-2xl"
      style={{ background: 'rgba(8, 10, 18, 0.96)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* ── Teams & scores ─────────────────────────────── */}
      <div className="flex flex-col divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <TeamRow
          logoUrl={awayTeam.logoUrl}
          shortName={awayShortName}
          score={awayTeam.score}
          color={awayTeam.color || '#888'}
          isBatting={isTopInning && gameStatus === 'playing'}
        />
        <TeamRow
          logoUrl={homeTeam.logoUrl}
          shortName={homeShortName}
          score={homeTeam.score}
          color={homeTeam.color || '#888'}
          isBatting={!isTopInning && gameStatus === 'playing'}
        />
      </div>

      <Divider />

      {gameStatus === 'final' ? (
        /* ── Final state ──────────────────────────────── */
        <div className="flex items-center justify-center px-5">
          <span className="text-yellow-300 font-black text-sm tracking-widest uppercase">Final</span>
        </div>
      ) : (
        <>
          {/* ── Inning ─────────────────────────────────── */}
          <div className="flex flex-col items-center justify-center px-3 gap-0">
            <span className="text-yellow-400 text-xs font-black leading-none" style={{ fontSize: 11 }}>
              {isTopInning ? '▲' : '▼'}
            </span>
            <span className="text-white text-2xl font-black tabular-nums leading-tight">{inning}</span>
          </div>

          <Divider />

          {/* ── Count dots (B / S / O) ─────────────────── */}
          <div className="flex flex-col justify-center gap-1.5 px-3 py-2">
            {/* Balls — 3 dots — green */}
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => <Dot key={i} filled={i < balls} filledColor="#4ade80" />)}
              <span className="text-[9px] text-white/30 ml-0.5 font-bold">B</span>
            </div>
            {/* Strikes — 2 dots — red */}
            <div className="flex items-center gap-1">
              {[0, 1].map(i => <Dot key={i} filled={i < strikes} filledColor="#f87171" />)}
              <span className="text-[9px] text-white/30 ml-0.5 font-bold">S</span>
            </div>
            {/* Outs — 2 dots — amber */}
            <div className="flex items-center gap-1">
              {[0, 1].map(i => <Dot key={i} filled={i < outs} filledColor="#fbbf24" />)}
              <span className="text-[9px] text-white/30 ml-0.5 font-bold">O</span>
            </div>
          </div>

          <Divider />

          {/* ── Base diamond ───────────────────────────── */}
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
  );
};

export default LowProfileScoreboard;
