import React, { useState, useEffect, useCallback } from 'react';
import type { HitType, OutType, PitchType, GameState, Player, DefensivePlays, HitDescription } from '../types';
import HitDescriptionModal from './HitDescriptionModal';
import StrikeoutTypeModal from './StrikeoutTypeModal';
import KeyboardShortcuts from './KeyboardShortcuts';

interface ControlPanelProps {
  onPitch: (type: PitchType, strikeoutType?: 'looking' | 'swinging') => void;
  onHit: (type: HitType, description?: HitDescription) => void;
  onOut: (type: OutType, defensivePlays?: DefensivePlays) => void;
  onSacFly: (defensivePlays?: DefensivePlays) => void;
  onSacBunt: (defensivePlays?: DefensivePlays) => void;
  onFieldersChoice: (defensivePlays?: DefensivePlays) => void;
  onReachedOnError: (defensivePlays: DefensivePlays) => void;
  onHBP: () => void;
  onIntentionalWalk: () => void;
  onBalk: () => void;
  onRunnerOut: (base: 'first' | 'second' | 'third', defensivePlays?: DefensivePlays) => void;
  onRunnerAdvanceOnError: (runnerId: string, base: 'first' | 'second' | 'third', defensivePlays: DefensivePlays) => void;
  onManualRunnerAdvance: (runnerId: string, fromBase: 'first' | 'second' | 'third') => void;
  onCountCorrection: (type: 'ball' | 'strike' | 'out', delta: 1 | -1) => void;
  onInningCorrection: (delta: 1 | -1) => void;
  onPitchCountCorrection: (delta: 1 | -1) => void;
  onBaseRunnerCorrection: (base: 'first' | 'second' | 'third', playerId: string | null) => void;
  onErrorCorrection: (teamKey: 'homeTeam' | 'awayTeam', delta: 1 | -1) => void;
  onScoreCorrection: (teamKey: 'homeTeam' | 'awayTeam', delta: 1 | -1) => void;
  onTopBottomToggle: () => void;
  onStolenBase: (runnerId: string, base: 'second' | 'third' | 'home') => void;
  onCaughtStealing: (runnerId: string, base: 'second' | 'third' | 'home', defensivePlays?: DefensivePlays) => void;
  onPinchRun: (runnerId: string, substituteId: string) => void;
  gameState: GameState;
}

interface DefensivePlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (plays: DefensivePlays) => void;
    defensiveTeamRoster: Player[];
    outType: string;
    isErrorRequired?: boolean;
}

const DefensivePlayModal: React.FC<DefensivePlayModalProps> = ({
    isOpen, onClose, onConfirm, defensiveTeamRoster, outType, isErrorRequired = false,
}) => {
    const [putoutById, setPutoutById] = useState<string>('');
    const [assistByIds, setAssistByIds] = useState<string[]>([]);
    const [errorById, setErrorById] = useState<string>('');
    const [errorType, setErrorType] = useState<'fielding' | 'throwing'>('fielding');

    useEffect(() => {
        // Reset state when modal opens
        if (isOpen) {
            setPutoutById('');
            setAssistByIds([]);
            setErrorById('');
            setErrorType('fielding');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (isErrorRequired && !errorById) {
            alert('An error must be assigned for this play.');
            return;
        }
        const plays: DefensivePlays = {};
        if (putoutById) plays.putoutById = putoutById;
        if (assistByIds.length > 0) plays.assistByIds = assistByIds;
        if (errorById) {
            plays.errorById = errorById;
            plays.errorType = errorType;
        }
        onConfirm(plays);
        onClose();
    };
    
    if (!isOpen) return null;

    const fielders = defensiveTeamRoster.filter(p => p.position.toUpperCase() !== 'BENCH');
    const readableOutType = outType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-600">
            <h2 className="text-xl font-bold text-yellow-300 mb-4">Record Defensive Play ({readableOutType})</h2>
            <div className="space-y-4">
                {/* Putout */}
                {!isErrorRequired && (
                  <div>
                      <label className="block text-sm font-medium text-gray-300">Putout By</label>
                      <select value={putoutById} onChange={e => setPutoutById(e.target.value)} className="mt-1 bg-gray-700 text-white w-full p-2 rounded border border-gray-600">
                          <option value="">-- Select Player --</option>
                          {fielders.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>)}
                      </select>
                  </div>
                )}
                {/* Assists */}
                {!isErrorRequired && (
                  <div>
                      <label className="block text-sm font-medium text-gray-300">Assisted By (optional)</label>
                      <select multiple value={assistByIds} onChange={e => setAssistByIds([...e.target.selectedOptions].map(option => option.value))} className="mt-1 bg-gray-700 text-white w-full p-2 rounded border border-gray-600 h-24">
                          {fielders.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>)}
                      </select>
                  </div>
                )}
                 {/* Error */}
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Error By {isErrorRequired ? '' : '(optional)'}</label>
                     <p className="text-xs text-gray-400">Select if play resulted from an error. An error will be charged to this player.</p>
                    <select value={errorById} onChange={e => setErrorById(e.target.value)} className="mt-1 bg-gray-700 text-white w-full p-2 rounded border border-gray-600">
                        <option value="">-- No Error --</option>
                        {fielders.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>)}
                    </select>
                </div>
                {errorById && (
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-300">Error Type</label>
                        <div className="flex gap-4 mt-1">
                            <label className="flex items-center gap-2 text-sm text-gray-200">
                                <input type="radio" name="errorType" value="fielding" checked={errorType === 'fielding'} onChange={() => setErrorType('fielding')} className="form-radio bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-500"/>
                                Fielding Error
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-200">
                                <input type="radio" name="errorType" value="throwing" checked={errorType === 'throwing'} onChange={() => setErrorType('throwing')} className="form-radio bg-gray-700 border-gray-600 text-yellow-400 focus:ring-yellow-500"/>
                                Throwing Error
                            </label>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-end space-x-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors">Cancel</button>
                <button onClick={handleConfirm} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-bold transition-colors">Confirm</button>
            </div>
          </div>
        </div>
    );
};


const ControlPanel: React.FC<ControlPanelProps> = ({ 
  onPitch, onHit, onOut, onSacFly, onSacBunt, onFieldersChoice, onReachedOnError, 
  onHBP, onIntentionalWalk, onBalk, onRunnerOut, onRunnerAdvanceOnError, onManualRunnerAdvance,
  onCountCorrection, onInningCorrection, onPitchCountCorrection, onBaseRunnerCorrection,
  onErrorCorrection, onScoreCorrection, onTopBottomToggle, onStolenBase, onCaughtStealing, onPinchRun,
  gameState
}) => {
  const isGameOver = gameState.gameStatus === 'final';
  const [isCorrectionsOpen, setIsCorrectionsOpen] = useState(false);
  const [modalState, setModalState] = useState<{
      isOpen: boolean;
      outType: OutType | 'sac_fly' | 'sac_bunt' | 'fielders_choice' | 'runner_out' | 'caught_stealing' | 'reached_on_error' | 'runner_advance_on_error';
      base?: 'first' | 'second' | 'third' | 'home';
      runnerId?: string;
  } | null>(null);
  const [hitModalState, setHitModalState] = useState<{
    isOpen: boolean;
    hitType: HitType;
  } | null>(null);
  const [strikeoutModalState, setStrikeoutModalState] = useState<{
    isOpen: boolean;
  } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [pinchRunnerTarget, setPinchRunnerTarget] = useState<string | null>(null);

  const defensiveTeam = gameState.isTopInning ? gameState.homeTeam : gameState.awayTeam;
  const battingTeam = gameState.isTopInning ? gameState.awayTeam : gameState.homeTeam;
  const bench = battingTeam.roster.filter(p => p.position.toUpperCase() === 'BENCH');

  const handleOpenModal = (outType: typeof modalState.outType, base?: typeof modalState.base, runnerId?: string) => {
      if (outType === 'strikeout') {
        onOut('strikeout'); // Regular strikeouts don't need a modal.
      } else {
        setModalState({ isOpen: true, outType, base, runnerId });
      }
  };

  // Keyboard shortcut handler
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs, textareas, or when modals are open
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      modalState?.isOpen ||
      hitModalState?.isOpen ||
      strikeoutModalState?.isOpen ||
      showKeyboardShortcuts
    ) {
      return;
    }

    // Check for modifier keys - only allow if no modifiers or just Shift
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toUpperCase();

    switch (key) {
      case 'B':
        event.preventDefault();
        onPitch('ball');
        break;
      case 'S':
        event.preventDefault();
        if (gameState.strikes === 2) {
          setStrikeoutModalState({ isOpen: true });
        } else {
          onPitch('strike');
        }
        break;
      case 'F':
        event.preventDefault();
        onPitch('foul');
        break;
      case '1':
        event.preventDefault();
        setHitModalState({ isOpen: true, hitType: 'single' });
        break;
      case '2':
        event.preventDefault();
        setHitModalState({ isOpen: true, hitType: 'double' });
        break;
      case '3':
        event.preventDefault();
        setHitModalState({ isOpen: true, hitType: 'triple' });
        break;
      case 'H':
        event.preventDefault();
        setHitModalState({ isOpen: true, hitType: 'homerun' });
        break;
      case 'O':
        event.preventDefault();
        handleOpenModal('flyout');
        break;
      case 'G':
        event.preventDefault();
        handleOpenModal('groundout');
        break;
      case 'W':
        event.preventDefault();
        onIntentionalWalk();
        break;
      case 'P':
        event.preventDefault();
        onHBP();
        break;
      case 'E':
        event.preventDefault();
        handleOpenModal('reached_on_error');
        break;
      case '?':
        event.preventDefault();
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
        break;
      default:
        break;
    }
  }, [
    gameState.strikes,
    modalState,
    hitModalState,
    strikeoutModalState,
    showKeyboardShortcuts,
    onPitch,
    onIntentionalWalk,
    onHBP,
    handleOpenModal,
    setHitModalState,
    setStrikeoutModalState,
  ]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const handleConfirmDefensivePlay = (plays: DefensivePlays) => {
    if (!modalState) return;

    switch (modalState.outType) {
        case 'flyout':
        case 'groundout':
            onOut(modalState.outType, plays);
            break;
        case 'strikeout':
            onOut('strikeout', plays);
            break;
        case 'sac_fly':
            onSacFly(plays);
            break;
        case 'sac_bunt':
            onSacBunt(plays);
            break;
        case 'fielders_choice':
            onFieldersChoice(plays);
            break;
        case 'reached_on_error':
            onReachedOnError(plays);
            break;
        case 'runner_out':
            if (modalState.base) onRunnerOut(modalState.base as 'first'|'second'|'third', plays);
            break;
        case 'runner_advance_on_error':
            if (modalState.runnerId && modalState.base) {
                onRunnerAdvanceOnError(modalState.runnerId, modalState.base as 'first'|'second'|'third', plays);
            }
            break;
        case 'caught_stealing':
            if (modalState.runnerId && modalState.base) {
                onCaughtStealing(modalState.runnerId, modalState.base as 'second' | 'third' | 'home', plays);
            }
            break;
    }
  };

  const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean }> = 
    ({ onClick, children, className, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || isGameOver}
      className={`font-bold py-2 px-3 lg:py-2 lg:px-2 text-sm rounded-lg shadow-md transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed lg:h-full lg:w-full ${className}`}
    >
      {children}
    </button>
  );

  const Section: React.FC<{ title: string; children: React.ReactNode; cols?: number }> = ({ title, children, cols }) => (
    <div className="bg-gray-800 p-3 lg:p-3 rounded-lg lg:flex-1 lg:min-w-[160px] lg:flex lg:flex-col">
      <h3 className="text-base lg:text-xs font-bold text-yellow-300 mb-2 lg:mb-2 text-center tracking-wider uppercase">{title}</h3>
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${cols ?? 3} gap-2 lg:gap-2 lg:flex-1 lg:[grid-auto-rows:minmax(0,1fr)]`}>
        {children}
      </div>
    </div>
  );

  const CorrectionControl: React.FC<{
      label: string;
      value: number | string;
      onDecrement: () => void;
      onIncrement: () => void;
    }> = ({ label, value, onDecrement, onIncrement }) => (
    <div className="flex items-center justify-between col-span-3 text-lg py-1">
      <span className="font-bold text-gray-300">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={onDecrement} disabled={isGameOver} className="font-bold w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50" title={`Decrement ${label}`}>-</button>
        <span className="w-8 text-center font-mono text-xl">{value}</span>
        <button onClick={onIncrement} disabled={isGameOver} className="font-bold w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50" title={`Increment ${label}`}>+</button>
      </div>
    </div>
  );

  const BaseRunnerControl: React.FC<{
    base: 'first' | 'second' | 'third';
    label: string;
    runner: Player | null;
    battingTeamRoster: Player[];
  }> = ({ base, label, runner, battingTeamRoster }) => {
    const [selectedPlayer, setSelectedPlayer] = useState('');
    
    const handleSetRunner = () => {
      if (selectedPlayer) {
        onBaseRunnerCorrection(base, selectedPlayer);
      }
    };
    
    return (
      <div className='col-span-3 space-y-2 border-t border-gray-700 py-3'>
        <div className="flex justify-between items-center">
          <label className="font-bold text-gray-300">{label}:</label>
          <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{runner?.name || 'Empty'}</span>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2"
          >
            <option value="">Select Player</option>
            {battingTeamRoster.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
          </select>
          <button onClick={handleSetRunner} disabled={isGameOver || !selectedPlayer} className="px-3 bg-sky-600 hover:bg-sky-700 rounded text-sm disabled:opacity-50" title="Set selected player on this base">Set</button>
          <button onClick={() => onBaseRunnerCorrection(base, null)} disabled={isGameOver} className="px-3 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50" title="Remove runner from this base">Clear</button>
        </div>
      </div>
    );
  };
  
  const battingTeamRoster = gameState.isTopInning ? gameState.awayTeam.roster : gameState.homeTeam.roster;
  const currentPitcher = gameState.isTopInning ? gameState.currentPitcher.home : gameState.currentPitcher.away;

  const hasRunners = !!gameState.bases.first || !!gameState.bases.second || !!gameState.bases.third;
  const modalIsErrorRequired = modalState?.outType === 'reached_on_error' || modalState?.outType === 'runner_advance_on_error';

  return (
    <div className="bg-gray-900 lg:bg-transparent lg:border-0 p-2 lg:p-0 rounded-xl space-y-3 lg:space-y-0 lg:flex lg:flex-nowrap lg:gap-2 lg:h-full lg:items-stretch lg:w-full">
      <DefensivePlayModal 
        isOpen={modalState?.isOpen || false}
        onClose={() => setModalState(null)}
        onConfirm={handleConfirmDefensivePlay}
        defensiveTeamRoster={defensiveTeam.roster}
        outType={modalState?.outType || ''}
        isErrorRequired={modalIsErrorRequired}
      />
      <div className="flex justify-between items-center mb-2 lg:hidden">
        <h2 className="text-xl sm:text-2xl font-bold">Control Panel</h2>
        <button
          onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
          className="text-sm text-gray-400 hover:text-yellow-300 transition-colors"
          title="Keyboard Shortcuts (Press ?)"
        >
          <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs">?</kbd> Shortcuts
        </button>
      </div>
      
      <Section title="Pitch Outcome">
        <ControlButton onClick={() => onPitch('ball')} className="bg-green-600 hover:bg-green-700">Ball</ControlButton>
        <ControlButton 
          onClick={() => {
            // Check if this will be the third strike
            if (gameState.strikes === 2) {
              setStrikeoutModalState({ isOpen: true });
            } else {
              onPitch('strike');
            }
          }} 
          className="bg-red-600 hover:bg-red-700"
        >
          Strike
        </ControlButton>
        <ControlButton onClick={() => onPitch('foul')} className="bg-yellow-500 hover:bg-yellow-600 text-black">Foul</ControlButton>
      </Section>

      <Section title="In Play - Hit">
        <ControlButton onClick={() => setHitModalState({ isOpen: true, hitType: 'single' })} className="bg-sky-500 hover:bg-sky-600 col-span-1">1B</ControlButton>
        <ControlButton onClick={() => setHitModalState({ isOpen: true, hitType: 'double' })} className="bg-sky-600 hover:bg-sky-700 col-span-1">2B</ControlButton>
        <ControlButton onClick={() => setHitModalState({ isOpen: true, hitType: 'triple' })} className="bg-sky-700 hover:bg-sky-800 col-span-1">3B</ControlButton>
        <ControlButton onClick={() => setHitModalState({ isOpen: true, hitType: 'homerun' })} className="bg-purple-600 hover:bg-purple-700 col-span-3">Home Run</ControlButton>
      </Section>
      
      <Section title="In Play - Out / Other">
        <ControlButton onClick={() => handleOpenModal('flyout')} className="bg-orange-500 hover:bg-orange-600 col-span-1">Fly Out</ControlButton>
        <ControlButton onClick={() => handleOpenModal('groundout')} className="bg-orange-600 hover:bg-orange-700 col-span-1">Ground Out</ControlButton>
        <ControlButton onClick={() => handleOpenModal('sac_fly')} className="bg-indigo-500 hover:bg-indigo-600 col-span-1">Sac Fly</ControlButton>
        <ControlButton onClick={() => handleOpenModal('sac_bunt')} className="bg-indigo-600 hover:bg-indigo-700 col-span-1">Sac Bunt</ControlButton>
        <ControlButton onClick={() => handleOpenModal('fielders_choice')} className="bg-teal-500 hover:bg-teal-600 col-span-1">Fielder's Choice</ControlButton>
        <ControlButton onClick={() => handleOpenModal('reached_on_error')} className="bg-rose-500 hover:bg-rose-600 col-span-3">Reached on Error</ControlButton>
      </Section>
      
      {hasRunners && (
        <Section title="On Base - Out">
            {gameState.bases.first && <ControlButton onClick={() => handleOpenModal('runner_out', 'first')} className="bg-amber-600 hover:bg-amber-700 col-span-1">Out on 1B</ControlButton>}
            {gameState.bases.second && <ControlButton onClick={() => handleOpenModal('runner_out', 'second')} className="bg-amber-600 hover:bg-amber-700 col-span-1">Out on 2B</ControlButton>}
            {gameState.bases.third && <ControlButton onClick={() => handleOpenModal('runner_out', 'third')} className="bg-amber-600 hover:bg-amber-700 col-span-1">Out on 3B</ControlButton>}
        </Section>
      )}

      {hasRunners && (
        <Section title="Runner Actions">
            {gameState.bases.first && (
                <div className="col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-gray-700 pt-2 mt-2">
                    <div className="col-span-full text-sm text-gray-300">1B: #{gameState.bases.first.number} {gameState.bases.first.name}</div>
                    <ControlButton onClick={() => onStolenBase(gameState.bases.first!.id, 'second')} disabled={!!gameState.bases.second} className="bg-green-600 hover:bg-green-700 text-sm py-2">SB 2B</ControlButton>
                    <ControlButton onClick={() => handleOpenModal('caught_stealing', 'second', gameState.bases.first!.id)} disabled={!!gameState.bases.second} className="bg-red-600 hover:bg-red-700 text-sm py-2">CS 2B</ControlButton>
                    <ControlButton onClick={() => onManualRunnerAdvance(gameState.bases.first!.id, 'first')} className="bg-cyan-600 hover:bg-cyan-700 text-sm py-2">Adv (H)</ControlButton>
                    <ControlButton onClick={() => handleOpenModal('runner_advance_on_error', 'first', gameState.bases.first!.id)} className="bg-rose-500 hover:bg-rose-600 text-sm py-2">Adv (E)</ControlButton>
                     {pinchRunnerTarget === gameState.bases.first.id ? (
                        <select onChange={(e) => {
                            if(e.target.value) { onPinchRun(gameState.bases.first!.id, e.target.value); }
                            setPinchRunnerTarget(null);
                        }} onBlur={() => setPinchRunnerTarget(null)} autoFocus className="bg-gray-700 text-white text-sm rounded-lg focus:ring-yellow-500 block w-full py-2 px-1">
                            <option value="">Cancel</option>
                            {bench.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                    ) : (
                        <ControlButton onClick={() => setPinchRunnerTarget(gameState.bases.first!.id)} className="bg-sky-600 hover:bg-sky-700 text-sm py-2">Pinch Run</ControlButton>
                    )}
                </div>
            )}
             {gameState.bases.second && (
                <div className="col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-gray-700 pt-2 mt-2">
                    <div className="col-span-full text-sm text-gray-300">2B: #{gameState.bases.second.number} {gameState.bases.second.name}</div>
                    <ControlButton onClick={() => onStolenBase(gameState.bases.second!.id, 'third')} disabled={!!gameState.bases.third} className="bg-green-600 hover:bg-green-700 text-sm py-2">SB 3B</ControlButton>
                    <ControlButton onClick={() => handleOpenModal('caught_stealing', 'third', gameState.bases.second!.id)} disabled={!!gameState.bases.third} className="bg-red-600 hover:bg-red-700 text-sm py-2">CS 3B</ControlButton>
                    <ControlButton onClick={() => onManualRunnerAdvance(gameState.bases.second!.id, 'second')} className="bg-cyan-600 hover:bg-cyan-700 text-sm py-2">Adv (H)</ControlButton>
                    <ControlButton onClick={() => handleOpenModal('runner_advance_on_error', 'second', gameState.bases.second!.id)} className="bg-rose-500 hover:bg-rose-600 text-sm py-2">Adv (E)</ControlButton>
                    {pinchRunnerTarget === gameState.bases.second.id ? (
                        <select onChange={(e) => {
                            if(e.target.value) { onPinchRun(gameState.bases.second!.id, e.target.value); }
                            setPinchRunnerTarget(null);
                        }} onBlur={() => setPinchRunnerTarget(null)} autoFocus className="bg-gray-700 text-white text-sm rounded-lg focus:ring-yellow-500 block w-full py-2 px-1">
                            <option value="">Cancel</option>
                            {bench.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                    ) : (
                        <ControlButton onClick={() => setPinchRunnerTarget(gameState.bases.second!.id)} className="bg-sky-600 hover:bg-sky-700 text-sm py-2">Pinch Run</ControlButton>
                    )}
                </div>
            )}
             {gameState.bases.third && (
                <div className="col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-gray-700 pt-2 mt-2">
                    <div className="col-span-full text-sm text-gray-300">3B: #{gameState.bases.third.number} {gameState.bases.third.name}</div>
                    <ControlButton onClick={() => onStolenBase(gameState.bases.third!.id, 'home')} className="bg-green-600 hover:bg-green-700 text-sm py-2">SB Home</ControlButton>
                    <ControlButton onClick={() => handleOpenModal('caught_stealing', 'home', gameState.bases.third!.id)} className="bg-red-600 hover:bg-red-700 text-sm py-2">CS Home</ControlButton>
                    <ControlButton onClick={() => onManualRunnerAdvance(gameState.bases.third!.id, 'third')} className="bg-cyan-600 hover:bg-cyan-700 text-sm py-2">Adv (H)</ControlButton>
                    <ControlButton onClick={() => handleOpenModal('runner_advance_on_error', 'third', gameState.bases.third!.id)} className="bg-rose-500 hover:bg-rose-600 text-sm py-2">Adv (E)</ControlButton>
                     {pinchRunnerTarget === gameState.bases.third.id ? (
                        <select onChange={(e) => {
                            if(e.target.value) { onPinchRun(gameState.bases.third!.id, e.target.value); }
                            setPinchRunnerTarget(null);
                        }} onBlur={() => setPinchRunnerTarget(null)} autoFocus className="bg-gray-700 text-white text-sm rounded-lg focus:ring-yellow-500 block w-full py-2 px-1">
                            <option value="">Cancel</option>
                            {bench.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                    ) : (
                        <ControlButton onClick={() => setPinchRunnerTarget(gameState.bases.third!.id)} className="bg-sky-600 hover:bg-sky-700 text-sm py-2">Pinch Run</ControlButton>
                    )}
                </div>
            )}
        </Section>
      )}

      <Section title="Other Actions">
        <ControlButton onClick={onHBP} className="bg-cyan-600 hover:bg-cyan-700 col-span-3 sm:col-span-1">HBP</ControlButton>
        <ControlButton onClick={onIntentionalWalk} className="bg-indigo-500 hover:bg-indigo-600 col-span-3 sm:col-span-1">IBB</ControlButton>
        <ControlButton onClick={onBalk} className="bg-gray-500 hover:bg-gray-600 col-span-3 sm:col-span-1">Balk</ControlButton>
      </Section>

      <div className="bg-gray-800 p-4 rounded-lg">
        <button 
          onClick={() => setIsCorrectionsOpen(!isCorrectionsOpen)}
          className="w-full flex justify-between items-center text-left"
          aria-expanded={isCorrectionsOpen}
          title="Toggle Manual Corrections"
        >
          <h3 className="text-lg font-bold text-yellow-300 tracking-wider">Manual Corrections</h3>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform transform ${isCorrectionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isCorrectionsOpen && (
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <CorrectionControl label="Balls" value={gameState.balls} onDecrement={() => onCountCorrection('ball', -1)} onIncrement={() => onCountCorrection('ball', 1)} />
            <CorrectionControl label="Strikes" value={gameState.strikes} onDecrement={() => onCountCorrection('strike', -1)} onIncrement={() => onCountCorrection('strike', 1)} />
            <CorrectionControl label="Outs" value={gameState.outs} onDecrement={() => onCountCorrection('out', -1)} onIncrement={() => onCountCorrection('out', 1)} />
            <CorrectionControl label="Inning" value={gameState.inning} onDecrement={() => onInningCorrection(-1)} onIncrement={() => onInningCorrection(1)} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top/Bot</span>
              <button
                onClick={onTopBottomToggle}
                className="w-full py-2 rounded font-bold text-sm tracking-wider"
                style={{ background: gameState.isTopInning ? 'rgba(250,204,21,0.15)' : 'rgba(96,165,250,0.15)', color: gameState.isTopInning ? '#facc15' : '#60a5fa', border: `1px solid ${gameState.isTopInning ? 'rgba(250,204,21,0.3)' : 'rgba(96,165,250,0.3)'}` }}
              >
                {gameState.isTopInning ? '▲ Top' : '▼ Bot'}
              </button>
            </div>
            <CorrectionControl label="Pitches" value={currentPitcher?.stats.pitchCount || 0} onDecrement={() => onPitchCountCorrection(-1)} onIncrement={() => onPitchCountCorrection(1)} />
            <CorrectionControl label="Away Score" value={gameState.awayTeam.score} onDecrement={() => onScoreCorrection('awayTeam', -1)} onIncrement={() => onScoreCorrection('awayTeam', 1)} />
            <CorrectionControl label="Home Score" value={gameState.homeTeam.score} onDecrement={() => onScoreCorrection('homeTeam', -1)} onIncrement={() => onScoreCorrection('homeTeam', 1)} />
            <CorrectionControl label="Away Errors" value={gameState.awayTeam.errors} onDecrement={() => onErrorCorrection('awayTeam', -1)} onIncrement={() => onErrorCorrection('awayTeam', 1)} />
            <CorrectionControl label="Home Errors" value={gameState.homeTeam.errors} onDecrement={() => onErrorCorrection('homeTeam', -1)} onIncrement={() => onErrorCorrection('homeTeam', 1)} />
            
            <div className="col-span-3 mt-4">
              <h4 className="text-md font-bold text-yellow-300 mb-2 text-center tracking-wider">Base Runner Management</h4>
              <BaseRunnerControl base="first" label="1st Base" runner={gameState.bases.first} battingTeamRoster={battingTeamRoster}/>
              <BaseRunnerControl base="second" label="2nd Base" runner={gameState.bases.second} battingTeamRoster={battingTeamRoster}/>
              <BaseRunnerControl base="third" label="3rd Base" runner={gameState.bases.third} battingTeamRoster={battingTeamRoster}/>
            </div>
          </div>
        )}
      </div>

      {/* Hit Description Modal */}
      {hitModalState && (
        <HitDescriptionModal
          isOpen={hitModalState.isOpen}
          onClose={() => setHitModalState(null)}
          onConfirm={(hitType, description) => {
            onHit(hitType, description);
            setHitModalState(null);
          }}
          hitType={hitModalState.hitType}
        />
      )}

      {/* Strikeout Type Modal */}
      {strikeoutModalState && (
        <StrikeoutTypeModal
          isOpen={strikeoutModalState.isOpen}
          onClose={() => setStrikeoutModalState(null)}
          onConfirm={(type) => {
            onPitch('strike', type);
            setStrikeoutModalState(null);
          }}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
};

export default ControlPanel;