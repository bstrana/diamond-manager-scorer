import React from 'react';
import type { GameState } from '../types';

interface LinescoreProps {
  gameState: GameState;
}

const Linescore: React.FC<LinescoreProps> = ({ gameState }) => {
  const { homeTeam, awayTeam, inning, isTopInning } = gameState;
  
  // Get runs by inning, ensuring we have at least 9 innings
  const homeRunsByInning = homeTeam.runsByInning || [];
  const awayRunsByInning = awayTeam.runsByInning || [];
  
  // Ensure arrays have at least 9 innings (pad with 0s if needed)
  const maxInnings = Math.max(9, inning, homeRunsByInning.length, awayRunsByInning.length);
  const homeRuns = Array(maxInnings).fill(0).map((_, i) => homeRunsByInning[i] || 0);
  const awayRuns = Array(maxInnings).fill(0).map((_, i) => awayRunsByInning[i] || 0);
  
  // Calculate totals - use team.score as source of truth, but also calculate from runsByInning for verification
  const homeTotalFromInnings = homeRuns.reduce((sum, runs) => sum + runs, 0);
  const awayTotalFromInnings = awayRuns.reduce((sum, runs) => sum + runs, 0);
  
  // Use team.score as the source of truth (it's updated when runs are scored)
  const homeTotal = homeTeam.score;
  const awayTotal = awayTeam.score;
  
  // Debug: Log if there's a mismatch between runsByInning sum and team.score
  if (homeTotalFromInnings !== homeTeam.score || awayTotalFromInnings !== awayTeam.score) {
    console.warn('Linescore totals mismatch:', {
      home: { 
        fromInnings: homeTotalFromInnings, 
        actual: homeTeam.score, 
        runsByInning: homeRunsByInning,
        difference: homeTeam.score - homeTotalFromInnings
      },
      away: { 
        fromInnings: awayTotalFromInnings, 
        actual: awayTeam.score, 
        runsByInning: awayRunsByInning,
        difference: awayTeam.score - awayTotalFromInnings
      },
      currentInning: inning,
      isTopInning: isTopInning
    });
  }
  
  // Determine which inning is currently active (highlight it)
  const currentInningIndex = inning - 1; // Convert to 0-based
  
  return (
    <div className="bg-black/90 text-white p-6 rounded-lg font-mono border-2 border-gray-600 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-500">
              <th className="px-4 py-3 text-left font-bold text-yellow-300 text-lg">Team</th>
              {Array.from({ length: maxInnings }, (_, i) => (
                <th 
                  key={i} 
                  className={`px-3 py-3 font-bold text-sm ${
                    i === currentInningIndex 
                      ? 'bg-yellow-500/30 text-yellow-300' 
                      : 'text-gray-300'
                  }`}
                >
                  {i + 1}
                </th>
              ))}
              <th className="px-4 py-3 font-bold text-yellow-300 text-lg">R</th>
              <th className="px-4 py-3 font-bold text-yellow-300 text-lg">H</th>
              <th className="px-4 py-3 font-bold text-yellow-300 text-lg">E</th>
            </tr>
          </thead>
          <tbody>
            {/* Away Team Row */}
            <tr className="border-b border-gray-700">
              <td 
                className="px-4 py-3 text-left font-bold text-lg"
                style={{ 
                  borderLeft: `4px solid ${awayTeam.color || '#ffffff'}`,
                  paddingLeft: '12px'
                }}
              >
                {awayTeam.logoUrl && (
                  <span className="inline-block mr-2">
                    <img src={awayTeam.logoUrl} alt={`${awayTeam.name} logo`} className="h-6 w-6 object-contain inline-block" />
                  </span>
                )}
                {awayTeam.name}
              </td>
              {awayRuns.map((runs, i) => (
                <td 
                  key={i}
                  className={`px-3 py-3 text-lg font-semibold ${
                    i === currentInningIndex && !isTopInning
                      ? 'bg-yellow-500/30 text-yellow-300'
                      : i === currentInningIndex && isTopInning
                      ? 'bg-yellow-500/50 text-yellow-200'
                      : 'text-gray-200'
                  }`}
                >
                  {runs > 0 ? runs : '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-xl font-bold text-yellow-300">{awayTotal}</td>
              <td className="px-4 py-3 text-lg font-semibold text-gray-200">{awayTeam.hits}</td>
              <td className="px-4 py-3 text-lg font-semibold text-gray-200">{awayTeam.errors}</td>
            </tr>
            
            {/* Home Team Row */}
            <tr>
              <td 
                className="px-4 py-3 text-left font-bold text-lg"
                style={{ 
                  borderLeft: `4px solid ${homeTeam.color || '#ffffff'}`,
                  paddingLeft: '12px'
                }}
              >
                {homeTeam.logoUrl && (
                  <span className="inline-block mr-2">
                    <img src={homeTeam.logoUrl} alt={`${homeTeam.name} logo`} className="h-6 w-6 object-contain inline-block" />
                  </span>
                )}
                {homeTeam.name}
              </td>
              {homeRuns.map((runs, i) => (
                <td 
                  key={i}
                  className={`px-3 py-3 text-lg font-semibold ${
                    i === currentInningIndex && isTopInning
                      ? 'bg-yellow-500/30 text-yellow-300'
                      : i === currentInningIndex && !isTopInning
                      ? 'bg-yellow-500/50 text-yellow-200'
                      : 'text-gray-200'
                  }`}
                >
                  {runs > 0 ? runs : '-'}
                </td>
              ))}
              <td className="px-4 py-3 text-xl font-bold text-yellow-300">{homeTotal}</td>
              <td className="px-4 py-3 text-lg font-semibold text-gray-200">{homeTeam.hits}</td>
              <td className="px-4 py-3 text-lg font-semibold text-gray-200">{homeTeam.errors}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Linescore;

