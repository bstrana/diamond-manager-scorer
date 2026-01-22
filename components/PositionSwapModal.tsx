import React, { useState, useEffect } from 'react';
import type { Team, Player } from '../types';

interface PositionSwapModalProps {
  team: Team;
  onClose: () => void;
  onSave: (newPositions: Record<string, string>) => void;
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

const PositionSwapModal: React.FC<PositionSwapModalProps> = ({ team, onClose, onSave }) => {
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const active = team.roster
      .filter(p => p.position.toUpperCase() !== 'BENCH')
      .sort((a, b) => a.battingOrder - b.battingOrder);
    
    setActivePlayers(active);

    const initialPositions = active.reduce((acc, player) => {
      acc[player.id] = player.position;
      return acc;
    }, {} as Record<string, string>);
    setPositions(initialPositions);
  }, [team]);

  const handlePositionChange = (playerId: string, newPosition: string) => {
    setPositions(currentPositions => ({
      ...currentPositions,
      [playerId]: newPosition,
    }));
  };

  const handleSave = () => {
    const assignedPositions = Object.values(positions);
    const uniquePositions = new Set(assignedPositions);

    if (assignedPositions.length !== uniquePositions.size) {
      setError("Each position can only be assigned to one player. Please resolve duplicates.");
      return;
    }

    setError(null);
    onSave(positions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-600">
        <h2 className="text-2xl font-bold text-yellow-300 mb-4">Swap Positions: {team.name}</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {activePlayers.map(player => (
            <div key={player.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
              <span className="font-medium text-white">#{player.number} {player.name}</span>
              <select
                value={positions[player.id] || ''}
                onChange={(e) => handlePositionChange(player.id, e.target.value)}
                className="bg-gray-900 text-white border border-gray-600 rounded-md p-2 text-sm focus:ring-yellow-500 focus:border-yellow-500"
              >
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 text-center mt-4 text-sm">{error}</p>}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-bold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PositionSwapModal;