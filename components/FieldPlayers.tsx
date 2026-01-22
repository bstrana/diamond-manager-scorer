import React, { useState, useRef, useCallback } from 'react';
import type { GameState, Player } from '../types';
import './NameTagAnimations.css';

interface FieldPlayersProps {
  gameState: GameState;
}

interface PositionState {
  [key: string]: { left: number; top: number };
}

// Position mapping for field display
// Field is 900x808 pixels, centered in 1920x1080 image
// Field starts at: left 510px (26.5625%), top 136px (12.5926%)
// Field area: 900px wide (46.875%), 808px tall (74.8148%)
// Positions are relative to the field area, then offset to image coordinates
const calculatePosition = (fieldX: number, fieldY: number) => {
  // Convert field coordinates (0-900, 0-808) to image coordinates (0-1920, 0-1080)
  const imageX = 26.5625 + (fieldX / 900) * 46.875; // 26.5625% + (fieldX/900) * 46.875%
  const imageY = 12.5926 + (fieldY / 808) * 74.8148; // 12.5926% + (fieldY/808) * 74.8148%
  return { left: `${imageX}%`, top: `${imageY}%` };
};

const positionMap: Record<string, { left: string; top: string; label: string }> = {
  'P': { ...calculatePosition(450, 404), label: 'P' },      // Pitcher's mound - center of field (450, 404)
  'C': { ...calculatePosition(450, 750), label: 'C' },      // Catcher - near home plate (450, 750)
  '1B': { ...calculatePosition(700, 200), label: '1B' },    // First base - right side (700, 200)
  '2B': { ...calculatePosition(450, 100), label: '2B' },      // Second base - top center (450, 100)
  'SS': { ...calculatePosition(250, 100), label: 'SS' },     // Shortstop - left of 2B (250, 100)
  '3B': { ...calculatePosition(200, 200), label: '3B' },     // Third base - left side (200, 200)
  'LF': { ...calculatePosition(100, 50), label: 'LF' },     // Left field - deep left (100, 50)
  'CF': { ...calculatePosition(450, 20), label: 'CF' },     // Center field - deep center (450, 20)
  'RF': { ...calculatePosition(800, 50), label: 'RF' },      // Right field - deep right (800, 50)
};

// Get player by position from roster
const getPlayerByPosition = (roster: Player[], position: string, currentPitcher?: Player): Player | null => {
  const pos = position.toUpperCase();
  
  // For pitcher, check currentPitcher first, then roster
  if (pos === 'P' && currentPitcher) {
    return currentPitcher;
  }
  
  // For all positions, find in roster (defensive positions may have battingOrder 0)
  return roster.find(p => {
    const playerPos = p.position.toUpperCase();
    return playerPos === pos;
  }) || null;
};

const FieldPlayers: React.FC<FieldPlayersProps> = ({ gameState }) => {
  const { homeTeam, awayTeam, isTopInning, currentPitcher, scoreboardSettings } = gameState;
  const isLocked = scoreboardSettings?.lockOverlayPositions ?? false;
  const accentColor = scoreboardSettings?.nameTagAccentColor || '#facc15';
  
  // Debug: Log lock state changes and clear drag state if locked
  React.useEffect(() => {
    console.log('[FieldPlayers] Lock state:', isLocked, 'Settings:', scoreboardSettings);
    if (isLocked && dragState.current) {
      // Clear any active drag if lock is enabled
      dragState.current = null;
    }
  }, [isLocked, scoreboardSettings]);
  
  // The defensive team is the one NOT batting
  // When game is in setup, show home team as defensive (they're typically shown first)
  const defensiveTeam = (gameState.gameStatus === 'setup') ? homeTeam : (isTopInning ? homeTeam : awayTeam);
  const battingTeam = (gameState.gameStatus === 'setup') ? awayTeam : (isTopInning ? awayTeam : homeTeam);
  
  // Get current pitcher for defensive team
  // When game is in setup, use home team's pitcher or find first pitcher in roster
  const defensivePitcher = (gameState.gameStatus === 'setup') 
    ? (currentPitcher.home?.id ? currentPitcher.home : defensiveTeam.roster.find(p => p.position.toUpperCase() === 'P') || undefined)
    : (isTopInning ? currentPitcher.home : currentPitcher.away);
  
  // Get players by position
  const pitcher = getPlayerByPosition(defensiveTeam.roster, 'P', defensivePitcher);
  const catcher = getPlayerByPosition(defensiveTeam.roster, 'C');
  const firstBase = getPlayerByPosition(defensiveTeam.roster, '1B');
  const secondBase = getPlayerByPosition(defensiveTeam.roster, '2B');
  const shortstop = getPlayerByPosition(defensiveTeam.roster, 'SS');
  const thirdBase = getPlayerByPosition(defensiveTeam.roster, '3B');
  const leftField = getPlayerByPosition(defensiveTeam.roster, 'LF');
  const centerField = getPlayerByPosition(defensiveTeam.roster, 'CF');
  const rightField = getPlayerByPosition(defensiveTeam.roster, 'RF');

  // State for custom positions (stored in localStorage)
  const [customPositions, setCustomPositions] = useState<PositionState>(() => {
    try {
      const saved = localStorage.getItem('fieldPlayersPositions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Get position for a player (custom or default)
  const getPosition = useCallback((pos: string) => {
    if (customPositions[pos]) {
      return customPositions[pos];
    }
    const defaultPos = positionMap[pos];
    if (!defaultPos) return { left: 50, top: 50 };
    // Convert percentage to number for easier manipulation
    return {
      left: parseFloat(defaultPos.left),
      top: parseFloat(defaultPos.top),
    };
  }, [customPositions]);

  // Save position to localStorage
  const savePosition = useCallback((pos: string, left: number, top: number) => {
    setCustomPositions(prev => {
      const updated = { ...prev, [pos]: { left, top } };
      localStorage.setItem('fieldPlayersPositions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Drag handlers
  const dragState = useRef<{ pos: string; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, pos: string) => {
    if (isLocked) return; // Don't allow dragging if locked
    e.preventDefault();
    const position = getPosition(pos);
    dragState.current = {
      pos,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: position.left,
      startTop: position.top,
    };
  }, [getPosition, isLocked]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current || isLocked) return;
    
    const container = document.querySelector('[data-field-container]') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.current.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.current.startY) / rect.height) * 100;
    
    const newLeft = Math.max(0, Math.min(100, dragState.current.startLeft + deltaX));
    const newTop = Math.max(0, Math.min(100, dragState.current.startTop + deltaY));
    
    savePosition(dragState.current.pos, newLeft, newTop);
  }, [savePosition, isLocked]);

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
  }, []);

  // Set up global mouse event listeners for dragging
  React.useEffect(() => {
    if (isLocked) {
      // If locked, don't set up drag listeners
      return;
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isLocked]);

  const players = [
    { pos: 'P', player: pitcher },
    { pos: 'C', player: catcher },
    { pos: '1B', player: firstBase },
    { pos: '2B', player: secondBase },
    { pos: 'SS', player: shortstop },
    { pos: '3B', player: thirdBase },
    { pos: 'LF', player: leftField },
    { pos: 'CF', player: centerField },
    { pos: 'RF', player: rightField },
  ];

  return (
    <div className="bg-transparent text-white font-sans" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Field Diagram Container */}
      <div 
        data-field-container
        className="relative" 
        style={{ 
          width: '100vw',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Player Positions Overlay */}
        {players.map(({ pos, player }, index) => {
          const position = positionMap[pos];
          if (!position) return null;
          
          const customPos = getPosition(pos);
          const delayClass = `name-tag-enter${index > 0 ? `-delay-${Math.min(index, 9)}` : ''}`;
          
          return (
            <div
              key={pos}
              onMouseDown={(e) => handleMouseDown(e, pos)}
              className={delayClass}
              style={{
                position: 'absolute',
                left: `${customPos.left}%`,
                top: `${customPos.top}%`,
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: 10,
                cursor: isLocked ? 'default' : 'move',
                userSelect: 'none',
              }}
            >
              {/* Position Rectangle Background */}
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: player ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.5)',
                  border: `2px solid ${player ? accentColor : 'rgba(255, 255, 255, 0.6)'}`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Position Label */}
                <div
                  style={{
                    fontSize: 'clamp(12px, 1.6vw, 18px)',
                    fontWeight: 'bold',
                    color: player ? accentColor : 'rgba(255, 255, 255, 0.95)',
                    lineHeight: '1',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {position.label}
                </div>
                
                {/* Player Info */}
                {player ? (
                  <>
                    <div
                      style={{
                        fontSize: 'clamp(16px, 2.2vw, 24px)',
                        fontWeight: 'bold',
                        color: accentColor,
                        lineHeight: '1',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      #{player.number}
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(12px, 1.6vw, 18px)',
                        color: '#ffffff',
                        lineHeight: '1',
                        fontWeight: '600',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                      }}
                    >
                      {player.name}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: 'clamp(14px, 1.8vw, 18px)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      lineHeight: '1',
                    }}
                  >
                    -
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default FieldPlayers;

