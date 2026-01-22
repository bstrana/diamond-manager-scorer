import React, { useEffect, useRef } from 'react';
import type { GameState, Player, PlateAppearanceResult } from '../types';

interface BatterLowerThirdsProps {
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

const BatterLowerThirds: React.FC<BatterLowerThirdsProps> = ({ gameState }) => {
  const { 
    homeTeam, 
    awayTeam, 
    isTopInning, 
    plateAppearances,
    scoreboardSettings,
  } = gameState;
  
  const lowerThirdsBgColor = scoreboardSettings?.lowerThirdsBackgroundColor || 'rgba(0, 0, 0, 0.9)';
  const lowerThirdsTextColor = scoreboardSettings?.lowerThirdsTextColor || '#ffffff';

  const battingTeam = isTopInning ? awayTeam : homeTeam;
  const activeLineup = getActiveLineup(battingTeam.roster);
  const battingTeamBatterIndex = isTopInning ? gameState.currentBatterIndex.away : gameState.currentBatterIndex.home;
  const currentBatter = activeLineup[battingTeamBatterIndex];

  // Show game setup info if game not started
  if (gameState.gameStatus === 'setup') {
    const formatDate = (date?: string | Date): string => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const gameDateStr = formatDate(gameState.gameDate);
    const awayTeamName = gameState.awayTeam?.name || '';
    const homeTeamName = gameState.homeTeam?.name || '';
    const awayTeamLogo = gameState.awayTeam?.logoUrl || '';
    const homeTeamLogo = gameState.homeTeam?.logoUrl || '';
    const competition = gameState.competition || '';
    const location = gameState.location || '';

    // Only show setup info if we have actual team names (not defaults)
    const hasRealData = (awayTeamName && awayTeamName !== 'Away' && awayTeamName !== 'Away Team') ||
                        (homeTeamName && homeTeamName !== 'Home' && homeTeamName !== 'Home Team') ||
                        competition ||
                        location ||
                        gameDateStr;

    if (!hasRealData) {
      // Show placeholder if no real data yet
      return (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div 
            className="backdrop-blur-sm px-8 py-4 border-t-4 border-gray-600"
            style={{ backgroundColor: lowerThirdsBgColor, color: lowerThirdsTextColor }}
          >
            <div className="max-w-7xl mx-auto text-center">
              <div className="text-lg" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>
                Game not started
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div 
          className="backdrop-blur-sm px-8 py-4 border-t-4 border-gray-600"
          style={{ backgroundColor: lowerThirdsBgColor, color: lowerThirdsTextColor }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-8">
              {/* Left side: Teams */}
              <div className="flex items-center gap-4">
                {/* Away team logo */}
                {awayTeamLogo && (
                  <div className="w-10 h-10 shrink-0">
                    <img 
                      src={awayTeamLogo} 
                      alt={`${awayTeamName || 'Away Team'} logo`} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="text-2xl font-bold" style={{ color: lowerThirdsTextColor }}>
                  {awayTeamName || 'Away Team'} @ {homeTeamName || 'Home Team'}
                </div>
                {/* Home team logo */}
                {homeTeamLogo && (
                  <div className="w-10 h-10 shrink-0">
                    <img 
                      src={homeTeamLogo} 
                      alt={`${homeTeamName || 'Home Team'} logo`} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Right side: Date, Competition, Location */}
              <div className="flex items-center gap-6 text-sm">
                {gameDateStr && (
                  <div style={{ color: lowerThirdsTextColor, opacity: 0.8 }}>
                    {gameDateStr}
                  </div>
                )}
                {competition && (
                  <div style={{ color: lowerThirdsTextColor, opacity: 0.8 }}>
                    {competition}
                  </div>
                )}
                {location && (
                  <div style={{ color: lowerThirdsTextColor, opacity: 0.8 }}>
                    {location}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show placeholder if game ended
  if (gameState.gameStatus === 'final') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div 
          className="backdrop-blur-sm px-8 py-4 border-t-4 border-gray-600"
          style={{ backgroundColor: lowerThirdsBgColor, color: lowerThirdsTextColor }}
        >
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-lg" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>
              Game ended
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBatter) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div 
          className="backdrop-blur-sm px-8 py-4 border-t-4 border-gray-600"
          style={{ backgroundColor: lowerThirdsBgColor, color: lowerThirdsTextColor }}
        >
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-lg" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>
              Waiting for batter...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate current game stats for the batter
  const batterPAs = plateAppearances.filter(pa => pa.batter.id === currentBatter.id);
  const atBatsInGame = batterPAs.filter(pa => !['walk', 'HBP', 'IBB', 'sac_fly'].includes(pa.result)).length;
  const hitsInGame = batterPAs.filter(pa => ['single', 'double', 'triple', 'homerun'].includes(pa.result as PlateAppearanceResult));
  const singles = batterPAs.filter(pa => pa.result === 'single').length;
  const doubles = batterPAs.filter(pa => pa.result === 'double').length;
  const triples = batterPAs.filter(pa => pa.result === 'triple').length;
  const homeRuns = batterPAs.filter(pa => pa.result === 'homerun').length;
  const rbis = batterPAs.reduce((sum, pa) => sum + pa.runnersBattedIn, 0);
  const walks = batterPAs.filter(pa => ['walk', 'IBB'].includes(pa.result)).length;
  const strikeouts = batterPAs.filter(pa => pa.result === 'strikeout').length;
  
  const avg = atBatsInGame > 0 ? (hitsInGame.length / atBatsInGame).toFixed(3) : '.000';
  const obp = (atBatsInGame + walks + batterPAs.filter(pa => pa.result === 'sac_fly').length) > 0 
    ? ((hitsInGame.length + walks) / (atBatsInGame + walks + batterPAs.filter(pa => pa.result === 'sac_fly').length)).toFixed(3)
    : '.000';

  const teamColor = battingTeam.color || '#ffffff';
  const styleId = 'batter-lower-thirds-dynamic-styles';

  // Create or update style element in document head for CSP compliance
  useEffect(() => {
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      .batter-lower-thirds-container[data-team-color] {
        border-top-color: ${teamColor};
      }
      .batter-lower-thirds-color-bar[data-team-color-bg] {
        background-color: ${teamColor};
      }
      .batter-lower-thirds-photo[data-team-color-border] {
        border-color: ${teamColor};
      }
    `;

    return () => {
      // Cleanup: remove style element when component unmounts
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [teamColor, styleId]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div 
        className="backdrop-blur-sm px-8 py-4 border-t-4 batter-lower-thirds-container"
        data-team-color={teamColor}
        style={{ backgroundColor: lowerThirdsBgColor, color: lowerThirdsTextColor }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Left side: Player info */}
          <div className="flex items-center gap-6">
            <div 
              className="w-1 h-16 batter-lower-thirds-color-bar"
              data-team-color-bg={teamColor}
            />
            {/* Player photo */}
            <div 
              className="w-16 h-16 rounded-full overflow-hidden border-2 flex-shrink-0 bg-gray-700 batter-lower-thirds-photo" 
              data-team-color-border={teamColor}
            >
              <img 
                src={currentBatter?.photoUrl || 'https://bstrana.sirv.com/ybc/player.png'} 
                alt={currentBatter?.name || 'Player'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to default image if photo fails to load
                  const target = e.target as HTMLImageElement;
                  console.warn('Failed to load player photo:', currentBatter?.photoUrl, 'Falling back to default');
                  if (target.src !== 'https://bstrana.sirv.com/ybc/player.png') {
                    target.src = 'https://bstrana.sirv.com/ybc/player.png';
                  }
                }}
                onLoad={() => {
                  // Photo loaded successfully
                }}
              />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: lowerThirdsTextColor }}>
                #{currentBatter.number} {currentBatter.name}
              </div>
              <div className="text-sm uppercase" style={{ color: lowerThirdsTextColor, opacity: 0.8 }}>
                {currentBatter.position} • {battingTeam.name}
              </div>
            </div>
          </div>

          {/* Right side: Stats */}
          <div className="flex items-center gap-8 text-lg">
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>AVG</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{avg}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>OBP</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{obp}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>H-AB</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{hitsInGame.length}-{atBatsInGame}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>HR</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{homeRuns}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>RBI</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{rbis}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>SO</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{strikeouts}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase mb-1" style={{ color: lowerThirdsTextColor, opacity: 0.7 }}>BB</div>
              <div className="font-bold text-2xl" style={{ color: lowerThirdsTextColor }}>{walks}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatterLowerThirds;

