import React, { useState } from 'react';
import type { Team, Player, GameState } from '../types';
import PositionSwapModal from './PositionSwapModal';

interface PlayerStatsProps {
  homeTeam: Team;
  awayTeam: Team;
  onSubstitute: (teamKey: 'homeTeam' | 'awayTeam', playerOutId: string, playerInId: string) => void;
  onPositionSwap: (teamKey: 'homeTeam' | 'awayTeam', newPositions: Record<string, string>) => void;
  currentBatterId?: string | null;
  isTopInning: boolean;
  bases: GameState['bases'];
}

const formatStat = (stat: number) => {
  if (stat === 0) return '.000';
  if (stat === 1) return '1.000';
  const formatted = stat.toFixed(3);
  return formatted.startsWith('0') ? formatted.substring(1) : formatted;
};

const hexToRgba = (hex: string, alpha: number): string => {
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)) {
    return `rgba(255, 255, 255, ${alpha})`; // Return a default color if hex is invalid
  }
  let c = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const i = parseInt(c.join(''), 16);
  const r = (i >> 16) & 255;
  const g = (i >> 8) & 255;
  const b = i & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TeamStatsTable: React.FC<{ 
  team: Team, 
  teamKey: 'homeTeam' | 'awayTeam', 
  onSubstitute: PlayerStatsProps['onSubstitute'],
  onOpenPositionSwap: () => void;
  currentBatterId?: string | null;
  bases: GameState['bases'];
}> = ({ team, teamKey, onSubstitute, onOpenPositionSwap, currentBatterId, bases }) => {
  const [substitutingPlayerId, setSubstitutingPlayerId] = useState<string | null>(null);
  
  const headers = ['#', 'Name', 'Pos', 'PA', 'AB', 'H', 'BB', 'R', 'RBI', 'SB', 'CS', 'SO', 'SH', 'A', 'PO', 'E', 'AVG', 'OBP', 'SLG', ''];
  
  const activeLineup = team.roster.filter(p => p.position.toUpperCase() !== 'BENCH').sort((a,b) => a.battingOrder - b.battingOrder);
  const bench = team.roster.filter(p => p.position.toUpperCase() === 'BENCH');

  const handleSubSelect = (e: React.ChangeEvent<HTMLSelectElement>, playerOutId: string) => {
    const playerInId = e.target.value;
    if(playerInId) {
        onSubstitute(teamKey, playerOutId, playerInId);
    }
    setSubstitutingPlayerId(null);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
       <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          {team.logoUrl && <img src={team.logoUrl} alt={`${team.name} logo`} className="h-10 w-10 object-contain"/>}
          <h3 className="text-xl font-bold text-yellow-300 tracking-wider">{team.name} Batting & Fielding Stats</h3>
        </div>
        <button 
            onClick={onOpenPositionSwap}
            className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md font-bold transition-colors"
            title="Open defensive position assignment modal">
            Swap Positions
        </button>
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
            {activeLineup.map((player: Player) => {
              const isCurrentBatter = player.id === currentBatterId;
              
              let highlightStyle = {};
              if (bases.third?.id === player.id) {
                  highlightStyle = { backgroundColor: hexToRgba(team.color, 0.5) };
              } else if (bases.second?.id === player.id) {
                  highlightStyle = { backgroundColor: hexToRgba(team.color, 0.35) };
              } else if (bases.first?.id === player.id) {
                  highlightStyle = { backgroundColor: hexToRgba(team.color, 0.2) };
              }
              const rowClassName = `border-b border-gray-700 hover:bg-gray-600/50 ${isCurrentBatter ? 'bg-yellow-400/20' : ''}`;

              return (
              <tr key={player.id} className={rowClassName} style={highlightStyle}>
                <td className="px-3 py-2 text-center">{player.number}</td>
                <th scope="row" className="px-3 py-2 font-medium text-white whitespace-nowrap">{player.name}</th>
                <td className="px-3 py-2 text-center">{player.position}</td>
                <td className="px-3 py-2 text-center">{player.stats.PA}</td>
                <td className="px-3 py-2 text-center">{player.stats.AB}</td>
                <td className="px-3 py-2 text-center">{player.stats.H}</td>
                <td className="px-3 py-2 text-center">{player.stats.BB}</td>
                <td className="px-3 py-2 text-center">{player.stats.runsScored}</td>
                <td className="px-3 py-2 text-center">{player.stats.RBI}</td>
                <td className="px-3 py-2 text-center">{player.stats.SB}</td>
                <td className="px-3 py-2 text-center">{player.stats.CS}</td>
                <td className="px-3 py-2 text-center">{player.stats.SO}</td>
                <td className="px-3 py-2 text-center">{player.stats.SH}</td>
                <td className="px-3 py-2 text-center">{player.stats.A}</td>
                <td className="px-3 py-2 text-center">{player.stats.PO}</td>
                <td className="px-3 py-2 text-center">{player.stats.E}</td>
                <td className="px-3 py-2 text-center font-mono">{formatStat(player.stats.AVG)}</td>
                <td className="px-3 py-2 text-center font-mono">{formatStat(player.stats.OBP)}</td>
                <td className="px-3 py-2 text-center font-mono">{formatStat(player.stats.SLG)}</td>
                <td className="px-3 py-2 text-center">
                    {substitutingPlayerId === player.id ? (
                        <select onChange={(e) => handleSubSelect(e, player.id)} onBlur={() => setSubstitutingPlayerId(null)} autoFocus className="bg-gray-900 text-xs rounded">
                            <option value="">Cancel</option>
                            {bench.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                    ) : (
                        <button onClick={() => setSubstitutingPlayerId(player.id)} className="text-xs bg-sky-600 hover:bg-sky-700 px-2 py-1 rounded" title="Substitute this player">
                            {isCurrentBatter ? 'Pinch Hit' : 'Sub'}
                        </button>
                    )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


const PlayerStats: React.FC<PlayerStatsProps> = ({ homeTeam, awayTeam, onSubstitute, onPositionSwap, currentBatterId, isTopInning, bases }) => {
  const [swapModalTeam, setSwapModalTeam] = useState<'homeTeam' | 'awayTeam' | null>(null);

  const handleSavePositions = (teamKey: 'homeTeam' | 'awayTeam', newPositions: Record<string, string>) => {
    onPositionSwap(teamKey, newPositions);
    setSwapModalTeam(null);
  };

  return (
    <div className="space-y-6">
      <TeamStatsTable team={awayTeam} teamKey="awayTeam" onSubstitute={onSubstitute} onOpenPositionSwap={() => setSwapModalTeam('awayTeam')} currentBatterId={isTopInning ? currentBatterId : null} bases={bases}/>
      <TeamStatsTable team={homeTeam} teamKey="homeTeam" onSubstitute={onSubstitute} onOpenPositionSwap={() => setSwapModalTeam('homeTeam')} currentBatterId={!isTopInning ? currentBatterId : null} bases={bases}/>
      
      {swapModalTeam && (
        <PositionSwapModal 
          team={swapModalTeam === 'homeTeam' ? homeTeam : awayTeam}
          onClose={() => setSwapModalTeam(null)}
          onSave={(newPositions) => handleSavePositions(swapModalTeam, newPositions)}
        />
      )}
    </div>
  );
};

export default PlayerStats;