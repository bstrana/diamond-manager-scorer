import React, { useState } from 'react';
import type { HitDescription, FieldDirection, PositionGap, InfieldPosition, HitTrajectory } from '../types';

interface VisualFieldDiagramProps {
  onLocationSelect: (description: Partial<HitDescription>) => void;
  selectedDescription?: Partial<HitDescription>;
  trajectory: HitTrajectory;
}

type FieldClickArea = 
  | { type: 'outfield'; direction: FieldDirection }
  | { type: 'infield_position'; position: InfieldPosition }
  | { type: 'position_gap'; gap: PositionGap }
  | { type: 'special'; location: 'left_line' | 'right_line' | 'third_base_line' | 'first_base_line' | 'up_middle' | 'through_box' };

const VisualFieldDiagram: React.FC<VisualFieldDiagramProps> = ({ 
  onLocationSelect, 
  selectedDescription,
  trajectory 
}) => {
  const [hoveredArea, setHoveredArea] = useState<FieldClickArea | null>(null);

  const handleFieldClick = (area: FieldClickArea) => {
    let description: Partial<HitDescription> = {
      trajectory: selectedDescription?.trajectory || trajectory,
    };

    if (area.type === 'outfield') {
      description.locationType = 'outfield';
      description.fieldDirection = area.direction;
      // Set depth based on trajectory
      if (trajectory === 'fly_ball' || trajectory === 'popup' || trajectory === 'line_drive') {
        description.depth = selectedDescription?.depth || 'medium';
      }
    } else if (area.type === 'infield_position') {
      description.locationType = 'infield_position';
      description.infieldPosition = area.position;
    } else if (area.type === 'position_gap') {
      description.locationType = 'position_gap';
      description.positionGap = area.gap;
    } else if (area.type === 'special') {
      description.locationType = 'special';
      description.specialLocation = area.location;
    }

    onLocationSelect(description);
  };

  const getAreaLabel = (area: FieldClickArea): string => {
    if (area.type === 'outfield') {
      const labels: Record<FieldDirection, string> = {
        left: 'Left Field',
        left_center: 'Left-Center',
        center: 'Center Field',
        right_center: 'Right-Center',
        right: 'Right Field',
      };
      return labels[area.direction];
    } else if (area.type === 'infield_position') {
      const labels: Record<InfieldPosition, string> = {
        pitcher: 'To Pitcher',
        catcher: 'To Catcher',
        first: 'To 1B',
        second: 'To 2B',
        shortstop: 'To SS',
        third: 'To 3B',
      };
      return labels[area.position];
    } else if (area.type === 'position_gap') {
      const labels: Record<PositionGap, string> = {
        ss_3b: 'Between SS & 3B',
        '1b_2b': 'Between 1B & 2B',
        '2b_ss': 'Between 2B & SS',
        '3b_ss': 'Between 3B & SS',
        pitcher_mound: 'Through Box',
        up_middle: 'Up the Middle',
      };
      return labels[area.gap];
    } else {
      const labels: Record<string, string> = {
        left_line: 'Down Left Line',
        right_line: 'Down Right Line',
        up_middle: 'Up the Middle',
        through_box: 'Through Box',
      };
      return labels[area.location] || area.location;
    }
  };

  const isAreaSelected = (area: FieldClickArea): boolean => {
    if (!selectedDescription) return false;
    
    if (area.type === 'outfield' && selectedDescription.locationType === 'outfield') {
      return selectedDescription.fieldDirection === area.direction;
    }
    if (area.type === 'infield_position' && selectedDescription.locationType === 'infield_position') {
      return selectedDescription.infieldPosition === area.position;
    }
    if (area.type === 'position_gap' && selectedDescription.locationType === 'position_gap') {
      return selectedDescription.positionGap === area.gap;
    }
    if (area.type === 'special' && selectedDescription.locationType === 'special') {
      // Handle backward compatibility with left_line/right_line
      if (area.location === 'third_base_line' && selectedDescription.specialLocation === 'left_line') return true;
      if (area.location === 'first_base_line' && selectedDescription.specialLocation === 'right_line') return true;
      return selectedDescription.specialLocation === area.location;
    }
    return false;
  };

  // Field dimensions (scaled for SVG)
  const fieldWidth = 500;
  const fieldHeight = 400;
  const centerX = fieldWidth / 2;
  const centerY = fieldHeight;
  const infieldRadius = 140; // Increased from 110 to make infield bigger
  const outfieldDepth = 160; // Reduced from 180 to accommodate larger infield
  const baseDistance = 110; // Increased from 85 to make bases further apart

  // Calculate base positions (from home plate at bottom center)
  const homeX = centerX;
  const homeY = centerY;
  const firstX = centerX + baseDistance * 0.7;
  const firstY = centerY - baseDistance * 0.7;
  const secondX = centerX;
  const secondY = centerY - baseDistance * 1.4;
  const thirdX = centerX - baseDistance * 0.7;
  const thirdY = centerY - baseDistance * 0.7;

  return (
    <div className="w-full">
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-lg">
        <p className="text-sm text-gray-300 mb-3 text-center font-medium">
          Click on the field where the ball went
        </p>
        <div className="flex justify-center bg-gradient-to-b from-gray-900/50 to-gray-800/30 rounded-lg p-3 shadow-inner">
          <svg
            width={fieldWidth}
            height={fieldHeight}
            viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}
            className="border-2 border-gray-500 rounded-lg shadow-xl"
            style={{ maxWidth: '100%', height: 'auto', filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
          >
            {/* Enhanced Gradients and Patterns */}
            <defs>
              {/* Grass texture pattern */}
              <pattern id="grassPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="1.5" fill="rgba(34, 197, 94, 0.15)" />
                <circle cx="5" cy="10" r="1" fill="rgba(22, 163, 74, 0.1)" />
                <circle cx="25" cy="20" r="1" fill="rgba(22, 163, 74, 0.1)" />
              </pattern>
              
              {/* Enhanced outfield gradient */}
              <linearGradient id="outfieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.25)" />
                <stop offset="50%" stopColor="rgba(22, 163, 74, 0.3)" />
                <stop offset="100%" stopColor="rgba(21, 128, 61, 0.35)" />
              </linearGradient>
              
              {/* Infield dirt gradient */}
              <radialGradient id="infieldDirt" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(160, 82, 45, 0.5)" />
                <stop offset="100%" stopColor="rgba(139, 69, 19, 0.6)" />
              </radialGradient>
              
              {/* Selection glow effect */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Hover glow effect */}
              <filter id="hoverGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Outfield Background with texture */}
            <rect x="0" y="0" width={fieldWidth} height={outfieldDepth} fill="url(#outfieldGradient)" />
            <rect x="0" y="0" width={fieldWidth} height={outfieldDepth} fill="url(#grassPattern)" opacity="0.3" />
            
            {/* Outfield Areas */}
            {/* Left Field */}
            <polygon
              points={`0,0 ${fieldWidth * 0.28},0 ${fieldWidth * 0.28},${outfieldDepth} ${thirdX - 20},${thirdY} 0,${outfieldDepth}`}
              fill={isAreaSelected({ type: 'outfield', direction: 'left' }) 
                ? 'rgba(252, 211, 77, 0.5)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left' 
                  ? 'rgba(252, 211, 77, 0.25)' 
                  : 'transparent'}
              stroke={isAreaSelected({ type: 'outfield', direction: 'left' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left'
                  ? 'rgba(252, 211, 77, 0.6)'
                  : 'rgba(255, 255, 255, 0.2)'}
              strokeWidth={isAreaSelected({ type: 'outfield', direction: 'left' }) ? 3 : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left' ? 2 : 1.5}
              filter={isAreaSelected({ type: 'outfield', direction: 'left' }) ? 'url(#glow)' : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'outfield', direction: 'left' })}
              onMouseEnter={() => setHoveredArea({ type: 'outfield', direction: 'left' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={fieldWidth * 0.14} 
              y={outfieldDepth / 2} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'outfield', direction: 'left' }) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.85)'} 
              fontSize="16" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
            >
              LF
            </text>

            {/* Left-Center */}
            <polygon
              points={`${fieldWidth * 0.28},0 ${fieldWidth * 0.42},0 ${fieldWidth * 0.42},${outfieldDepth} ${fieldWidth * 0.28},${outfieldDepth}`}
              fill={isAreaSelected({ type: 'outfield', direction: 'left_center' }) 
                ? 'rgba(252, 211, 77, 0.5)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left_center' 
                  ? 'rgba(252, 211, 77, 0.25)' 
                  : 'transparent'}
              stroke={isAreaSelected({ type: 'outfield', direction: 'left_center' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left_center'
                  ? 'rgba(252, 211, 77, 0.6)'
                  : 'rgba(255, 255, 255, 0.2)'}
              strokeWidth={isAreaSelected({ type: 'outfield', direction: 'left_center' }) ? 3 : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left_center' ? 2 : 1.5}
              filter={isAreaSelected({ type: 'outfield', direction: 'left_center' }) ? 'url(#glow)' : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'left_center' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'outfield', direction: 'left_center' })}
              onMouseEnter={() => setHoveredArea({ type: 'outfield', direction: 'left_center' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={fieldWidth * 0.35} 
              y={outfieldDepth / 2} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'outfield', direction: 'left_center' }) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.85)'} 
              fontSize="14" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
            >
              LC
            </text>

            {/* Center Field - Made wider */}
            <polygon
              points={`${fieldWidth * 0.42},0 ${fieldWidth * 0.58},0 ${fieldWidth * 0.58},${outfieldDepth} ${fieldWidth * 0.42},${outfieldDepth}`}
              fill={isAreaSelected({ type: 'outfield', direction: 'center' }) 
                ? 'rgba(252, 211, 77, 0.5)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'center' 
                  ? 'rgba(252, 211, 77, 0.25)' 
                  : 'transparent'}
              stroke={isAreaSelected({ type: 'outfield', direction: 'center' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'center'
                  ? 'rgba(252, 211, 77, 0.6)'
                  : 'rgba(255, 255, 255, 0.2)'}
              strokeWidth={isAreaSelected({ type: 'outfield', direction: 'center' }) ? 3 : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'center' ? 2 : 1.5}
              filter={isAreaSelected({ type: 'outfield', direction: 'center' }) ? 'url(#glow)' : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'center' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'outfield', direction: 'center' })}
              onMouseEnter={() => setHoveredArea({ type: 'outfield', direction: 'center' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={fieldWidth * 0.5} 
              y={outfieldDepth / 2} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'outfield', direction: 'center' }) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.85)'} 
              fontSize="16" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
            >
              CF
            </text>

            {/* Right-Center */}
            <polygon
              points={`${fieldWidth * 0.58},0 ${fieldWidth * 0.72},0 ${fieldWidth * 0.72},${outfieldDepth} ${fieldWidth * 0.58},${outfieldDepth}`}
              fill={isAreaSelected({ type: 'outfield', direction: 'right_center' }) 
                ? 'rgba(252, 211, 77, 0.5)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right_center' 
                  ? 'rgba(252, 211, 77, 0.25)' 
                  : 'transparent'}
              stroke={isAreaSelected({ type: 'outfield', direction: 'right_center' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right_center'
                  ? 'rgba(252, 211, 77, 0.6)'
                  : 'rgba(255, 255, 255, 0.2)'}
              strokeWidth={isAreaSelected({ type: 'outfield', direction: 'right_center' }) ? 3 : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right_center' ? 2 : 1.5}
              filter={isAreaSelected({ type: 'outfield', direction: 'right_center' }) ? 'url(#glow)' : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right_center' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'outfield', direction: 'right_center' })}
              onMouseEnter={() => setHoveredArea({ type: 'outfield', direction: 'right_center' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={fieldWidth * 0.65} 
              y={outfieldDepth / 2} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'outfield', direction: 'right_center' }) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.85)'} 
              fontSize="14" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
            >
              RC
            </text>

            {/* Right Field */}
            <polygon
              points={`${fieldWidth * 0.72},0 ${fieldWidth},0 ${fieldWidth},${outfieldDepth} ${firstX + 20},${firstY} ${fieldWidth * 0.72},${outfieldDepth}`}
              fill={isAreaSelected({ type: 'outfield', direction: 'right' }) 
                ? 'rgba(252, 211, 77, 0.5)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right' 
                  ? 'rgba(252, 211, 77, 0.25)' 
                  : 'transparent'}
              stroke={isAreaSelected({ type: 'outfield', direction: 'right' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right'
                  ? 'rgba(252, 211, 77, 0.6)'
                  : 'rgba(255, 255, 255, 0.2)'}
              strokeWidth={isAreaSelected({ type: 'outfield', direction: 'right' }) ? 3 : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right' ? 2 : 1.5}
              filter={isAreaSelected({ type: 'outfield', direction: 'right' }) ? 'url(#glow)' : hoveredArea?.type === 'outfield' && hoveredArea.direction === 'right' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'outfield', direction: 'right' })}
              onMouseEnter={() => setHoveredArea({ type: 'outfield', direction: 'right' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={fieldWidth * 0.86} 
              y={outfieldDepth / 2} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'outfield', direction: 'right' }) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.85)'} 
              fontSize="16" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
            >
              RF
            </text>

            {/* Infield Arc (Dirt) */}
            <path
              d={`M ${homeX} ${homeY} 
                  L ${firstX} ${firstY} 
                  A ${infieldRadius} ${infieldRadius} 0 0 1 ${secondX} ${secondY}
                  A ${infieldRadius} ${infieldRadius} 0 0 1 ${thirdX} ${thirdY}
                  A ${infieldRadius} ${infieldRadius} 0 0 1 ${homeX} ${homeY} Z`}
              fill="url(#infieldDirt)"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2.5"
            />

            {/* Base Paths - Enhanced */}
            <line x1={homeX} y1={homeY} x2={firstX} y2={firstY} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" strokeDasharray="4,4" />
            <line x1={firstX} y1={firstY} x2={secondX} y2={secondY} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" strokeDasharray="4,4" />
            <line x1={secondX} y1={secondY} x2={thirdX} y2={thirdY} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" strokeDasharray="4,4" />
            <line x1={thirdX} y1={thirdY} x2={homeX} y2={homeY} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" strokeDasharray="4,4" />

            {/* Bases - Enhanced with shadows */}
            <rect x={firstX - 10} y={firstY - 10} width="20" height="20" fill="rgba(255, 255, 255, 0.95)" stroke="rgba(0, 0, 0, 0.4)" strokeWidth="1.5" rx="2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
            <rect x={secondX - 10} y={secondY - 10} width="20" height="20" fill="rgba(255, 255, 255, 0.95)" stroke="rgba(0, 0, 0, 0.4)" strokeWidth="1.5" rx="2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
            <rect x={thirdX - 10} y={thirdY - 10} width="20" height="20" fill="rgba(255, 255, 255, 0.95)" stroke="rgba(0, 0, 0, 0.4)" strokeWidth="1.5" rx="2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }} />
            
            {/* Home Plate - Enhanced */}
            <polygon
              points={`${homeX},${homeY} ${homeX + 10},${homeY - 6} ${homeX},${homeY - 12} ${homeX - 10},${homeY - 6}`}
              fill="rgba(255, 255, 255, 0.95)"
              stroke="rgba(0, 0, 0, 0.4)"
              strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
            />

            {/* Infield Positions */}
            {/* Pitcher */}
            <circle
              cx={centerX}
              cy={centerY - 60}
              r={16}
              fill={isAreaSelected({ type: 'infield_position', position: 'pitcher' }) 
                ? 'rgba(252, 211, 77, 0.95)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'pitcher' 
                  ? 'rgba(252, 211, 77, 0.6)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              stroke={isAreaSelected({ type: 'infield_position', position: 'pitcher' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'pitcher'
                  ? 'rgba(252, 211, 77, 0.8)'
                  : 'rgba(255, 255, 255, 0.7)'}
              strokeWidth={isAreaSelected({ type: 'infield_position', position: 'pitcher' }) ? 3 : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'pitcher' ? 2.5 : 2}
              filter={isAreaSelected({ type: 'infield_position', position: 'pitcher' }) ? 'url(#glow)' : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'pitcher' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'infield_position', position: 'pitcher' })}
              onMouseEnter={() => setHoveredArea({ type: 'infield_position', position: 'pitcher' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={centerX} 
              y={centerY - 56} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'infield_position', position: 'pitcher' }) ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'} 
              fontSize="12" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
            >
              P
            </text>

            {/* Catcher */}
            <circle
              cx={homeX}
              cy={homeY - 5}
              r={14}
              fill={isAreaSelected({ type: 'infield_position', position: 'catcher' }) 
                ? 'rgba(252, 211, 77, 0.95)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'catcher' 
                  ? 'rgba(252, 211, 77, 0.6)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              stroke={isAreaSelected({ type: 'infield_position', position: 'catcher' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'catcher'
                  ? 'rgba(252, 211, 77, 0.8)'
                  : 'rgba(255, 255, 255, 0.7)'}
              strokeWidth={isAreaSelected({ type: 'infield_position', position: 'catcher' }) ? 3 : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'catcher' ? 2.5 : 2}
              filter={isAreaSelected({ type: 'infield_position', position: 'catcher' }) ? 'url(#glow)' : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'catcher' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'infield_position', position: 'catcher' })}
              onMouseEnter={() => setHoveredArea({ type: 'infield_position', position: 'catcher' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={homeX} 
              y={homeY - 1} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'infield_position', position: 'catcher' }) ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'} 
              fontSize="11" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
            >
              C
            </text>

            {/* 1st Base */}
            <circle
              cx={firstX}
              cy={firstY}
              r={16}
              fill={isAreaSelected({ type: 'infield_position', position: 'first' }) 
                ? 'rgba(252, 211, 77, 0.95)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'first' 
                  ? 'rgba(252, 211, 77, 0.6)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              stroke={isAreaSelected({ type: 'infield_position', position: 'first' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'first'
                  ? 'rgba(252, 211, 77, 0.8)'
                  : 'rgba(255, 255, 255, 0.7)'}
              strokeWidth={isAreaSelected({ type: 'infield_position', position: 'first' }) ? 3 : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'first' ? 2.5 : 2}
              filter={isAreaSelected({ type: 'infield_position', position: 'first' }) ? 'url(#glow)' : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'first' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'infield_position', position: 'first' })}
              onMouseEnter={() => setHoveredArea({ type: 'infield_position', position: 'first' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={firstX} 
              y={firstY + 5} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'infield_position', position: 'first' }) ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'} 
              fontSize="12" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
            >
              1B
            </text>

            {/* 2nd Base */}
            <circle
              cx={secondX}
              cy={secondY}
              r={16}
              fill={isAreaSelected({ type: 'infield_position', position: 'second' }) 
                ? 'rgba(252, 211, 77, 0.95)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'second' 
                  ? 'rgba(252, 211, 77, 0.6)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              stroke={isAreaSelected({ type: 'infield_position', position: 'second' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'second'
                  ? 'rgba(252, 211, 77, 0.8)'
                  : 'rgba(255, 255, 255, 0.7)'}
              strokeWidth={isAreaSelected({ type: 'infield_position', position: 'second' }) ? 3 : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'second' ? 2.5 : 2}
              filter={isAreaSelected({ type: 'infield_position', position: 'second' }) ? 'url(#glow)' : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'second' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'infield_position', position: 'second' })}
              onMouseEnter={() => setHoveredArea({ type: 'infield_position', position: 'second' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={secondX} 
              y={secondY + 5} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'infield_position', position: 'second' }) ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'} 
              fontSize="12" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
            >
              2B
            </text>

            {/* 3rd Base */}
            <circle
              cx={thirdX}
              cy={thirdY}
              r={16}
              fill={isAreaSelected({ type: 'infield_position', position: 'third' }) 
                ? 'rgba(252, 211, 77, 0.95)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'third' 
                  ? 'rgba(252, 211, 77, 0.6)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              stroke={isAreaSelected({ type: 'infield_position', position: 'third' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'third'
                  ? 'rgba(252, 211, 77, 0.8)'
                  : 'rgba(255, 255, 255, 0.7)'}
              strokeWidth={isAreaSelected({ type: 'infield_position', position: 'third' }) ? 3 : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'third' ? 2.5 : 2}
              filter={isAreaSelected({ type: 'infield_position', position: 'third' }) ? 'url(#glow)' : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'third' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'infield_position', position: 'third' })}
              onMouseEnter={() => setHoveredArea({ type: 'infield_position', position: 'third' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={thirdX} 
              y={thirdY + 5} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'infield_position', position: 'third' }) ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'} 
              fontSize="12" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
            >
              3B
            </text>

            {/* Shortstop */}
            <circle
              cx={centerX - baseDistance * 0.35}
              cy={centerY - baseDistance * 0.9}
              r={16}
              fill={isAreaSelected({ type: 'infield_position', position: 'shortstop' }) 
                ? 'rgba(252, 211, 77, 0.95)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'shortstop' 
                  ? 'rgba(252, 211, 77, 0.6)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              stroke={isAreaSelected({ type: 'infield_position', position: 'shortstop' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'shortstop'
                  ? 'rgba(252, 211, 77, 0.8)'
                  : 'rgba(255, 255, 255, 0.7)'}
              strokeWidth={isAreaSelected({ type: 'infield_position', position: 'shortstop' }) ? 3 : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'shortstop' ? 2.5 : 2}
              filter={isAreaSelected({ type: 'infield_position', position: 'shortstop' }) ? 'url(#glow)' : hoveredArea?.type === 'infield_position' && hoveredArea.position === 'shortstop' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'infield_position', position: 'shortstop' })}
              onMouseEnter={() => setHoveredArea({ type: 'infield_position', position: 'shortstop' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
            <text 
              x={centerX - baseDistance * 0.35} 
              y={centerY - baseDistance * 0.9 + 5} 
              textAnchor="middle" 
              fill={isAreaSelected({ type: 'infield_position', position: 'shortstop' }) ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)'} 
              fontSize="12" 
              fontWeight="bold"
              className="pointer-events-none"
              style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
            >
              SS
            </text>

            {/* Position Gaps - Clickable areas between positions */}
            {/* Between SS and 3B */}
            <polygon
              points={`${thirdX - 18},${thirdY} ${centerX - baseDistance * 0.35 - 12},${centerY - baseDistance * 0.9} ${centerX - baseDistance * 0.35 + 12},${centerY - baseDistance * 0.9 + 10} ${thirdX + 18},${thirdY + 10}`}
              fill={isAreaSelected({ type: 'position_gap', gap: 'ss_3b' }) 
                ? 'rgba(252, 211, 77, 0.6)' 
                : hoveredArea?.type === 'position_gap' && hoveredArea.gap === 'ss_3b' 
                  ? 'rgba(252, 211, 77, 0.3)' 
                  : 'rgba(255, 255, 255, 0.15)'}
              stroke={isAreaSelected({ type: 'position_gap', gap: 'ss_3b' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'position_gap' && hoveredArea.gap === 'ss_3b'
                  ? 'rgba(252, 211, 77, 0.7)'
                  : 'rgba(255, 255, 255, 0.4)'}
              strokeWidth={isAreaSelected({ type: 'position_gap', gap: 'ss_3b' }) ? 2.5 : hoveredArea?.type === 'position_gap' && hoveredArea.gap === 'ss_3b' ? 2 : 1.5}
              strokeDasharray="5,5"
              filter={isAreaSelected({ type: 'position_gap', gap: 'ss_3b' }) ? 'url(#glow)' : hoveredArea?.type === 'position_gap' && hoveredArea.gap === 'ss_3b' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'position_gap', gap: 'ss_3b' })}
              onMouseEnter={() => setHoveredArea({ type: 'position_gap', gap: 'ss_3b' })}
              onMouseLeave={() => setHoveredArea(null)}
            />

            {/* Between 1B and 2B */}
            <polygon
              points={`${firstX - 18},${firstY} ${secondX - 12},${secondY} ${secondX + 12},${secondY + 10} ${firstX + 18},${firstY + 10}`}
              fill={isAreaSelected({ type: 'position_gap', gap: '1b_2b' }) 
                ? 'rgba(252, 211, 77, 0.6)' 
                : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '1b_2b' 
                  ? 'rgba(252, 211, 77, 0.3)' 
                  : 'rgba(255, 255, 255, 0.15)'}
              stroke={isAreaSelected({ type: 'position_gap', gap: '1b_2b' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '1b_2b'
                  ? 'rgba(252, 211, 77, 0.7)'
                  : 'rgba(255, 255, 255, 0.4)'}
              strokeWidth={isAreaSelected({ type: 'position_gap', gap: '1b_2b' }) ? 2.5 : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '1b_2b' ? 2 : 1.5}
              strokeDasharray="5,5"
              filter={isAreaSelected({ type: 'position_gap', gap: '1b_2b' }) ? 'url(#glow)' : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '1b_2b' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'position_gap', gap: '1b_2b' })}
              onMouseEnter={() => setHoveredArea({ type: 'position_gap', gap: '1b_2b' })}
              onMouseLeave={() => setHoveredArea(null)}
            />

            {/* Between 2B and SS (Up the Middle) */}
            <polygon
              points={`${centerX - baseDistance * 0.35 - 12},${centerY - baseDistance * 0.9} ${secondX - 12},${secondY} ${secondX + 12},${secondY + 10} ${centerX - baseDistance * 0.35 + 12},${centerY - baseDistance * 0.9 + 10}`}
              fill={isAreaSelected({ type: 'position_gap', gap: '2b_ss' }) 
                ? 'rgba(252, 211, 77, 0.6)' 
                : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '2b_ss' 
                  ? 'rgba(252, 211, 77, 0.3)' 
                  : 'rgba(255, 255, 255, 0.15)'}
              stroke={isAreaSelected({ type: 'position_gap', gap: '2b_ss' }) 
                ? 'rgba(252, 211, 77, 1)' 
                : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '2b_ss'
                  ? 'rgba(252, 211, 77, 0.7)'
                  : 'rgba(255, 255, 255, 0.4)'}
              strokeWidth={isAreaSelected({ type: 'position_gap', gap: '2b_ss' }) ? 2.5 : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '2b_ss' ? 2 : 1.5}
              strokeDasharray="5,5"
              filter={isAreaSelected({ type: 'position_gap', gap: '2b_ss' }) ? 'url(#glow)' : hoveredArea?.type === 'position_gap' && hoveredArea.gap === '2b_ss' ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'position_gap', gap: '2b_ss' })}
              onMouseEnter={() => setHoveredArea({ type: 'position_gap', gap: '2b_ss' })}
              onMouseLeave={() => setHoveredArea(null)}
            />

            {/* Special Locations */}
            {/* Third Base Line (Left Line) */}
            <line
              x1="0"
              y1={fieldHeight}
              x2="0"
              y2={outfieldDepth}
              stroke={isAreaSelected({ type: 'special', location: 'third_base_line' }) || isAreaSelected({ type: 'special', location: 'left_line' })
                ? 'rgba(252, 211, 77, 1)' 
                : (hoveredArea?.type === 'special' && (hoveredArea.location === 'third_base_line' || hoveredArea.location === 'left_line'))
                  ? 'rgba(252, 211, 77, 0.7)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              strokeWidth={isAreaSelected({ type: 'special', location: 'third_base_line' }) || isAreaSelected({ type: 'special', location: 'left_line' }) ? 5 : (hoveredArea?.type === 'special' && (hoveredArea.location === 'third_base_line' || hoveredArea.location === 'left_line')) ? 4 : 3.5}
              strokeDasharray="8,8"
              filter={(isAreaSelected({ type: 'special', location: 'third_base_line' }) || isAreaSelected({ type: 'special', location: 'left_line' })) ? 'url(#glow)' : (hoveredArea?.type === 'special' && (hoveredArea.location === 'third_base_line' || hoveredArea.location === 'left_line')) ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'special', location: 'third_base_line' })}
              onMouseEnter={() => setHoveredArea({ type: 'special', location: 'third_base_line' })}
              onMouseLeave={() => setHoveredArea(null)}
            />

            {/* First Base Line (Right Line) */}
            <line
              x1={fieldWidth}
              y1={fieldHeight}
              x2={fieldWidth}
              y2={outfieldDepth}
              stroke={isAreaSelected({ type: 'special', location: 'first_base_line' }) || isAreaSelected({ type: 'special', location: 'right_line' })
                ? 'rgba(252, 211, 77, 1)' 
                : (hoveredArea?.type === 'special' && (hoveredArea.location === 'first_base_line' || hoveredArea.location === 'right_line'))
                  ? 'rgba(252, 211, 77, 0.7)' 
                  : 'rgba(255, 255, 255, 0.5)'}
              strokeWidth={isAreaSelected({ type: 'special', location: 'first_base_line' }) || isAreaSelected({ type: 'special', location: 'right_line' }) ? 5 : (hoveredArea?.type === 'special' && (hoveredArea.location === 'first_base_line' || hoveredArea.location === 'right_line')) ? 4 : 3.5}
              strokeDasharray="8,8"
              filter={(isAreaSelected({ type: 'special', location: 'first_base_line' }) || isAreaSelected({ type: 'special', location: 'right_line' })) ? 'url(#glow)' : (hoveredArea?.type === 'special' && (hoveredArea.location === 'first_base_line' || hoveredArea.location === 'right_line')) ? 'url(#hoverGlow)' : ''}
              className="cursor-pointer transition-all duration-200"
              onClick={() => handleFieldClick({ type: 'special', location: 'first_base_line' })}
              onMouseEnter={() => setHoveredArea({ type: 'special', location: 'first_base_line' })}
              onMouseLeave={() => setHoveredArea(null)}
            />
          </svg>
        </div>
        {hoveredArea && (
          <div className="text-center mt-3">
            <p className="text-yellow-300 text-base font-bold">
              {getAreaLabel(hoveredArea)}
            </p>
            <p className="text-gray-400 text-xs mt-1">Click to select</p>
          </div>
        )}
        {selectedDescription && selectedDescription.locationType && (
          <div className="text-center mt-2 p-2 bg-green-900/30 rounded-md border border-green-700/50">
            <p className="text-green-400 text-sm font-semibold">
              ✓ Selected: {generateLocationText(selectedDescription)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to generate location text
function generateLocationText(desc: Partial<HitDescription>): string {
  if (!desc.locationType) return '';
  
  if (desc.locationType === 'outfield' && desc.fieldDirection) {
    const labels: Record<FieldDirection, string> = {
      left: 'Left Field',
      left_center: 'Left-Center',
      center: 'Center Field',
      right_center: 'Right-Center',
      right: 'Right Field',
    };
    return labels[desc.fieldDirection];
  }
  
  if (desc.locationType === 'infield_position' && desc.infieldPosition) {
    const labels: Record<InfieldPosition, string> = {
      pitcher: 'To Pitcher',
      catcher: 'To Catcher',
      first: 'To 1B',
      second: 'To 2B',
      shortstop: 'To SS',
      third: 'To 3B',
    };
    return labels[desc.infieldPosition];
  }
  
  if (desc.locationType === 'position_gap' && desc.positionGap) {
    const labels: Record<PositionGap, string> = {
      ss_3b: 'Between SS & 3B',
      '1b_2b': 'Between 1B & 2B',
      '2b_ss': 'Between 2B & SS',
      '3b_ss': 'Between 3B & SS',
      pitcher_mound: 'Through Box',
      up_middle: 'Up the Middle',
    };
    return labels[desc.positionGap];
  }
  
  if (desc.locationType === 'special' && desc.specialLocation) {
    const labels: Record<string, string> = {
      left_line: 'Down Left Line',
      right_line: 'Down Right Line',
      up_middle: 'Up the Middle',
      through_box: 'Through Box',
    };
    return labels[desc.specialLocation] || desc.specialLocation;
  }
  
  return '';
}

export default VisualFieldDiagram;
