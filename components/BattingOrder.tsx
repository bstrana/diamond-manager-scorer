import React, { useState, useRef, useCallback } from 'react';
import type { GameState, Player } from '../types';
import './NameTagAnimations.css';

interface BattingOrderProps {
  gameState: GameState;
}

interface PositionState {
  [key: string]: { left: number; top: number };
}

// Get active lineup (players with batting order > 0)
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

const BattingOrder: React.FC<BattingOrderProps> = ({ gameState }) => {
  const { homeTeam, awayTeam, isTopInning, scoreboardSettings } = gameState;
  const isLocked = scoreboardSettings?.lockOverlayPositions ?? false;
  const accentColor = scoreboardSettings?.nameTagAccentColor || '#facc15';
  
  // Convert hex to rgba with opacity for current batter background
  const hexToRgba = (hex: string, opacity: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  const accentColorRgba = hexToRgba(accentColor, 0.9);
  
  // Debug: Log lock state changes and clear drag state if locked
  React.useEffect(() => {
    console.log('[BattingOrder] Lock state:', isLocked, 'Settings:', scoreboardSettings);
    if (isLocked && dragState.current) {
      // Clear any active drag if lock is enabled
      dragState.current = null;
    }
  }, [isLocked, scoreboardSettings]);
  
  // The batting team is the one currently at bat
  const battingTeam = isTopInning ? awayTeam : homeTeam;
  const activeLineup = getActiveLineup(battingTeam.roster);

  // State for custom positions (stored in localStorage)
  const [customPositions, setCustomPositions] = useState<PositionState>(() => {
    try {
      const saved = localStorage.getItem('battingOrderPositions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Default positions for batting order (vertical list on left side)
  const getDefaultPosition = useCallback((index: number) => {
    return {
      left: 5 + (index % 2) * 15, // Alternate between left and right columns
      top: 10 + Math.floor(index / 2) * 8, // Stack vertically
    };
  }, []);

  // Get position for a player (custom or default)
  const getPosition = useCallback((index: number) => {
    const key = `order-${index}`;
    if (customPositions[key]) {
      return customPositions[key];
    }
    return getDefaultPosition(index);
  }, [customPositions, getDefaultPosition]);

  // Save position to localStorage
  const savePosition = useCallback((index: number, left: number, top: number) => {
    const key = `order-${index}`;
    setCustomPositions(prev => {
      const updated = { ...prev, [key]: { left, top } };
      localStorage.setItem('battingOrderPositions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Drag handlers
  const dragState = useRef<{ index: number; startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (isLocked) return; // Don't allow dragging if locked
    e.preventDefault();
    const position = getPosition(index);
    dragState.current = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: position.left,
      startTop: position.top,
    };
  }, [getPosition, isLocked]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current || isLocked) return;
    
    const container = document.querySelector('[data-batting-order-container]') as HTMLElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.current.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.current.startY) / rect.height) * 100;
    
    const newLeft = Math.max(0, Math.min(100, dragState.current.startLeft + deltaX));
    const newTop = Math.max(0, Math.min(100, dragState.current.startTop + deltaY));
    
    savePosition(dragState.current.index, newLeft, newTop);
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

  // Get current batter index
  const currentBatterIndex = isTopInning ? gameState.currentBatterIndex.away : gameState.currentBatterIndex.home;

  return (
    <div className="bg-transparent text-white font-sans" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Batting Order Overlay */}
      <div 
        data-batting-order-container
        className="relative" 
        style={{ 
          width: '100vw',
          height: '100vh',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Batting Order Tags */}
        {activeLineup.map((player, index) => {
          const customPos = getPosition(index);
          const isCurrentBatter = index === currentBatterIndex;
          const delayClass = `name-tag-enter${index > 0 ? `-delay-${Math.min(index, 9)}` : ''}`;
          
          return (
            <div
              key={player.id || `order-${index}`}
              onMouseDown={(e) => handleMouseDown(e, index)}
              className={delayClass}
              style={{
                position: 'absolute',
                left: `${customPos.left}%`,
                top: `${customPos.top}%`,
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                zIndex: isCurrentBatter ? 20 : 10,
                cursor: isLocked ? 'default' : 'move',
                userSelect: 'none',
              }}
            >
              {/* Position Rectangle Background */}
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: isCurrentBatter ? accentColorRgba : 'rgba(0, 0, 0, 0.85)',
                  border: `2px solid ${isCurrentBatter ? '#ffffff' : accentColor}`,
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
                {/* Batting Order Number */}
                <div
                  style={{
                    fontSize: 'clamp(12px, 1.6vw, 18px)',
                    fontWeight: 'bold',
                    color: isCurrentBatter ? '#000' : accentColor,
                    lineHeight: '1',
                    textShadow: isCurrentBatter ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.8)',
                    minWidth: '20px',
                  }}
                >
                  {index + 1}
                </div>
                
                {/* Position Label */}
                <div
                  style={{
                    fontSize: 'clamp(12px, 1.6vw, 18px)',
                    fontWeight: 'bold',
                    color: isCurrentBatter ? '#000' : accentColor,
                    lineHeight: '1',
                    textShadow: isCurrentBatter ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {player.position}
                </div>
                
                {/* Jersey Number */}
                <div
                  style={{
                    fontSize: 'clamp(16px, 2.2vw, 24px)',
                    fontWeight: 'bold',
                    color: isCurrentBatter ? '#000' : accentColor,
                    lineHeight: '1',
                    textShadow: isCurrentBatter ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  #{player.number}
                </div>
                
                {/* Player Name */}
                <div
                  style={{
                    fontSize: 'clamp(12px, 1.6vw, 18px)',
                    color: isCurrentBatter ? '#000' : '#ffffff',
                    lineHeight: '1',
                    fontWeight: '600',
                    textShadow: isCurrentBatter ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {player.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BattingOrder;

