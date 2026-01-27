import React, { useState, useEffect, useMemo } from 'react';
import type { TeamSetup, GameState, ScoreboardSettings } from '../types';
import { getGameScheduleProvider } from '../services/gameScheduleProvider';
import { fetchSchedulePayloadOptions, SchedulePayloadOption } from '../services/providers/pocketbaseGameScheduleProvider';
import { useKeycloakAuth } from './KeycloakAuth';
import SettingsModal from './SettingsModal';

interface GameSetupProps {
  onGameSetup: (
    homeTeam: TeamSetup, 
    awayTeam: TeamSetup, 
    competition: string, 
    location:string,
    gameId?: number | string,
    scorekeeperName?: string,
    gameDate?: string | Date
  ) => void;
  onUpdateSetupData?: (
    homeTeam: TeamSetup,
    awayTeam: TeamSetup,
    competition: string,
    location: string,
    gameDate?: string | Date
  ) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  initialState?: GameState;
  onSettingsUpdate: (settings: ScoreboardSettings) => void;
}

const defaultAwayRoster = `1, 7, Mookie Betts, 2B
2, 5, Corey Seager, SS
3, 99, Aaron Judge, RF
4, 17, Shohei Ohtani, DH
5, 27, Vladimir Guerrero Jr., 1B
6, 13, Ronald Acuña Jr., CF
7, 23, Fernando Tatis Jr., LF
8, 11, Rafael Devers, 3B
9, 10, Adley Rutschman, C
0, 22, Clayton Kershaw, P
0, 35, Cody Bellinger, BENCH
0, 50, Walker Buehler, BENCH`;

const defaultHomeRoster = `1, 30, Tim Anderson, SS
2, 1, Ozzie Albies, 2B
3, 22, Juan Soto, RF
4, 28, Matt Olson, 1B
5, 6, Austin Riley, 3B
6, 44, Julio Rodríguez, CF
7, 2, Yordan Alvarez, LF
8, 25, Willson Contreras, C
9, 15, Bryce Harper, DH
0, 54, Max Fried, P
0, 19, Spencer Strider, BENCH
0, 62, Michael Harris II, BENCH`;


interface RosterPlayer {
  id: string;
  battingOrder: number;
  number: number;
  name: string;
  position: string;
}

const BASEBALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'BENCH'];

// Security: Sanitize player name to prevent XSS
const sanitizePlayerName = (name: string): string => {
  if (typeof name !== 'string') return '';
  // Remove HTML tags and limit length
  return name
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 50);
};

// Security: Sanitize team name to prevent XSS
const sanitizeTeamName = (name: string): string => {
  if (typeof name !== 'string') return '';
  return name
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
};

// Security: Validate and sanitize URL
const sanitizeTeamUrl = (url: string): string => {
  if (typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return url.trim();
  } catch {
    return '';
  }
};

const parseRosterToArray = (rosterString: string): RosterPlayer[] => {
  return rosterString.split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      const parts = line.split(',');
      // Format: battingOrder, number, name, position, photoUrl (photoUrl is optional)
      // Security: Sanitize player name to prevent XSS
      const rawName = parts[2]?.trim() || '';
      const sanitizedName = sanitizePlayerName(rawName);
      
      return {
        id: `player-${index}-${Date.now()}`,
        battingOrder: parseInt(parts[0]?.trim(), 10) || 0,
        number: parseInt(parts[1]?.trim(), 10) || 0,
        name: sanitizedName,
        position: parts[3]?.trim().toUpperCase().slice(0, 10) || '', // Limit position length
        // Store original line to preserve photoUrl
        _originalLine: line.trim(),
      };
    })
    .sort((a, b) => {
      // Players with batting order 0 (bench) go to the end
      if (a.battingOrder === 0 && b.battingOrder === 0) return 0;
      if (a.battingOrder === 0) return 1; // a goes after b
      if (b.battingOrder === 0) return -1; // b goes after a
      return a.battingOrder - b.battingOrder; // Normal sort for non-zero
    });
};

const convertRosterArrayToString = (players: RosterPlayer[]): string => {
  return players
    .map(p => {
      // If we have the original line with photoUrl, preserve it
      if ((p as any)._originalLine) {
        const parts = (p as any)._originalLine.split(',');
        // Reconstruct with updated values but preserve photoUrl if it exists
        const photoUrl = parts[4]?.trim() || 'https://bstrana.sirv.com/ybc/player.png';
        return `${p.battingOrder}, ${p.number}, ${p.name}, ${p.position}, ${photoUrl}`;
      }
      // Otherwise, add default photo URL
      return `${p.battingOrder}, ${p.number}, ${p.name}, ${p.position}, https://bstrana.sirv.com/ybc/player.png`;
    })
    .join('\n');
};

const RosterTable: React.FC<{
  players: RosterPlayer[];
  onPlayersChange: (players: RosterPlayer[]) => void;
}> = ({ players, onPlayersChange }) => {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCellClick = (rowId: string, field: string, currentValue: string | number) => {
    setEditingCell({ rowId, field });
    setEditValue(String(currentValue));
  };

  const handleCellBlur = () => {
    if (!editingCell) return;
    
    const updatedPlayers = players.map(player => {
      if (player.id !== editingCell.rowId) return player;
      
      const updated = { ...player };
      if (editingCell.field === 'battingOrder') {
        updated.battingOrder = parseInt(editValue, 10) || 0;
      } else if (editingCell.field === 'number') {
        updated.number = parseInt(editValue, 10) || 0;
      } else if (editingCell.field === 'name') {
        updated.name = editValue;
      } else if (editingCell.field === 'position') {
        updated.position = editValue.toUpperCase();
      }
      return updated;
    });
    
    // Sort by batting order after update (0s at the end)
    const sorted = updatedPlayers.sort((a, b) => {
      if (a.battingOrder === 0 && b.battingOrder === 0) return 0;
      if (a.battingOrder === 0) return 1;
      if (b.battingOrder === 0) return -1;
      return a.battingOrder - b.battingOrder;
    });
    onPlayersChange(sorted);
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleAddPlayer = () => {
    const newPlayer: RosterPlayer = {
      id: `player-${Date.now()}-${Math.random()}`,
      battingOrder: players.length > 0 ? Math.max(...players.map(p => p.battingOrder)) + 1 : 1,
      number: 0,
      name: '',
      position: '',
    };
    const sorted = [...players, newPlayer].sort((a, b) => {
      if (a.battingOrder === 0 && b.battingOrder === 0) return 0;
      if (a.battingOrder === 0) return 1;
      if (b.battingOrder === 0) return -1;
      return a.battingOrder - b.battingOrder;
    });
    onPlayersChange(sorted);
  };

  const handleDeletePlayer = (playerId: string) => {
    onPlayersChange(players.filter(p => p.id !== playerId));
  };

  const handleDuplicatePlayer = (playerId: string) => {
    const playerToDuplicate = players.find(p => p.id === playerId);
    if (!playerToDuplicate) return;

    const duplicatedPlayer: RosterPlayer = {
      ...playerToDuplicate,
      id: `player-${Date.now()}-${Math.random()}`,
      // Keep the same batting order - user can adjust if needed
    };

    const playerIndex = players.findIndex(p => p.id === playerId);
    const newPlayers = [...players];
    newPlayers.splice(playerIndex + 1, 0, duplicatedPlayer);

    // Sort by batting order after duplicate (0s at the end)
    const sorted = newPlayers.sort((a, b) => {
      if (a.battingOrder === 0 && b.battingOrder === 0) return 0;
      if (a.battingOrder === 0) return 1;
      if (b.battingOrder === 0) return -1;
      return a.battingOrder - b.battingOrder;
    });
    onPlayersChange(sorted);
  };

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    setDraggedPlayerId(playerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', playerId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedPlayerId) return;

    const draggedIndex = players.findIndex(p => p.id === draggedPlayerId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedPlayerId(null);
      return;
    }

    const draggedPlayer = players.find(p => p.id === draggedPlayerId);
    if (!draggedPlayer) {
      setDraggedPlayerId(null);
      return;
    }

    // Find the original bench boundary (where order 0 starts)
    const originalBenchStartIndex = players.findIndex(p => p.battingOrder === 0);
    const originalBenchStart = originalBenchStartIndex === -1 ? players.length : originalBenchStartIndex;
    const wasBenchPlayer = draggedPlayer.battingOrder === 0;

    // Create new array with reordered players
    const newPlayers = [...players];
    newPlayers.splice(draggedIndex, 1);
    newPlayers.splice(dropIndex, 0, draggedPlayer);

    // Determine new bench boundary
    // If a bench player was dragged into positions 1-9 (index 0-8), they become active
    // Find where the bench section should start now
    let newBenchStart = newPlayers.length;
    
    for (let i = 0; i < newPlayers.length; i++) {
      const player = newPlayers[i];
      const originalIndex = players.findIndex(p => p.id === player.id);
      const wasOriginallyBench = originalIndex >= originalBenchStart;
      
      // If this is the dragged bench player and they're in positions 1-9, they're now active
      if (wasBenchPlayer && i === dropIndex && dropIndex < 9) {
        // This bench player is now active, continue to find where bench starts
        continue;
      }
      
      // If this is an originally-bench player (and not the one we just moved), bench starts here
      if (wasOriginallyBench) {
        newBenchStart = i;
        break;
      }
    }

    // Update batting orders: active players get order = position + 1, bench players get 0
    const updatedPlayers = newPlayers.map((player, index) => {
      if (index < newBenchStart) {
        // Active section: order = position + 1 (1st row = 1, 2nd = 2, etc.)
        return { ...player, battingOrder: index + 1 };
      } else {
        // Bench section: order = 0
        return { ...player, battingOrder: 0 };
      }
    });

    // Re-sort to ensure bench players (order 0) are at the end
    const sorted = updatedPlayers.sort((a, b) => {
      if (a.battingOrder === 0 && b.battingOrder === 0) return 0;
      if (a.battingOrder === 0) return 1;
      if (b.battingOrder === 0) return -1;
      return a.battingOrder - b.battingOrder;
    });

    onPlayersChange(sorted);
    setDraggedPlayerId(null);
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs text-yellow-300 uppercase bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-center w-8"></th>
              <th className="px-3 py-2 text-center">Order</th>
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr 
                key={player.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, player.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`border-b border-gray-600 hover:bg-gray-600/50 cursor-move ${
                  draggedPlayerId === player.id ? 'opacity-50' : ''
                } ${
                  dragOverIndex === index ? 'bg-yellow-500/20 border-yellow-500' : ''
                }`}
              >
                <td className="px-3 py-2 text-center text-gray-500 cursor-move" title="Drag to reorder">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </td>
                <td className="px-3 py-2 text-center">
                  {editingCell?.rowId === player.id && editingCell.field === 'battingOrder' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-16 bg-gray-800 border border-yellow-500 text-white text-center rounded px-1"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(player.id, 'battingOrder', player.battingOrder)}
                      className="cursor-pointer hover:bg-gray-600 px-2 py-1 rounded"
                    >
                      {player.battingOrder}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {editingCell?.rowId === player.id && editingCell.field === 'number' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-16 bg-gray-800 border border-yellow-500 text-white text-center rounded px-1"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(player.id, 'number', player.number)}
                      className="cursor-pointer hover:bg-gray-600 px-2 py-1 rounded"
                    >
                      {player.number}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {editingCell?.rowId === player.id && editingCell.field === 'name' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-gray-800 border border-yellow-500 text-white rounded px-2 py-1"
                    />
                  ) : (
                    <span
                      onClick={() => handleCellClick(player.id, 'name', player.name)}
                      className="cursor-pointer hover:bg-gray-600 px-2 py-1 rounded block"
                    >
                      {player.name || <span className="text-gray-500 italic">Click to edit</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {editingCell?.rowId === player.id && editingCell.field === 'position' ? (
                    <select
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        // Auto-save on change for dropdown
                        const updatedPlayers = players.map(p => {
                          if (p.id === player.id) {
                            return { ...p, position: e.target.value.toUpperCase() };
                          }
                          return p;
                        });
                        const sorted = updatedPlayers.sort((a, b) => {
                          if (a.battingOrder === 0 && b.battingOrder === 0) return 0;
                          if (a.battingOrder === 0) return 1;
                          if (b.battingOrder === 0) return -1;
                          return a.battingOrder - b.battingOrder;
                        });
                        onPlayersChange(sorted);
                        setEditingCell(null);
                        setEditValue('');
                      }}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="w-full bg-gray-800 border border-yellow-500 text-white rounded px-2 py-1"
                    >
                      <option value="">Select Position</option>
                      {BASEBALL_POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => handleCellClick(player.id, 'position', player.position)}
                      className="cursor-pointer hover:bg-gray-600 px-2 py-1 rounded block"
                    >
                      {player.position || <span className="text-gray-500 italic">Click to edit</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDuplicatePlayer(player.id)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-bold"
                      title="Duplicate player"
                    >
                      ⧉
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                      title="Delete player"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={handleAddPlayer}
        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 rounded transition-colors"
      >
        + Add Player
      </button>
    </div>
  );
};

// Helper function for file import (moved outside to be accessible)
const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, setRoster: (roster: string) => void, setError: (error: string | null) => void) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRoster(text);
      }
    };
    reader.onerror = () => {
      setError(`Error reading file: ${file.name}`);
    }
    reader.readAsText(file);
    e.target.value = ''; // Reset file input to allow re-upload of same file
  }
};

// Move TeamInput outside GameSetup to prevent recreation on every render
const TeamInput: React.FC<{
  teamLabel: string;
  name: string;
  setName: (name: string) => void;
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  color: string;
  setColor: (color: string) => void;
  roster: string;
  setRoster: (roster: string) => void;
  onError: (error: string | null) => void;
}> = React.memo(({ teamLabel, name, setName, logoUrl, setLogoUrl, color, setColor, roster, setRoster, onError }) => {
    const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>(() => parseRosterToArray(roster));

    // Update roster string when players change
    const handlePlayersChange = (players: RosterPlayer[]) => {
      setRosterPlayers(players);
      setRoster(convertRosterArrayToString(players));
    };

    // Sync when roster string changes externally (e.g., from file import or schedule import)
    useEffect(() => {
      const parsed = parseRosterToArray(roster);
      setRosterPlayers(parsed);
    }, [roster]);

    return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-yellow-300">{teamLabel}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
            <label htmlFor={`${teamLabel}-name`} className="block mb-2 text-sm font-medium text-gray-300">Team Name</label>
            <input
              id={`${teamLabel}-name`}
              type="text"
              value={name}
              onChange={(e) => {
                // Security: Sanitize team name on input
                const sanitized = sanitizeTeamName(e.target.value);
                setName(sanitized);
              }}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2.5"
              placeholder="Enter team name"
              maxLength={100}
            />
        </div>
        <div>
            <label htmlFor={`${teamLabel}-color`} className="block mb-2 text-sm font-medium text-gray-300">Color</label>
            <input
              id={`${teamLabel}-color`}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg block w-full h-10 p-1 cursor-pointer"
            />
        </div>
      </div>
       <div>
        <label htmlFor={`${teamLabel}-logo`} className="block mb-2 text-sm font-medium text-gray-300">Team Logo URL (Optional)</label>
        <input
          id={`${teamLabel}-logo`}
          type="text"
          value={logoUrl}
          onChange={(e) => {
            // Security: Validate and sanitize URL
            const sanitized = sanitizeTeamUrl(e.target.value);
            setLogoUrl(sanitized);
          }}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2.5"
          placeholder="https://example.com/logo.png"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-gray-300">Roster (Drag rows to reorder, click cells to edit)</label>
              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent('openRosterModal', { detail: { teamLabel } });
                  window.dispatchEvent(event);
                }}
                className="p-1.5 text-yellow-400 hover:text-yellow-300 transition-colors"
                title="Open roster in full-screen modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
            <label className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-1 px-3 rounded-md cursor-pointer transition-colors" title="Import roster from a CSV or TXT file">
                Import CSV
                <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv,.txt"
                    onChange={(e) => handleFileImport(e, setRoster, onError)}
                />
            </label>
        </div>
        <RosterTable players={rosterPlayers} onPlayersChange={handlePlayersChange} />
        <p className="mt-2 text-xs text-gray-400">
          Tip: Use 0 for batting order for bench players. For DH, give pitcher batting order 0.
        </p>
      </div>
    </div>
    );
});

const GameSetup: React.FC<GameSetupProps> = ({ onGameSetup, onUpdateSetupData, onCancelEdit, isEditing, initialState, onSettingsUpdate }) => {
  const [awayTeamName, setAwayTeamName] = useState('Emerald Dragons');
  const [homeTeamName, setHomeTeamName] = useState('Crimson Knights');
  const [awayTeamLogo, setAwayTeamLogo] = useState('');
  const [homeTeamLogo, setHomeTeamLogo] = useState('');
  const [awayTeamColor, setAwayTeamColor] = useState('#10B981');
  const [homeTeamColor, setHomeTeamColor] = useState('#EF4444');
  const [awayTeamRoster, setAwayTeamRoster] = useState(defaultAwayRoster);
  const [homeTeamRoster, setHomeTeamRoster] = useState(defaultHomeRoster);
  const [competition, setCompetition] = useState('Legends League - Season Opener');
  const [location, setLocation] = useState('Stadium of Champions');
  const [gameDate, setGameDate] = useState<string | Date | undefined>(undefined);
  const [scorekeeperName, setScorekeeperName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // State for game schedule fetching (provider-based)
  const [isScheduleFetchOpen, setIsScheduleFetchOpen] = useState(false);
  const [scheduleIsLoading, setScheduleIsLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gamesList, setGamesList] = useState<Array<{ id: number | string; title: string }>>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [schedulePayloads, setSchedulePayloads] = useState<SchedulePayloadOption[]>([]);
  const [selectedSchedulePayloadId, setSelectedSchedulePayloadId] = useState('');
  
  const [scheduleProvider, setScheduleProvider] = useState(() => getGameScheduleProvider());
  const auth = useKeycloakAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const orgId = useMemo(() => {
    const profile = auth?.user?.profile as Record<string, unknown> | undefined;
    const raw = profile?.org_id ?? profile?.orgId ?? profile?.organization_id ?? profile?.organizationId;
    if (Array.isArray(raw)) {
      return typeof raw[0] === 'string' ? raw[0] : undefined;
    }
    if (typeof raw === 'string') return raw;
    const attributes = profile?.attributes as Record<string, unknown> | undefined;
    const attrRaw = attributes?.org_id ?? attributes?.orgId;
    if (Array.isArray(attrRaw)) {
      return typeof attrRaw[0] === 'string' ? attrRaw[0] : undefined;
    }
    return typeof attrRaw === 'string' ? attrRaw : undefined;
  }, [auth?.user]);
  const profileName = useMemo(() => {
    const profile = auth?.user?.profile as Record<string, unknown> | undefined;
    const name = profile?.name;
    const preferredUsername = profile?.preferred_username;
    const email = profile?.email;
    const givenName = profile?.given_name;
    const familyName = profile?.family_name;
    if (typeof name === 'string' && name.trim()) return name.trim();
    if (typeof preferredUsername === 'string' && preferredUsername.trim()) return preferredUsername.trim();
    if (typeof email === 'string' && email.trim()) return email.trim();
    const combined = [givenName, familyName]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');
    return combined || undefined;
  }, [auth?.user]);
  
  // Check if schedule provider is configured (use state so it updates when window.__ENV__ becomes available)
  const [areScheduleCredentialsSet, setAreScheduleCredentialsSet] = useState(() => {
    return scheduleProvider.isConfigured();
  });
  
  // Re-check when component mounts (in case window.__ENV__ wasn't available initially)
  useEffect(() => {
    const checkCredentials = () => {
      const provider = getGameScheduleProvider();
      setScheduleProvider(provider);
      setAreScheduleCredentialsSet(provider.isConfigured());
    };
    
    // Check immediately
    checkCredentials();
    
    // Also check after a short delay in case window.__ENV__ is set asynchronously
    const timeout = setTimeout(checkCredentials, 100);
    
    return () => clearTimeout(timeout);
  }, []);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const isScheduleDisabled = scheduleProvider.provider === 'none';
  const scheduleProviderLabel = scheduleProvider.provider === 'pocketbase'
    ? 'PocketBase'
    : 'Game schedule';
  const scheduleConfigHint = scheduleProvider.provider === 'pocketbase'
    ? 'Set POCKETBASE_URL and SCHEDULE_PROVIDER=pocketbase to enable.'
    : 'Set SCHEDULE_PROVIDER to pocketbase and provider credentials to enable.';
  
  // Roster modal state
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [modalRosterTeam, setModalRosterTeam] = useState<'home' | 'away' | null>(null);

  // Listen for roster modal open events
  useEffect(() => {
    const handleOpenRosterModal = (event: CustomEvent) => {
      const teamLabel = (event.detail as { teamLabel: string }).teamLabel;
      if (teamLabel === 'Home Team') {
        setModalRosterTeam('home');
        setIsRosterModalOpen(true);
      } else if (teamLabel === 'Away Team') {
        setModalRosterTeam('away');
        setIsRosterModalOpen(true);
      }
    };

    window.addEventListener('openRosterModal', handleOpenRosterModal as EventListener);
    return () => {
      window.removeEventListener('openRosterModal', handleOpenRosterModal as EventListener);
    };
  }, []);

  useEffect(() => {
    // Only populate from initialState if we are editing a game that has already started.
    // The initial `setup` state should use the component's defaults.
    if (isEditing && initialState && initialState.gameStatus === 'playing') {
      setAwayTeamName(initialState.awayTeam.name);
      setHomeTeamName(initialState.homeTeam.name);
      setAwayTeamLogo(initialState.awayTeam.logoUrl || '');
      setHomeTeamLogo(initialState.homeTeam.logoUrl || '');
      setAwayTeamColor(initialState.awayTeam.color || '#10B981');
      setHomeTeamColor(initialState.homeTeam.color || '#EF4444');
      setAwayTeamRoster(initialState.awayRosterString);
      setHomeTeamRoster(initialState.homeRosterString);
      setCompetition(initialState.competition || '');
      setLocation(initialState.location || '');
      setGameDate(initialState.gameDate);
      setScorekeeperName(initialState.scorekeeperName || '');
    }
  }, [isEditing, initialState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awayTeamName || !homeTeamName || !awayTeamRoster || !homeTeamRoster || !competition || !location) {
        setError("All fields are required.");
        return;
    }

    const parseRoster = (rosterString: string) => rosterString.split('\n').filter(line => line.trim() !== '');
    
    const hasAwayDH = parseRoster(awayTeamRoster).some(p => p.split(',')[3]?.trim().toUpperCase() === 'DH');
    const awayBattersCount = hasAwayDH 
        ? parseRoster(awayTeamRoster).filter(p => !p.split(',')[3]?.trim().toUpperCase().includes('BENCH') && !p.split(',')[3]?.trim().toUpperCase().includes('P')).length
        : parseRoster(awayTeamRoster).filter(p => !p.split(',')[3]?.trim().toUpperCase().includes('BENCH')).length;

    const hasHomeDH = parseRoster(homeTeamRoster).some(p => p.split(',')[3]?.trim().toUpperCase() === 'DH');
    const homeBattersCount = hasHomeDH
        ? parseRoster(homeTeamRoster).filter(p => !p.split(',')[3]?.trim().toUpperCase().includes('BENCH') && !p.split(',')[3]?.trim().toUpperCase().includes('P')).length
        : parseRoster(homeTeamRoster).filter(p => !p.split(',')[3]?.trim().toUpperCase().includes('BENCH')).length;

    if (awayBattersCount < 9 || homeBattersCount < 9) {
        setError("Each team must have 9 players in the batting lineup.");
        return;
    }

    setError(null);
    onGameSetup(
      { name: homeTeamName, roster: homeTeamRoster, logoUrl: homeTeamLogo, color: homeTeamColor },
      { name: awayTeamName, roster: awayTeamRoster, logoUrl: awayTeamLogo, color: awayTeamColor },
      competition,
      location,
      selectedGameId,
      scorekeeperName,
      gameDate
    );
  };


  const handleScheduleConnect = async () => {
    setScheduleIsLoading(true);
    setScheduleError(null);
    setGamesList([]);
    try {
      if (scheduleProvider.provider === 'pocketbase') {
        const payloadOptions = await fetchSchedulePayloadOptions(orgId);
        setSchedulePayloads(payloadOptions);
        setSelectedSchedulePayloadId('');
        setSelectedGameId('');
      } else {
        const games = await scheduleProvider.fetchUserScheduledGames({ orgId });
        setGamesList(games);
      }
      setIsConnected(true);
    } catch (err) {
      if (err instanceof Error) {
        setScheduleError(err.message);
      } else {
        setScheduleError('An unknown error occurred during connection.');
      }
    } finally {
      setScheduleIsLoading(false);
    }
  };

  const handleScheduleFetch = async () => {
    if (!selectedGameId) {
      setScheduleError('Please select a game to fetch.');
      return;
    }
    setScheduleIsLoading(true);
    setScheduleError(null);
    try {
      const data = await scheduleProvider.fetchGameScheduleData(selectedGameId, { orgId, scheduleId: selectedSchedulePayloadId || undefined });
      setHomeTeamName(data.homeTeam.name);
      setHomeTeamRoster(data.homeTeam.roster || ''); // May be empty if rosters not in schema
      setHomeTeamLogo(data.homeTeam.logoUrl || '');
      setHomeTeamColor(data.homeTeam.color);
      
      setAwayTeamName(data.awayTeam.name);
      setAwayTeamRoster(data.awayTeam.roster || ''); // May be empty if rosters not in schema
      setAwayTeamLogo(data.awayTeam.logoUrl || '');
      setAwayTeamColor(data.awayTeam.color);

      setCompetition(data.competition);
      setLocation(data.location || ''); // May be empty if location not in schema
      setGameDate(data.gameDate); // Store game date from schedule provider

      // Update gameState with setup data so lower thirds can show it
      if (onUpdateSetupData) {
        onUpdateSetupData(
          { name: data.homeTeam.name, roster: data.homeTeam.roster || '', logoUrl: data.homeTeam.logoUrl || '', color: data.homeTeam.color },
          { name: data.awayTeam.name, roster: data.awayTeam.roster || '', logoUrl: data.awayTeam.logoUrl || '', color: data.awayTeam.color },
          data.competition,
          data.location || '',
          data.gameDate
        );
      }

      if (!data.homeTeam.roster || !data.awayTeam.roster) {
        setScheduleError('Note: Rosters were not found in the game schedule. Please add rosters manually.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setScheduleError(err.message);
      } else {
        setScheduleError('An unknown error occurred while fetching game data.');
      }
    } finally {
      setScheduleIsLoading(false);
    }
  };

  const handleScheduleDisconnect = () => {
    setIsConnected(false);
    setGamesList([]);
    setSelectedGameId('');
    setSchedulePayloads([]);
    setSelectedSchedulePayloadId('');
    setScheduleError(null);
  };

  return (
    <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg relative">
       {isEditing && initialState?.gameStatus !== 'setup' && (
          <button 
            onClick={onCancelEdit} 
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Resume Game"
            title="Resume Game"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
          </button>
        )}
        <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Open Display Settings"
            title="Display Settings"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>

        <div className={`absolute top-4 ${isEditing && initialState?.gameStatus !== 'setup' ? 'right-16' : 'right-4'}`}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Open user menu"
            title="User menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 2.015-8 4.5V20h16v-1.5c0-2.485-3.582-4.5-8-4.5z" />
            </svg>
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
              <div className="p-3 border-b border-gray-700">
                <div className="text-sm font-semibold text-white truncate">
                  {profileName || 'Signed in user'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Organization: {orgId || 'N/A'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => auth?.signoutRedirect?.()}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                Log out
              </button>
            </div>
          )}
        </div>

      <h2 className="text-2xl font-bold text-center mb-6">Game Setup</h2>

      <div className="bg-gray-900/50 rounded-lg mb-6 border border-gray-700">
        <button 
          onClick={() => setIsScheduleFetchOpen(!isScheduleFetchOpen)}
          className="w-full flex justify-between items-center text-left p-4"
          aria-expanded={isScheduleFetchOpen}
          title="Toggle Game Schedule Options"
        >
          <h3 className="text-lg font-bold text-sky-300 tracking-wider">Import from Game Schedule</h3>
          <div className='flex items-center gap-2'>
            <span className="text-xs text-gray-400">Optional</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform transform ${isScheduleFetchOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {isScheduleFetchOpen && (
          <div className="p-4 border-t border-gray-700 space-y-4">
            {isScheduleDisabled ? (
              <div className="p-3 bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg text-center">
                Game schedule integration is disabled. {scheduleConfigHint}
              </div>
            ) : !areScheduleCredentialsSet ? (
              <div className="p-3 bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg text-center">
                {scheduleProviderLabel} integration is not configured. {scheduleConfigHint}
              </div>
            ) : !isConnected ? (
            <>
              {scheduleError && <p className="text-red-400 text-center text-sm">{scheduleError}</p>}
              <div className="text-center">
                  <button type="button" onClick={handleScheduleConnect} disabled={scheduleIsLoading} className="text-white bg-sky-600 hover:bg-sky-700 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors disabled:opacity-50">
                      {scheduleIsLoading ? 'Connecting...' : 'Connect to Game Schedule'}
                  </button>
              </div>
            </>
            ) : (
            <>
              <div className="text-center text-green-400 font-bold">Successfully connected.</div>
              {schedulePayloads.length > 0 && (
                <div>
                  <label htmlFor="schedule-payload-select" className="block mb-2 text-sm font-medium text-gray-300">Select a Schedule</label>
                  <select
                    id="schedule-payload-select"
                    value={selectedSchedulePayloadId}
                    onChange={async (e) => {
                      const nextId = e.target.value;
                      setSelectedSchedulePayloadId(nextId);
                      setSelectedGameId('');
                      setGamesList([]);
                      setScheduleIsLoading(true);
                      setScheduleError(null);
                      try {
                        if (nextId) {
                          const games = await scheduleProvider.fetchUserScheduledGames({ orgId, scheduleId: nextId });
                          setGamesList(games);
                        }
                      } catch (err) {
                        if (err instanceof Error) {
                          setScheduleError(err.message);
                        } else {
                          setScheduleError('An unknown error occurred while fetching schedules.');
                        }
                      } finally {
                        setScheduleIsLoading(false);
                      }
                    }}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
                  >
                    <option value="">-- Choose a Schedule --</option>
                    {schedulePayloads.map((payload) => (
                      <option key={payload.id} value={payload.id}>{payload.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-4 items-end">
                <div className="flex-grow">
                    <label htmlFor="schedule-game-select" className="block mb-2 text-sm font-medium text-gray-300">Select a Scheduled Game</label>
                    <select id="schedule-game-select" value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5" disabled={schedulePayloads.length > 0 && !selectedSchedulePayloadId}>
                        <option value="">-- Choose a Game --</option>
                        {gamesList.length > 0 ? gamesList.map(game => (
                            <option key={game.id} value={game.id}>{game.title}</option>
                        )) : <option disabled>No scheduled games found.</option>}
                    </select>
                </div>
                 <button type="button" onClick={handleScheduleFetch} disabled={scheduleIsLoading || !selectedGameId} className="text-white bg-sky-600 hover:bg-sky-700 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors disabled:opacity-50 h-10">
                    {scheduleIsLoading ? 'Fetching...' : 'Fetch Selected Game'}
                </button>
              </div>
               {scheduleError && <p className={`text-center text-sm mt-2 ${scheduleError.includes('Note:') ? 'text-yellow-400' : 'text-red-400'}`}>{scheduleError}</p>}
              <div className="text-center mt-4">
                <button type="button" onClick={handleScheduleDisconnect} className="text-gray-300 hover:text-white text-xs underline">Disconnect</button>
              </div>
            </>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <div>
            <label htmlFor="competition" className="block mb-2 text-sm font-medium text-gray-300">Competition</label>
            <input
              id="competition"
              type="text"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2.5"
              placeholder="e.g., World Series Game 7"
            />
          </div>
          <div>
            <label htmlFor="location" className="block mb-2 text-sm font-medium text-gray-300">Location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2.5"
              placeholder="e.g., Yankee Stadium"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TeamInput teamLabel="Away Team" name={awayTeamName} setName={setAwayTeamName} logoUrl={awayTeamLogo} setLogoUrl={setAwayTeamLogo} color={awayTeamColor} setColor={setAwayTeamColor} roster={awayTeamRoster} setRoster={setAwayTeamRoster} onError={setError} />
          <TeamInput teamLabel="Home Team" name={homeTeamName} setName={setHomeTeamName} logoUrl={homeTeamLogo} setLogoUrl={setHomeTeamLogo} color={homeTeamColor} setColor={setHomeTeamColor} roster={homeTeamRoster} setRoster={setHomeTeamRoster} onError={setError} />
        </div>
        
        {error && <p className="text-red-500 text-center">{error}</p>}
        
        <div className="pt-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <label htmlFor="scorekeeper-name" className="text-sm font-medium text-gray-300 text-center">Scorekeeper Name</label>
              {profileName && (
                <button
                  type="button"
                  onClick={() => setScorekeeperName(profileName)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={`Use profile: ${profileName}`}
                  aria-label="Use profile name for scorekeeper"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 2.015-8 4.5V20h16v-1.5c0-2.485-3.582-4.5-8-4.5z" />
                  </svg>
                </button>
              )}
            </div>
            <input
              id="scorekeeper-name"
              type="text"
              value={scorekeeperName}
              onChange={(e) => setScorekeeperName(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full max-w-sm mx-auto p-2.5"
              placeholder="e.g., Jane Doe"
            />
        </div>

        <div className="text-center pt-4">
          <button
            type="submit"
            className="text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800 font-medium rounded-lg text-lg px-8 py-3 transition-colors"
            title={isEditing && initialState?.gameStatus !== 'setup' ? 'Save changes and return to the game' : 'Start the game with the current setup'}
          >
            {isEditing && initialState?.gameStatus !== 'setup' ? 'Save Changes' : 'Start Game'}
          </button>
        </div>
      </form>
      
      {initialState && (
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onSave={onSettingsUpdate}
            currentSettings={initialState.scoreboardSettings}
        />
      )}

      {/* Roster Editing Modal */}
      {isRosterModalOpen && modalRosterTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-2xl font-bold text-yellow-300">
                {modalRosterTeam === 'home' ? homeTeamName : awayTeamName} - Roster
              </h3>
              <button
                onClick={() => {
                  setIsRosterModalOpen(false);
                  setModalRosterTeam(null);
                }}
                className="text-gray-400 hover:text-white transition-colors p-2"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <RosterTable
                players={modalRosterTeam === 'home' 
                  ? parseRosterToArray(homeTeamRoster)
                  : parseRosterToArray(awayTeamRoster)}
                onPlayersChange={(players) => {
                  const rosterString = convertRosterArrayToString(players);
                  if (modalRosterTeam === 'home') {
                    setHomeTeamRoster(rosterString);
                  } else {
                    setAwayTeamRoster(rosterString);
                  }
                }}
              />
              <p className="mt-4 text-sm text-gray-400">
                Tip: Use 0 for batting order for bench players. For DH, give pitcher batting order 0.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSetup;