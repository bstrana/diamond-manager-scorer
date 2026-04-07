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
    
    const statLine = `${hitsInGame.length} for ${atBatsInGame}`;
    
    return statLine;
  };

  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    if (gameState.gameStatus !== 'playing' || !gameStartTime) {
        setDuration('0:00');
        return;
    }

    const formatDuration = (startTime: number) => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000); // seconds
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
    <div className="flex items-center gap-x-2 sm:gap-x-4">
        <div className="w-10 h-10 shrink-0">
          {team.logoUrl && <img src={team.logoUrl} alt={`${team.name} logo`} className="h-10 w-10 object-contain"/>}
        </div>
        <span
          className="font-bold tracking-wider uppercase w-28 sm:w-40 truncate text-2xl sm:text-3xl"
          style={{
            borderLeft: `${isBatting ? '5px' : '3px'} solid ${team.color || '#ffffff'}`,
            paddingLeft: isBatting ? '12px' : '14px',
          }}
        >
          <span className="sm:hidden">{(team.name || '').slice(0, 3).toUpperCase()}</span>
          <span className="hidden sm:inline">{team.name}</span>
        </span>
        
        <div className="flex items-baseline gap-x-2 sm:gap-x-4">
             <div className="flex items-baseline">
                <span className="font-bold text-4xl text-yellow-300 w-10 text-center">{team.score}</span>
             </div>
             {scoreboardSettings.showHits && (
                <div className="hidden sm:flex items-baseline gap-2 text-xl">
                    <span className="text-gray-500 font-medium">H</span>
                    <span className="font-medium text-gray-200 w-6 text-center">{team.hits}</span>
                </div>
              )}
              {scoreboardSettings.showErrors && (
                <div className="hidden sm:flex items-baseline gap-2 text-xl">
                    <span className="text-gray-500 font-medium">E</span>
                    <span className="font-medium text-gray-200 w-6 text-center">{team.errors}</span>
                </div>
              )}
              {scoreboardSettings.showLOB && (
                <div className="hidden sm:flex items-baseline gap-2 text-xl">
                    <span className="text-gray-500 font-medium">LOB</span>
                    <span className="font-medium text-gray-200 w-6 text-center">{team.LOB}</span>
                </div>
              )}
        </div>
    </div>
  );

  return (
    <div className="bg-black/80 text-white p-4 sm:p-6 rounded-lg font-mono border-2 border-gray-600 shadow-2xl">
      {(competition || location) && (
        <div className="text-center pb-4 mb-4 border-b-2 border-gray-600">
            {competition && <p className="text-lg font-bold text-yellow-300">{competition}</p>}
            {location && <p className="text-sm text-gray-400">{location}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-around items-center w-full gap-4 sm:gap-x-8">
        <div className="space-y-3">
            <TeamScore team={awayTeam} isBatting={isTopInning} />
            <TeamScore team={homeTeam} isBatting={!isTopInning} />
        </div>
        
        {/* Base Runners & Inning */}
        <div className="flex justify-center items-center">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36">
            <BaseballDiamondIcon
              isFirstOccupied={!!bases.first}
              isSecondOccupied={!!bases.second}
              isThirdOccupied={!!bases.third}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {gameState.gameStatus === 'final' ? (
                <span className="font-bold text-2xl text-yellow-300">FINAL</span>
              ) : (
                <>
                  <div className="flex items-center space-x-1 text-2xl sm:text-3xl">
                    <span className="font-bold">{isTopInning ? '▲' : '▼'}</span>
                    <span className="font-bold text-4xl">{inning}</span>
                  </div>
                   {gameState.gameStatus === 'playing' && (
                      <div className="text-center mt-1 text-lg text-gray-200">
                          <span className="font-mono" aria-label="Game Duration">{duration}</span>
                      </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-4 items-center border-t-2 border-gray-600 pt-4">
        {/* At-Bat Info */}
        <div className="col-span-2 sm:col-span-1 flex flex-col justify-center text-center">
          {scoreboardSettings.showCurrentPitcher && currentPitcher && (
             <div className="mb-2 text-sm sm:text-base flex items-center justify-center gap-x-2">
                <div className="text-gray-400 uppercase text-xs">
                  <span className="border border-gray-500 rounded px-2 py-0.5">PITCHER</span>
                </div>
                <div className="font-bold text-lg">{`#${currentPitcher.number} ${currentPitcher.name} - P: ${currentPitcher.stats.pitchCount}`}</div>
            </div>
          )}
          
          {/* Count and Outs */}
          <div className="flex justify-around text-center my-2">
            <div className="flex flex-col items-center">
              <span className="font-bold text-4xl text-green-400">{balls}</span>
              <span className="font-bold text-gray-400 text-xs tracking-wider mt-1">BALLS</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-4xl text-red-400">{strikes}</span>
              <span className="font-bold text-gray-400 text-xs tracking-wider mt-1">STRIKES</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-4xl text-yellow-400">{outs}</span>
              <span className="font-bold text-gray-400 text-xs tracking-wider mt-1">OUTS</span>
            </div>
          </div>

          {scoreboardSettings.showCurrentBatter && currentBatter && (
            <div className="mt-2 text-sm sm:text-base flex items-center justify-center gap-x-2">
                <div className="text-gray-400 uppercase text-xs">
                  <span className="border border-gray-500 rounded px-2 py-0.5">BATTER</span>
                </div>
                <div className="font-bold text-lg">{`#${currentBatter.number} ${currentBatter.name} - ${getBatterStatline()}`}</div>
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