import React, { useState, useEffect } from 'react';
import type { HitType, HitDescription, HitTrajectory, HitDepth, FieldDirection, InfieldPosition, PositionGap, SpecialLocation } from '../types';

interface HitDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hitType: HitType, description: HitDescription) => void;
  hitType: HitType;
}

const HitDescriptionModal: React.FC<HitDescriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hitType,
}) => {
  const [trajectory, setTrajectory] = useState<HitTrajectory>('line_drive');
  const [description, setDescription] = useState<Partial<HitDescription>>({});
  const [showSkipOption, setShowSkipOption] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setTrajectory('line_drive');
      setDescription({});
      setShowSkipOption(false);
      
      // Set smart defaults based on hit type
      if (hitType === 'homerun') {
        setTrajectory('fly_ball');
        // For home runs, auto-set to outfield with center as default
        setDescription({
          trajectory: 'fly_ball',
          locationType: 'outfield',
          fieldDirection: 'center',
        });
      } else if (hitType === 'single') {
        setTrajectory('line_drive');
      }
    }
  }, [isOpen, hitType]);


  const handleConfirm = () => {
    // For home runs, only require field direction
    if (hitType === 'homerun') {
      if (!description.fieldDirection) {
        alert('Please select the direction of the home run (left, center, or right field).');
        return;
      }
      const fullDescription: HitDescription = {
        trajectory: 'fly_ball',
        locationType: 'outfield',
        fieldDirection: description.fieldDirection,
        // No depth needed for home runs (they're over the fence)
      };
      onConfirm(hitType, fullDescription);
      onClose();
      return;
    }

    // For outfield hits (fly_ball, line_drive), require field direction
    if (trajectory === 'fly_ball' || trajectory === 'line_drive') {
      if (!description.fieldDirection) {
        alert('Please select the outfield direction.');
        return;
      }
      const fullDescription: HitDescription = {
        trajectory: trajectory,
        locationType: 'outfield',
        fieldDirection: description.fieldDirection,
        depth: description.depth,
      };
      onConfirm(hitType, fullDescription);
      onClose();
      return;
    }

    // For infield hits (grounder, popup, bunt), require infield location
    if (trajectory === 'grounder' || trajectory === 'popup' || trajectory === 'bunt') {
      if (!description.infieldPosition && !description.positionGap && !description.specialLocation) {
        alert('Please select where the ball went on the infield.');
        return;
      }
      const fullDescription: HitDescription = {
        trajectory: trajectory,
        locationType: description.infieldPosition ? 'infield_position' : 
                      description.positionGap ? 'position_gap' : 
                      'special',
        infieldPosition: description.infieldPosition,
        positionGap: description.positionGap,
        specialLocation: description.specialLocation,
      };
      onConfirm(hitType, fullDescription);
      onClose();
      return;
    }

    // Fallback (shouldn't reach here)
    alert('Please select where the ball went.');
  };

  const handleSkip = () => {
    // Create minimal description with just trajectory
    const minimalDescription: HitDescription = {
      trajectory: trajectory,
      locationType: 'outfield', // Default
      fieldDirection: 'center', // Default
    };
    onConfirm(hitType, minimalDescription);
    onClose();
  };

  const hitTypeLabels: Record<HitType, string> = {
    single: 'Single',
    double: 'Double',
    triple: 'Triple',
    homerun: 'Home Run',
  };

  const trajectoryLabels: Record<HitTrajectory, string> = {
    line_drive: 'Line Drive',
    grounder: 'Grounder',
    fly_ball: 'Fly Ball',
    popup: 'Popup',
    bunt: 'Bunt',
  };

  const depthLabels: Record<HitDepth, string> = {
    shallow: 'Shallow',
    medium: 'Medium',
    deep: 'Deep',
    warning_track: 'Warning Track',
    wall: 'Wall',
  };

  if (!isOpen) return null;

  const needsDepth = (trajectory === 'fly_ball' || trajectory === 'line_drive') && 
                     description.fieldDirection &&
                     hitType !== 'homerun';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-end sm:items-center z-[60] sm:p-4">
      <div className="bg-gray-800 shadow-xl w-full border-t-2 border-yellow-400 flex flex-col max-h-[90dvh] sm:max-w-2xl sm:rounded-lg sm:border sm:border-gray-600 overflow-hidden">
        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-yellow-300">
            Hit Description - {hitTypeLabels[hitType]}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-6">
            {/* Trajectory Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Trajectory <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(Object.keys(trajectoryLabels) as HitTrajectory[]).map((traj) => (
                  <button
                    key={traj}
                    onClick={() => {
                      setTrajectory(traj);
                      // Clear incompatible selections when trajectory changes
                      if (traj === 'fly_ball' || traj === 'line_drive') {
                        // Outfield trajectory - clear infield selections
                        setDescription({ 
                          trajectory: traj,
                          locationType: 'outfield',
                          fieldDirection: undefined,
                          depth: undefined,
                        });
                      } else if (traj === 'grounder' || traj === 'popup' || traj === 'bunt') {
                        // Infield trajectory - clear outfield selections
                        setDescription({ 
                          trajectory: traj,
                          infieldPosition: undefined,
                          positionGap: undefined,
                          specialLocation: undefined,
                        });
                      } else {
                        setDescription({ ...description, trajectory: traj });
                      }
                    }}
                    className={`px-4 py-2 rounded-md font-bold transition-colors text-sm ${
                      trajectory === traj
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {trajectoryLabels[traj]}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Selection - Conditional based on trajectory */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Location <span className="text-red-400">*</span>
              </label>
              
              {/* Outfield buttons for fly_ball, line_drive, or home runs */}
              {(trajectory === 'fly_ball' || trajectory === 'line_drive' || hitType === 'homerun') && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Select outfield direction:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['left', 'left_center', 'center', 'right_center', 'right'] as FieldDirection[]).map((dir) => (
                      <button
                        key={dir}
                        onClick={() => {
                          setDescription({
                            trajectory: hitType === 'homerun' ? 'fly_ball' : trajectory,
                            locationType: 'outfield',
                            fieldDirection: dir,
                          });
                        }}
                        className={`px-4 py-3 rounded-md font-bold transition-colors text-sm ${
                          description.fieldDirection === dir
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                      >
                        {dir === 'left' ? 'Left Field' :
                         dir === 'left_center' ? 'Left-Center' :
                         dir === 'center' ? 'Center Field' :
                         dir === 'right_center' ? 'Right-Center' :
                         'Right Field'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Infield buttons for grounder, popup, or bunt */}
              {(trajectory === 'grounder' || trajectory === 'popup' || trajectory === 'bunt') && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Select infield location:</p>
                  
                  {/* Infield Positions */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">To Position:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(['pitcher', 'catcher', 'first', 'second', 'shortstop', 'third'] as InfieldPosition[]).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => {
                            setDescription({
                              trajectory: trajectory,
                              locationType: 'infield_position',
                              infieldPosition: pos,
                            });
                          }}
                          className={`px-3 py-2 rounded-md font-bold transition-colors text-xs ${
                            description.infieldPosition === pos
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-gray-700 hover:bg-gray-600 text-white'
                          }`}
                        >
                          {pos === 'pitcher' ? 'P' :
                           pos === 'catcher' ? 'C' :
                           pos === 'first' ? '1B' :
                           pos === 'second' ? '2B' :
                           pos === 'shortstop' ? 'SS' :
                           '3B'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position Gaps */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Between Positions:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {([
                        { gap: 'ss_3b' as PositionGap, label: 'SS & 3B' },
                        { gap: '1b_2b' as PositionGap, label: '1B & 2B' },
                        { gap: '2b_ss' as PositionGap, label: '2B & SS' },
                        { gap: '3b_ss' as PositionGap, label: '3B & SS' },
                        { gap: 'pitcher_mound' as PositionGap, label: 'Through Box' },
                        { gap: 'up_middle' as PositionGap, label: 'Up Middle' },
                      ]).map(({ gap, label }) => (
                        <button
                          key={gap}
                          onClick={() => {
                            setDescription({
                              trajectory: trajectory,
                              locationType: 'position_gap',
                              positionGap: gap,
                            });
                          }}
                          className={`px-3 py-2 rounded-md font-bold transition-colors text-xs ${
                            description.positionGap === gap
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-gray-700 hover:bg-gray-600 text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Locations */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Special Locations:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { loc: 'third_base_line' as SpecialLocation, label: 'Down 3B Line' },
                        { loc: 'first_base_line' as SpecialLocation, label: 'Down 1B Line' },
                      ]).map(({ loc, label }) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setDescription({
                              trajectory: trajectory,
                              locationType: 'special',
                              specialLocation: loc,
                            });
                          }}
                          className={`px-3 py-2 rounded-md font-bold transition-colors text-xs ${
                            description.specialLocation === loc
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-gray-700 hover:bg-gray-600 text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Depth Selection (for outfield fly balls/line drives, but NOT home runs) */}
            {needsDepth && hitType !== 'homerun' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Depth (Optional)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(Object.keys(depthLabels) as HitDepth[]).map((depth) => (
                    <button
                      key={depth}
                      onClick={() => setDescription({ ...description, depth })}
                      className={`px-4 py-2 rounded-md font-bold transition-colors text-sm ${
                        description.depth === depth
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                      }`}
                    >
                      {depthLabels[depth]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {(description.locationType || (hitType === 'homerun' && description.fieldDirection) || description.infieldPosition || description.positionGap || description.specialLocation) && (
              <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700">
                <p className="text-sm text-gray-400 mb-1">Preview:</p>
                <p className="text-white font-semibold">
                  {generateHitDescriptionText({
                    trajectory: hitType === 'homerun' ? 'fly_ball' : trajectory,
                    locationType: hitType === 'homerun' ? 'outfield' : (description.locationType || 'outfield'),
                    fieldDirection: description.fieldDirection,
                    positionGap: description.positionGap,
                    infieldPosition: description.infieldPosition,
                    depth: description.depth,
                    specialLocation: description.specialLocation,
                  } as HitDescription)}
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
          <button
            onClick={() => setShowSkipOption(!showSkipOption)}
            className="text-sm text-gray-400 hover:text-gray-300 underline"
          >
            {showSkipOption ? 'Hide Skip' : 'Skip Description'}
          </button>
          <div className="flex gap-4">
            {showSkipOption && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                hitType === 'homerun' ? !description.fieldDirection :
                (trajectory === 'fly_ball' || trajectory === 'line_drive') ? !description.fieldDirection :
                (trajectory === 'grounder' || trajectory === 'popup' || trajectory === 'bunt') ? 
                  !description.infieldPosition && !description.positionGap && !description.specialLocation :
                !description.locationType
              }
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-bold transition-colors"
            >
              Confirm
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Helper function to generate human-readable hit description
export function generateHitDescriptionText(desc: HitDescription): string {
  const parts: string[] = [];

  // For home runs, use simpler description
  if (desc.locationType === 'outfield' && desc.fieldDirection && desc.trajectory === 'fly_ball' && !desc.depth) {
    // This is likely a home run (fly ball to outfield with no depth)
    const fieldLabels: Record<string, string> = {
      left: 'to left field',
      left_center: 'to left-center',
      center: 'to center field',
      right_center: 'to right-center',
      right: 'to right field',
    };
    return `Home run ${fieldLabels[desc.fieldDirection]}`;
  }

  // Trajectory
  const trajectoryLabels: Record<HitTrajectory, string> = {
    line_drive: 'line drive',
    grounder: 'grounder',
    fly_ball: 'fly ball',
    popup: 'popup',
    bunt: 'bunt',
  };
  parts.push(trajectoryLabels[desc.trajectory]);

  // Location
  if (desc.locationType === 'outfield' && desc.fieldDirection) {
    const fieldLabels: Record<string, string> = {
      left: 'to left field',
      left_center: 'to left-center',
      center: 'to center field',
      right_center: 'to right-center',
      right: 'to right field',
    };
    parts.push(fieldLabels[desc.fieldDirection]);
    
    // Add depth for fly balls and line drives (but not home runs)
    if (desc.depth && (desc.trajectory === 'fly_ball' || desc.trajectory === 'line_drive')) {
      const depthLabels: Record<HitDepth, string> = {
        shallow: 'shallow',
        medium: '', // Don't add "medium" - it's implied
        deep: 'deep',
        warning_track: 'to the warning track',
        wall: 'to the wall',
      };
      if (depthLabels[desc.depth]) {
        parts.push(depthLabels[desc.depth]);
      }
    }
  } else if (desc.locationType === 'infield_position' && desc.infieldPosition) {
    const positionLabels: Record<string, string> = {
      pitcher: 'to the pitcher',
      catcher: 'to the catcher',
      first: 'to first base',
      second: 'to second base',
      shortstop: 'to shortstop',
      third: 'to third base',
    };
    parts.push(positionLabels[desc.infieldPosition]);
  } else if (desc.locationType === 'position_gap' && desc.positionGap) {
    const gapLabels: Record<string, string> = {
      ss_3b: 'between SS and 3B',
      '1b_2b': 'between 1B and 2B',
      '2b_ss': 'between 2B and SS',
      '3b_ss': 'between 3B and SS',
      pitcher_mound: 'through the box',
      up_middle: 'up the middle',
    };
    parts.push(gapLabels[desc.positionGap]);
  } else if (desc.locationType === 'special' && desc.specialLocation) {
    const specialLabels: Record<string, string> = {
      left_line: 'down the left field line',
      right_line: 'down the right field line',
      third_base_line: 'down the third base line',
      first_base_line: 'down the first base line',
      up_middle: 'up the middle',
      through_box: 'through the box',
    };
    parts.push(specialLabels[desc.specialLocation]);
  }

  // Capitalize first letter
  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export default HitDescriptionModal;

