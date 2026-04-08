import React, { useState, useEffect } from 'react';
import type { GameState, Team, PlateAppearanceResult, Player } from '../types';
import { BaseballDiamondIcon } from './icons/BaseballDiamondIcon';

interface ScoreboardProps {
  gameState: GameState;
}

const getActiveLineup = (roster: Player[]): Player[] => {
    const hasDH = roster.some(p => p.position.toUpperCase() === 'DH');
    const lineup = roster.filter(p => {
        const pos = p.position.toUpperCase();
        if (pos === 'BENCH' || p.battingOrder === 0) {
            return false;
        }
        if (hasDH && pos === 'P') {
            return false;
        }
        return true;
    });
    return lineup.sort((a, b) => a.battingOrder - b.battingOrder);
};

const Scoreboard: React.FC<ScoreboardProps> = ({ gameState }) => {
  const {
    homeTeam,
    awayTeam,
    inning,
    isTopInning,
    outs,
    strikes,
    balls,
    bases,
    competition,
    location,
    plateAppearances,
    gameStartTime,
    scoreboardSettings,
  } = gameState;

  const battingTeam = isTopInning ? awayTeam : homeTeam;
  const pitchingTeam = isTopInning ? homeTeam : awayTeam;
  const activeLineup = getActiveLineup(battingTeam.roster);

  const battingTeamBatterIndex = isTopInning ? gameState.currentBatterIndex.away : gameState.currentBatterIndex.home;
  const currentBatter = activeLineup[battingTeamBatterIndex];

  const onDeckBatterIndex = (battingTeamBatterIndex + 1) % activeLineup.length;
  const onDeckBatter = activeLineup[onDeckBatterIndex];
  const inTheHoleBatterIndex = (battingTeamBatterIndex + 2) % activeLineup.length;
  const inTheHoleBatter = activeLineup[inTheHoleBatterIndex];

  const currentPitcher = isTopInning ? gameState.currentPitcher.home : gameState.currentPitcher.away;

  const getBatterStatline = () => {
    if (!currentBatter) return '0 for 0';
    const batterPAs = plateAppearances.filter(pa => pa.batter.id === currentBatter.id);
    const atBatsInGame = batterPAs.filter(pa => !['walk', 'HBP', 'IBB', 'sac_fly'].includes(pa.result)).length;
    const hitsInGame = batterPAs.filter(pa => ['single', 'double', 'triple', 'homerun'].includes(pa.result as PlateAppearanceResult));
    return `${hitsInGame.length} for ${atBatsInGame}`;
  };

  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    if (gameState.gameStatus !== 'playing' || !gameStartTime) {
        setDuration('0:00');
        return;
    }
    const formatDuration = (startTime: number) => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };
    setDuration(formatDuration(gameStartTime));
    const intervalId = setInterval(() => {
        setDuration(formatDuration(gameStartTime));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [gameState.gameStatus, gameStartTime]);


  const TeamScore: React.FC<{ team: Team; isBatting: boolean }> = ({ team, isBatting }) => (
    <div className="flex items-center gap-x-1 sm:gap-x-4">
      <div className="w-6 h-6 sm:w-10 sm:h-10 shrink-0">
        {team.logoUrl && <img src={team.logoUrl} alt={`${team.name} logo`} className="h-6 w-6 sm:h-10 sm:w-10 object-contain"/>}
      </div>
      <span
        className="font-bold tracking-wider uppercase w-16 sm:w-40 truncate text-lg sm:text-3xl"
        style={{
          borderLeft: `${isBatting ? '4px' : '3px'} solid ${team.color || '#ffffff'}`,
          paddingLeft: isBatting ? '6px' : '7px',
        }}
      >
        <span className="sm:hidden">{(team.name || '').slice(0, 3).toUpperCase()}</span>
        <span className="hidden sm:inline">{team.name}</span>
      </span>

      <div className="flex items-baseline gap-x-1 sm:gap-x-4">
        <span className="font-bold text-2xl sm:text-4xl text-yellow-300 w-8 sm:w-10 text-center">{team.score}</span>
        {/* H / E / LOB — always visible; tiny on mobile, normal on desktop */}
        <div className="flex items-center gap-x-1 sm:gap-x-3">
          {scoreboardSettings.showHits && (
            <div className="flex items-baseline gap-0.5 sm:gap-2">
              <span className="text-gray-600 font-medium text-[10px] sm:text-xl">H</span>
              <span className="font-medium text-gray-400 text-[10px] sm:text-xl sm:text-gray-200 sm:w-6 text-center">{team.hits}</span>
            </div>
          )}
          {scoreboardSettings.showErrors && (
            <div className="flex items-baseline gap-0.5 sm:gap-2">
              <span className="text-gray-600 font-medium text-[10px] sm:text-xl">E</span>
              <span className="font-medium text-gray-400 text-[10px] sm:text-xl sm:text-gray-200 sm:w-6 text-center">{team.errors}</span>
            </div>
          )}
          {scoreboardSettings.showLOB && (
            <div className="flex items-baseline gap-0.5 sm:gap-2">
              <span className="text-gray-600 font-medium text-[10px] sm:text-xl">L</span>
              <span className="font-medium text-gray-400 text-[10px] sm:text-xl sm:text-gray-200 sm:w-6 text-center">{team.LOB}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-black/80 text-white p-4 sm:p-6 rounded-lg font-mono border-2 border-gray-600 shadow-2xl">
      {(competition || location) && (
        <div className="text-center pb-2 sm:pb-4 mb-2 sm:mb-4 border-b-2 border-gray-600">
            {competition && <p className="text-sm sm:text-lg font-bold text-yellow-300">{competition}</p>}
            {location && <p className="text-xs sm:text-sm text-gray-400">{location}</p>}
        </div>
      )}

      {/* Teams + Diamond: side-by-side on all screen sizes */}
      <div className="flex flex-row justify-between sm:justify-around items-center w-full gap-2 sm:gap-x-8">
        <div className="space-y-2 sm:space-y-3">
          <TeamScore team={awayTeam} isBatting={isTopInning} />
          <TeamScore team={homeTeam} isBatting={!isTopInning} />
        </div>

        {/* Base Runners & Inning */}
        <div className="flex justify-center items-center shrink-0">
          <div className="relative w-24 h-24 sm:w-36 sm:h-36">
            <BaseballDiamondIcon
              isFirstOccupied={!!bases.first}
              isSecondOccupied={!!bases.second}
              isThirdOccupied={!!bases.third}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {gameState.gameStatus === 'final' ? (
                <span className="font-bold text-xl sm:text-2xl text-yellow-300">
                  <span className="sm:hidden">F</span>
                  <span className="hidden sm:inline">FINAL</span>
                </span>
              ) : (
                <>
                  <div className="flex items-center space-x-0.5 sm:space-x-1">
                    <span className="font-bold text-base sm:text-3xl">{isTopInning ? '▲' : '▼'}</span>
                    <span className="font-bold text-2xl sm:text-4xl">{inning}</span>
                  </div>
                  {gameState.gameStatus === 'playing' && (
                    <div className="text-center mt-0.5 sm:mt-1 text-xs sm:text-lg text-gray-200">
                      <span className="font-mono">{duration}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pitcher / Count / Batter */}
      <div className="mt-2 sm:mt-6 grid grid-cols-2 gap-4 items-center border-t-2 border-gray-600 pt-2 sm:pt-4">
        <div className="col-span-2 sm:col-span-1 flex flex-col justify-center text-center">
          {scoreboardSettings.showCurrentPitcher && currentPitcher && (
             <div className="mb-1 sm:mb-2 flex items-center justify-center gap-x-2">
                <div className="text-gray-400 uppercase text-xs">
                  {/* P badge: team color border on mobile */}
                  <span
                    className="sm:hidden border rounded px-1.5 py-0.5"
                    style={{ borderColor: pitchingTeam.color || '#6b7280' }}
                  >P</span>
                  <span className="hidden sm:inline border border-gray-500 rounded px-2 py-0.5">PITCHER</span>
                </div>
                <div className="font-bold text-sm sm:text-lg">{`#${currentPitcher.number} ${currentPitcher.name} - P: ${currentPitcher.stats.pitchCount}`}</div>
            </div>
          )}

          {/* Count and Outs */}
          <div className="flex justify-around text-center my-1 sm:my-2">
            <div className="flex flex-col items-center">
              <span className="font-bold text-3xl sm:text-4xl text-green-400">{balls}</span>
              <span className="font-bold text-gray-400 text-xs tracking-wider mt-1">BALLS</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-3xl sm:text-4xl text-red-400">{strikes}</span>
              <span className="font-bold text-gray-400 text-xs tracking-wider mt-1">STRIKES</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-3xl sm:text-4xl text-yellow-400">{outs}</span>
              <span className="font-bold text-gray-400 text-xs tracking-wider mt-1">OUTS</span>
            </div>
          </div>

          {scoreboardSettings.showCurrentBatter && currentBatter && (
            <div className="mt-1 sm:mt-2 flex items-center justify-center gap-x-2">
                <div className="text-gray-400 uppercase text-xs">
                  {/* B badge: team color border on mobile */}
                  <span
                    className="sm:hidden border rounded px-1.5 py-0.5"
                    style={{ borderColor: battingTeam.color || '#6b7280' }}
                  >B</span>
                  <span className="hidden sm:inline border border-gray-500 rounded px-2 py-0.5">BATTER</span>
                </div>
                <div className="font-bold text-sm sm:text-lg">{`#${currentBatter.number} ${currentBatter.name} - ${getBatterStatline()}`}</div>
            </div>
          )}
        </div>

        {/* On Deck Info */}
        {scoreboardSettings.showOnDeck && (
            <div className="hidden sm:block col-span-1 text-center text-sm sm:text-base self-center">
              {onDeckBatter && (
                <div className="mb-4">
                  <div className="text-gray-400 uppercase text-xs">On Deck</div>
                  <div className="font-bold text-lg text-gray-300">{`#${onDeckBatter.number} ${onDeckBatter.name}`}</div>
                </div>
              )}
              {inTheHoleBatter && (
                 <div>
                  <div className="text-gray-400 uppercase text-xs">In the Hole</div>
                  <div className="font-bold text-lg text-gray-300">{`#${inTheHoleBatter.number} ${inTheHoleBatter.name}`}</div>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
