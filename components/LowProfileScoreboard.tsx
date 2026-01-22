import React from 'react';
import type { GameState, Team } from '../types';
import { BaseballDiamondIcon } from './icons/BaseballDiamondIcon';

interface LowProfileScoreboardProps {
  gameState: GameState;
}

// Helper to get shortened team name (first 3-4 letters or abbreviation)
const getShortTeamName = (teamName: string): string => {
  if (!teamName) return '';
  
  // If name is already short (3 chars or less), return as-is
  if (teamName.length <= 3) return teamName.toUpperCase();
  
  // Try to extract abbreviation (e.g., "Chicago Cubs" -> "CHC")
  const words = teamName.split(' ');
  if (words.length > 1) {
    // Take first letter of each word, max 3 letters
    const abbrev = words.map(w => w[0]?.toUpperCase() || '').join('').slice(0, 3);
    if (abbrev.length >= 2) return abbrev;
  }
  
  // Otherwise, take first 3-4 characters
  return teamName.substring(0, 4).toUpperCase();
};

const LowProfileScoreboard: React.FC<LowProfileScoreboardProps> = ({ gameState }) => {
  const { 
    homeTeam, 
    awayTeam, 
    inning, 
    isTopInning, 
    outs, 
    strikes, 
    balls, 
    bases,
    gameStatus,
  } = gameState;

  const awayShortName = getShortTeamName(awayTeam.name);
  const homeShortName = getShortTeamName(homeTeam.name);

  // Format count as "B-S" (e.g., "0-0", "2-1")
  const count = `${balls}-${strikes}`;

  return (
    <div className="bg-transparent text-white font-sans max-w-[320px]">
      <div className="flex items-center gap-2">
        {/* Teams Stacked Vertically - Left aligned */}
        <div className="flex flex-col gap-1.5">
          {/* Away Team */}
          <div className="flex items-center gap-1.5">
            {/* Logo - square with white background */}
            <div className="w-8 h-8 shrink-0 bg-white rounded flex items-center justify-center overflow-hidden border border-gray-200">
              {awayTeam.logoUrl ? (
                <>
                  <img 
                    src={awayTeam.logoUrl} 
                    alt={`${awayTeam.name} logo`} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <span className="text-lg font-extrabold text-gray-800 hidden">
                    {awayShortName.slice(0, 1)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-extrabold text-gray-800">
                  {awayShortName.slice(0, 1)}
                </span>
              )}
            </div>
            
            {/* Score - large black number */}
            <span className="text-4xl font-bold text-black leading-none">
              {awayTeam.score}
            </span>
          </div>

          {/* Home Team */}
          <div className="flex items-center gap-1.5">
            {/* Logo - square with white background */}
            <div className="w-8 h-8 shrink-0 bg-white rounded flex items-center justify-center overflow-hidden border border-gray-200">
              {homeTeam.logoUrl ? (
                <>
                  <img 
                    src={homeTeam.logoUrl} 
                    alt={`${homeTeam.name} logo`} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <span className="text-lg font-extrabold text-gray-800 hidden">
                    {homeShortName.slice(0, 1)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-extrabold text-gray-800">
                  {homeShortName.slice(0, 1)}
                </span>
              )}
            </div>
            
            {/* Score - large black number */}
            <span className="text-4xl font-bold text-black leading-none">
              {homeTeam.score}
            </span>
          </div>
        </div>

        {/* Game State Section - Left aligned next to scores */}
        <div className="flex items-center gap-2">
          {/* Count, Outs, and Inning */}
          <div className="flex flex-col items-start gap-0.5">
            {/* Balls-Strikes Count - shown as "B-S" */}
            <div className="text-white text-base font-semibold">
              {count}
            </div>
            {/* Outs */}
            <div className="text-white text-xs font-bold">
              {outs} OUT{outs !== 1 ? 'S' : ''}
            </div>
            {/* Inning indicator - under outs */}
            <div className="flex items-center gap-0.5">
              <span className="text-sm font-bold text-white">
                {isTopInning ? '▲' : '▼'}
              </span>
              <span className="text-base font-bold text-white">
                {inning}
              </span>
            </div>
          </div>

          {/* Bases - next to count/outs/inning */}
          <div className="relative w-20 h-20">
            <BaseballDiamondIcon
              isFirstOccupied={!!bases.first}
              isSecondOccupied={!!bases.second}
              isThirdOccupied={!!bases.third}
              baseSize={40}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LowProfileScoreboard;

