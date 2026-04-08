
import React from 'react';

interface BaseballDiamondProps {
  isFirstOccupied: boolean;
  isSecondOccupied: boolean;
  isThirdOccupied: boolean;
  baseSize?: number; // Optional: size of each base square (default: 16 for main scoreboard)
  compact?: boolean; // Tighter base spacing for overlay use
}

export const BaseballDiamondIcon: React.FC<BaseballDiamondProps> = ({
  isFirstOccupied,
  isSecondOccupied,
  isThirdOccupied,
  baseSize = 16,
  compact = false,
}) => {
  const baseColor = 'rgba(255, 255, 255, 0.3)';
  const occupiedColor = '#facc15'; // yellow-400

  const isLarge = baseSize >= 30;
  const padding = compact ? 4 : isLarge ? 20 : 5;
  const viewBoxSize = 100 + (padding * 2);

  // Compact mode uses tighter base positions (less spread)
  const firstX  = compact ? 68 : isLarge ? 70 : 82;
  const firstY  = compact ? 34 : isLarge ? 30 : 42;
  const secondX = compact ? 34 : isLarge ? 30 : 42;
  const secondY = compact ?  0 : isLarge ? -10 : 2;
  const thirdX  = compact ?  0 : isLarge ? -10 : 2;
  const thirdY  = compact ? 34 : isLarge ? 30 : 42;

  return (
    <svg 
      viewBox={`-${padding} -${padding} ${viewBoxSize} ${viewBoxSize}`} 
      className="w-full h-full" 
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Bases - size varies based on baseSize prop */}
      <rect 
        x={firstX} 
        y={firstY} 
        width={baseSize} 
        height={baseSize} 
        fill={isFirstOccupied ? occupiedColor : baseColor} 
        transform="rotate(45 90 50)" 
      /> {/* First */}
      <rect 
        x={secondX} 
        y={secondY} 
        width={baseSize} 
        height={baseSize} 
        fill={isSecondOccupied ? occupiedColor : baseColor} 
        transform="rotate(45 50 10)" 
      /> {/* Second */}
      <rect 
        x={thirdX} 
        y={thirdY} 
        width={baseSize} 
        height={baseSize} 
        fill={isThirdOccupied ? occupiedColor : baseColor} 
        transform="rotate(45 10 50)" 
      /> {/* Third */}
    </svg>
  );
};