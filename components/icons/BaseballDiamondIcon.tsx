
import React from 'react';

interface BaseballDiamondProps {
  isFirstOccupied: boolean;
  isSecondOccupied: boolean;
  isThirdOccupied: boolean;
}

export const BaseballDiamondIcon: React.FC<BaseballDiamondProps> = ({
  isFirstOccupied,
  isSecondOccupied,
  isThirdOccupied,
}) => {
  const emptyColor   = 'rgba(255,255,255,0.15)';
  const occupiedColor = '#fbbf24';

  return (
    <svg viewBox="-15 -15 90 90" className="w-full h-full" style={{ display: 'block' }}>
      {/* Second base – top center */}
      <rect
        x="19" y="1" width="22" height="22"
        transform="rotate(45 30 12)"
        fill={isSecondOccupied ? occupiedColor : emptyColor}
        stroke="rgba(255,255,255,0.4)" strokeWidth="0.9"
      />
      {/* Third base – left */}
      <rect
        x="1" y="33" width="22" height="22"
        transform="rotate(45 12 44)"
        fill={isThirdOccupied ? occupiedColor : emptyColor}
        stroke="rgba(255,255,255,0.4)" strokeWidth="0.9"
      />
      {/* First base – right */}
      <rect
        x="37" y="33" width="22" height="22"
        transform="rotate(45 48 44)"
        fill={isFirstOccupied ? occupiedColor : emptyColor}
        stroke="rgba(255,255,255,0.4)" strokeWidth="0.9"
      />
    </svg>
  );
};
