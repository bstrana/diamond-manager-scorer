
import React from 'react';
import type { Team, Player } from '../types';

interface PitchingStatsProps {
  homeTeam: Team;
  awayTeam: Team;
  currentPitcherId?: string | null;
}

const formatIP = (ip: number) => {
    const innings = Math.floor(ip);
    const outs = Math.round((ip - innings) * 3);
    return `${innings}.${outs}`;
};

const formatERA = (era: number) => {
    if (isNaN(era) || !isFinite(era)) return '0.00';
    return era.toFixed(2);
};

const TeamPitchingStatsTable: React.FC<{ team: Team, currentPitcherId?: string | null }> = ({ team, currentPitcherId }) => {
  const pitchers = team.roster.filter(p => p.stats.pitchCount > 0);
  const headers = ['#', 'Name', 'IP', 'H', 'R', 'ER', 'BB', 'SO', 'ERA', 'Pitches (S-B)'];
  
  if (pitchers.length === 0) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
       <div className="flex items-center gap-4 mb-4">
        {team.logoUrl && <img src={team.logoUrl} alt={`${team.name} logo`} className="h-10 w-10 object-contain"/>}
        <h3 className="text-xl font-bold text-yellow-300 tracking-wider">{team.name} Pitching Stats</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-yellow-300 uppercase bg-gray-700">
            <tr>
              {headers.map(header => (
                <th key={header} scope="col" className="px-3 py-3 text-center">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pitchers.map((player: Player) => {
              const isCurrentPitcher = player.id === currentPitcherId;
              return (
              <tr key={player.id} className={`border-b border-gray-700 hover:bg-gray-600/50 ${isCurrentPitcher ? 'bg-yellow-400/20' : ''}`}>
                <td className="px-3 py-2 text-center">{player.number}</td>
                <th scope="row" className="px-3 py-2 font-medium text-white whitespace-nowrap">{player.name}</th>
                <td className="px-3 py-2 text-center font-mono">{formatIP(player.stats.IP)}</td>
                <td className="px-3 py-2 text-center">{player.stats.H_allowed}</td>
                <td className="px-3 py-2 text-center">{player.stats.R}</td>
                <td className="px-3 py-2 text-center">{player.stats.ER}</td>
                <td className="px-3 py-2 text-center">{player.stats.BB_allowed}</td>
                <td className="px-3 py-2 text-center">{player.stats.SO_pitched}</td>
                <td className="px-3 py-2 text-center font-mono">{formatERA(player.stats.ERA)}</td>
                <td className="px-3 py-2 text-center font-mono">{`${player.stats.pitchCount} (${player.stats.strikesThrown}-${player.stats.ballsThrown})`}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PitchingStats: React.FC<PitchingStatsProps> = ({ homeTeam, awayTeam, currentPitcherId }) => {
  return (
    <div className="space-y-6">
      <TeamPitchingStatsTable team={awayTeam} currentPitcherId={currentPitcherId} />
      <TeamPitchingStatsTable team={homeTeam} currentPitcherId={currentPitcherId} />
    </div>
  );
};

export default PitchingStats;
