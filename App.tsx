import React, { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import GameSetup from './components/GameSetup';
import Scoreboard from './components/Scoreboard';
import ControlPanel from './components/ControlPanel';
import type { TeamSetup, Player } from './types';
import PlayerStats from './components/PlayerStats';
import PitchingStats from './components/PitchingStats';
import GameSummaryModal from './components/GameSummaryModal';
import ScoreboardOnlyPage from './components/ScoreboardOnlyPage';
import BatterLowerThirdsPage from './components/BatterLowerThirdsPage';
import LinescorePage from './components/LinescorePage';
import LowProfileScoreboardPage from './components/LowProfileScoreboardPage';
import FieldPlayersPage from './components/FieldPlayersPage';
import BattingOrderPage from './components/BattingOrderPage';
import ManagerReportPage from './components/ManagerReportPage';
import { KeycloakAuthProvider } from './components/KeycloakAuth';
import { getEnvVar } from './utils/env';
import { createGameLock, releaseStoredLock } from './services/gameLockService';

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

// --- Start of in-file Confirmation Modal component ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
      aria-labelledby="confirmation-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-600 flex flex-col">
        <header className="p-4 border-b border-gray-700">
          <h2 id="confirmation-modal-title" className="text-xl font-bold text-yellow-300">{title}</h2>
        </header>
        
        <div className="p-6">
          <p className="text-gray-300">{message}</p>
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end gap-4">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-bold transition-colors"
          >
            Confirm
          </button>
        </footer>
      </div>
    </div>
  );
};
// --- End of in-file Confirmation Modal component ---


// Main App component (without auth wrapper for overlay pages)
const App: React.FC = () => {
  // Overlay pages don't need authentication
  if (window.location.pathname.toLowerCase() === '/scoreboard') {
    return <ScoreboardOnlyPage />;
  }
  
  if (window.location.pathname.toLowerCase() === '/batter-lower-thirds') {
    return <BatterLowerThirdsPage />;
  }
  
  if (window.location.pathname.toLowerCase() === '/linescore') {
    return <LinescorePage />;
  }
  
  if (window.location.pathname.toLowerCase() === '/low-profile-scoreboard') {
    return <LowProfileScoreboardPage />;
  }
  
  if (window.location.pathname.toLowerCase() === '/field-players') {
    return <FieldPlayersPage />;
  }
  
  if (window.location.pathname.toLowerCase() === '/batting-order') {
    return <BattingOrderPage />;
  }

  if (window.location.pathname.toLowerCase() === '/manager-report') {
    return <ManagerReportPage />;
  }

  const { 
    gameState,
    updateSetupData,
    handleGameSetup, 
    handlePitch, 
    handleHit, 
    handleOut, 
    handleSacFly, 
    handleSacBunt,
    handleFieldersChoice,
    handleReachedOnError,
    handleHBP,
    handleIntentionalWalk,
    handleRunnerOut,
    handleRunnerAdvanceOnError,
    resetGame,
    handleCountCorrection,
    handleInningCorrection,
    handleTopBottomToggle,
    handlePitchCountCorrection,
    handleBaseRunnerCorrection,
    handlePlayerSubstitution,
    handlePositionSwap,
    handleErrorCorrection,
    handleScoreCorrection,
    handleStolenBase,
    handleCaughtStealing,
    handleBalk,
    handleFinalGame,
    handlePinchRunner,
    handleSettingsUpdate,
    handleManualRunnerAdvance,
    pbStateRecordId,
  } = useGameState();
  const [isEditingSetup, setIsEditingSetup] = useState(gameState.gameStatus === 'setup');
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isConfirmFinalModalOpen, setIsConfirmFinalModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'stats' | 'score'>('all');


  const setupGame = (
    homeTeam: TeamSetup,
    awayTeam: TeamSetup,
    competition: string,
    location: string,
    gameId?: number | string,
    scorekeeperName?: string,
    gameDate?: string | Date
  ) => {
    // Lock the scheduled game so other scorekeepers can see it's claimed
    if (gameId) {
      createGameLock(String(gameId), scorekeeperName || 'Scorekeeper').catch(() => {});
    }
    handleGameSetup(homeTeam, awayTeam, competition, location, gameId, scorekeeperName, gameDate);
    setIsEditingSetup(false);
  };
  
  const onConfirmFinalGame = () => {
    handleFinalGame();
    setIsSummaryModalOpen(true);
    setIsConfirmFinalModalOpen(false);
  };

  const addGameParam = (url: URL) => {
    if (pbStateRecordId) url.searchParams.set('game', pbStateRecordId);
    return url;
  };

  const copyScoreboardLink = () => {
    const url = addGameParam(new URL('/scoreboard', window.location.origin));
    navigator.clipboard.writeText(url.href).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const [copiedLowerThirdsLink, setCopiedLowerThirdsLink] = useState(false);
  const copyLowerThirdsLink = () => {
    const url = addGameParam(new URL('/batter-lower-thirds', window.location.origin));
    navigator.clipboard.writeText(url.href).then(() => {
        setCopiedLowerThirdsLink(true);
        setTimeout(() => setCopiedLowerThirdsLink(false), 2000);
    });
  };

  const [copiedLinescoreLink, setCopiedLinescoreLink] = useState(false);
  const copyLinescoreLink = () => {
    const url = addGameParam(new URL('/linescore', window.location.origin));
    navigator.clipboard.writeText(url.href).then(() => {
        setCopiedLinescoreLink(true);
        setTimeout(() => setCopiedLinescoreLink(false), 2000);
    });
  };

  const [copiedLowProfileLink, setCopiedLowProfileLink] = useState(false);
  const copyLowProfileScoreboardLink = () => {
    const url = addGameParam(new URL('/low-profile-scoreboard', window.location.origin));
    navigator.clipboard.writeText(url.href).then(() => {
        setCopiedLowProfileLink(true);
        setTimeout(() => setCopiedLowProfileLink(false), 2000);
    });
  };

  const [copiedFieldPlayersLink, setCopiedFieldPlayersLink] = useState(false);
  const copyFieldPlayersLink = () => {
    const url = addGameParam(new URL('/field-players', window.location.origin));
    navigator.clipboard.writeText(url.href).then(() => {
        setCopiedFieldPlayersLink(true);
        setTimeout(() => setCopiedFieldPlayersLink(false), 2000);
    });
  };

  const [copiedBattingOrderLink, setCopiedBattingOrderLink] = useState(false);
  const copyBattingOrderLink = () => {
    const url = addGameParam(new URL('/batting-order', window.location.origin));
    navigator.clipboard.writeText(url.href).then(() => {
        setCopiedBattingOrderLink(true);
        setTimeout(() => setCopiedBattingOrderLink(false), 2000);
    });
  };

  const battingTeam = gameState.isTopInning ? gameState.awayTeam : gameState.homeTeam;
  const activeLineup = getActiveLineup(battingTeam.roster);
  const batterIndex = gameState.isTopInning ? gameState.currentBatterIndex.away : gameState.currentBatterIndex.home;
  const currentBatter = activeLineup[batterIndex];
  const currentBatterId = currentBatter ? currentBatter.id : null;

  const currentPitcher = gameState.isTopInning ? gameState.currentPitcher.home : gameState.currentPitcher.away;
  const currentPitcherId = currentPitcher ? currentPitcher.id : null;


  return (
    <div className="bg-gray-900 min-h-screen text-white p-3 sm:p-4 lg:p-6 pb-[55vh] lg:pb-[50vh] flex flex-col items-center">
      <header className="w-full max-w-7xl mb-6 text-center relative">
        {gameState.gameStatus !== 'playing' && (
          <>
            <div className="flex justify-center items-center gap-4 mb-4">
              <img 
                src="https://bstrana.sirv.com/ybc/ybc-logo.png" 
                alt="YBC Logo" 
                className="h-12 sm:h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h1 className="text-xl sm:text-4xl font-bold text-yellow-300 tracking-wider">Diamond Manager Scorer</h1>
            </div>
          </>
        )}
         <div className="absolute top-0 right-0 flex items-center space-x-2">
            {gameState.gameStatus === 'playing' && !isEditingSetup && (
              <>
                {viewMode !== 'all' && (
                  <button onClick={() => setViewMode('all')} className="p-2 text-gray-400 hover:text-white transition-colors" title="Show All">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  </button>
                )}
                {viewMode !== 'stats' && (
                  <button onClick={() => setViewMode('stats')} className="p-2 text-gray-400 hover:text-white transition-colors" title="Stats View">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                    </svg>
                  </button>
                )}
                {viewMode !== 'score' && (
                   <button onClick={() => setViewMode('score')} className="p-2 text-gray-400 hover:text-white transition-colors" title="Scoring View">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button onClick={() => setIsEditingSetup(true)} className="p-2 text-gray-400 hover:text-white transition-colors" aria-label="Edit Game Setup" title="Game Setup">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </>
            )}
        </div>
      </header>
      
      {gameState.gameStatus === 'setup' || isEditingSetup ? (
        <GameSetup 
          onGameSetup={setupGame}
          onUpdateSetupData={updateSetupData}
          onCancelEdit={() => setIsEditingSetup(false)}
          isEditing={isEditingSetup}
          initialState={gameState}
          onSettingsUpdate={handleSettingsUpdate}
        />
      ) : (
        <>
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-5 gap-8">
            <main className="lg:col-span-5 flex flex-col items-center">
<div className="w-full p-4 bg-black/50 rounded-lg border border-gray-700">
                  <Scoreboard gameState={gameState} />
              </div>
            </main>
            
            {viewMode !== 'stats' && (
                <aside className={`hidden lg:block ${viewMode === 'score' ? 'lg:col-span-5' : 'lg:col-span-2'}`}>
                   <ControlPanel 
                      onPitch={handlePitch}
                      onHit={handleHit}
                      onOut={handleOut}
                      onSacFly={handleSacFly}
                      onSacBunt={handleSacBunt}
                      onFieldersChoice={handleFieldersChoice}
                      onReachedOnError={handleReachedOnError}
                      onHBP={handleHBP}
                      onIntentionalWalk={handleIntentionalWalk}
                      onRunnerOut={handleRunnerOut}
                      onRunnerAdvanceOnError={handleRunnerAdvanceOnError}
                      onManualRunnerAdvance={handleManualRunnerAdvance}
                      onCountCorrection={handleCountCorrection}
                      onInningCorrection={handleInningCorrection}
                      onPitchCountCorrection={handlePitchCountCorrection}
                      onBaseRunnerCorrection={handleBaseRunnerCorrection}
                      onErrorCorrection={handleErrorCorrection}
                      onScoreCorrection={handleScoreCorrection}
                      onTopBottomToggle={handleTopBottomToggle}
                      onStolenBase={handleStolenBase}
                      onCaughtStealing={handleCaughtStealing}
                      onBalk={handleBalk}
                      onPinchRun={handlePinchRunner}
                      gameState={gameState}
                    />
                </aside>
            )}

            {viewMode !== 'score' && (
                <section className={`${viewMode === 'stats' ? 'lg:col-span-5' : 'lg:col-span-3'} space-y-8`}>
                  <PlayerStats 
                    homeTeam={gameState.homeTeam} 
                    awayTeam={gameState.awayTeam} 
                    onSubstitute={handlePlayerSubstitution}
                    onPositionSwap={handlePositionSwap}
                    currentBatterId={currentBatterId}
                    isTopInning={gameState.isTopInning}
                    bases={gameState.bases}
                  />
                  <PitchingStats
                    homeTeam={gameState.homeTeam} 
                    awayTeam={gameState.awayTeam}
                    currentPitcherId={currentPitcherId}
                  />
                </section>
            )}
            
            <footer className="lg:col-span-5 mt-8 text-center flex justify-center flex-wrap gap-4">
              <button
                onClick={() => setIsConfirmFinalModalOpen(true)}
                disabled={gameState.gameStatus === 'final'}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Finalize and end the game"
              >
                Final
              </button>
              <button
                onClick={() => { releaseStoredLock().catch(() => {}); resetGame(); }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-md font-bold transition-colors"
                title="Clear all game data and return to setup"
              >
                Reset Game
              </button>
              <button
                onClick={copyScoreboardLink}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 rounded-md font-bold transition-colors"
                title="Copy the public scoreboard URL to your clipboard"
              >
                {copiedLink ? 'Copied!' : 'Copy Scoreboard Link'}
              </button>
              <button
                onClick={copyLowerThirdsLink}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-bold transition-colors"
                title="Copy the batter lower thirds overlay URL to your clipboard"
              >
                {copiedLowerThirdsLink ? 'Copied!' : 'Copy Lower Thirds Link'}
              </button>
              <button
                onClick={copyLinescoreLink}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-bold transition-colors"
                title="Copy the linescore overlay URL to your clipboard"
              >
                {copiedLinescoreLink ? 'Copied!' : 'Copy Linescore Link'}
              </button>
              <button
                onClick={copyLowProfileScoreboardLink}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-bold transition-colors"
                title="Copy the low profile scoreboard overlay URL to your clipboard"
              >
                {copiedLowProfileLink ? 'Copied!' : 'Copy Low Profile Link'}
              </button>
              <button
                onClick={copyFieldPlayersLink}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md font-bold transition-colors"
                title="Copy the field players overlay URL to your clipboard"
              >
                {copiedFieldPlayersLink ? 'Copied!' : 'Copy Field Players Link'}
              </button>
              <button
                onClick={copyBattingOrderLink}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 rounded-md font-bold transition-colors"
                title="Copy the batting order overlay URL to your clipboard"
              >
                {copiedBattingOrderLink ? 'Copied!' : 'Copy Batting Order Link'}
              </button>
              <a
                href="/manager-report"
                target="_blank"
                rel="noreferrer"
                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 rounded-md font-bold transition-colors"
                title="Open the manager report dashboard in a new tab"
              >
                Open Manager Report
              </a>
            </footer>
          </div>

          {/* Mobile Control Panel FAB */}
          {!isControlPanelOpen && (
            <div className="lg:hidden fixed bottom-6 right-6 z-40">
              <button
                onClick={() => setIsControlPanelOpen(true)}
                className="bg-yellow-400 text-gray-900 rounded-full p-4 shadow-lg hover:bg-yellow-500 transition-colors flex items-center justify-center"
                aria-label="Open Scoring Controls"
                title="Open Scoring Controls"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          )}

          {/* Mobile Control Panel — bottom sheet (bottom 50% of screen) */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out lg:hidden`}
            style={{ height: '50vh', transform: isControlPanelOpen ? 'translateY(0)' : 'translateY(100%)' }}
          >
            {/* drag handle / header */}
            <div className="bg-gray-800 border-t-2 border-yellow-400 rounded-t-2xl flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 flex-shrink-0">
                <button
                  onClick={() => setIsControlPanelOpen(false)}
                  className="w-10 h-1.5 bg-gray-500 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2"
                  aria-label="Close"
                />
                <h2 className="text-base font-bold text-yellow-300 pt-3">Scoring Controls</h2>
                <button
                  onClick={() => setIsControlPanelOpen(false)}
                  className="p-1 text-gray-400 hover:text-white pt-3"
                  aria-label="Close Scoring Controls"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-3">
                <ControlPanel
                    onPitch={handlePitch}
                    onHit={handleHit}
                    onOut={handleOut}
                    onSacFly={handleSacFly}
                    onSacBunt={handleSacBunt}
                    onFieldersChoice={handleFieldersChoice}
                    onReachedOnError={handleReachedOnError}
                    onHBP={handleHBP}
                    onIntentionalWalk={handleIntentionalWalk}
                    onRunnerOut={handleRunnerOut}
                    onRunnerAdvanceOnError={handleRunnerAdvanceOnError}
                    onManualRunnerAdvance={handleManualRunnerAdvance}
                    onCountCorrection={handleCountCorrection}
                    onInningCorrection={handleInningCorrection}
                    onPitchCountCorrection={handlePitchCountCorrection}
                    onBaseRunnerCorrection={handleBaseRunnerCorrection}
                    onErrorCorrection={handleErrorCorrection}
                    onScoreCorrection={handleScoreCorrection}
                    onTopBottomToggle={handleTopBottomToggle}
                    onStolenBase={handleStolenBase}
                    onCaughtStealing={handleCaughtStealing}
                    onBalk={handleBalk}
                    onPinchRun={handlePinchRunner}
                    gameState={gameState}
                  />
              </div>
            </div>
          </div>
          
          {isSummaryModalOpen && gameState.gameStatus === 'final' && (
            <GameSummaryModal 
              gameState={gameState} 
              onClose={() => setIsSummaryModalOpen(false)} 
            />
          )}

          <ConfirmationModal
            isOpen={isConfirmFinalModalOpen}
            onClose={() => setIsConfirmFinalModalOpen(false)}
            onConfirm={onConfirmFinalGame}
            title="End Game"
            message="Are you sure you want to end the game? This action cannot be undone."
          />
        </>
      )}

    </div>
  );
};

// Wrapper component that handles Keycloak authentication
const AppWithAuth: React.FC = () => {
  // Overlay pages are public - bypass authentication
  const overlayPages = ['/scoreboard', '/batter-lower-thirds', '/linescore', '/low-profile-scoreboard', '/field-players', '/batting-order', '/manager-report'];
  const currentPath = window.location.pathname.toLowerCase();
  const isOverlayPage = overlayPages.some(page => currentPath === page);
  
  // If it's an overlay page, render App directly without authentication
  if (isOverlayPage) {
    return <App />;
  }

  const [isUnlocked, setIsUnlocked] = useState(false);

  const keycloakUrl = getEnvVar('KEYCLOAK_URL');
  const realm = getEnvVar('KEYCLOAK_REALM');
  const clientId = getEnvVar('KEYCLOAK_CLIENT_ID');

  // Keycloak is required - show error if not configured
  if (!keycloakUrl || !realm || !clientId) {
    return (
      <div className="fixed inset-0 bg-gray-900 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md text-center">
          <header className="mb-8">
            <div className="flex justify-center items-center gap-4 mb-4">
              <img 
                src="https://bstrana.sirv.com/ybc/ybc-logo.png" 
                alt="YBC Logo" 
                className="h-12 sm:h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h1 className="text-xl sm:text-4xl font-bold text-yellow-300 tracking-wider">Diamond Manager Scorer</h1>
            </div>
          </header>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Configuration Error</h2>
              <p className="text-red-500 text-sm">
                Keycloak authentication is required but not configured.
              </p>
              <p className="text-gray-300 text-sm">
                Please set the following environment variables:
              </p>
              <ul className="text-left text-gray-400 text-sm space-y-2 mt-4">
                <li><code className="bg-gray-700 px-2 py-1 rounded">KEYCLOAK_URL</code></li>
                <li><code className="bg-gray-700 px-2 py-1 rounded">KEYCLOAK_REALM</code></li>
                <li><code className="bg-gray-700 px-2 py-1 rounded">KEYCLOAK_CLIENT_ID</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use Keycloak authentication
  return (
    <KeycloakAuthProvider
      onAuthenticated={() => {
        setIsUnlocked(true);
      }}
      onUnauthenticated={() => {
        setIsUnlocked(false);
      }}
    >
      {isUnlocked ? (
        <App />
      ) : (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm text-white flex flex-col justify-center items-center p-4 z-50">
          <div className="w-full max-w-md text-center">
            <header className="mb-8">
              <div className="flex justify-center items-center gap-4 mb-4">
                <img 
                  src="https://bstrana.sirv.com/ybc/ybc-logo.png" 
                  alt="YBC Logo" 
                  className="h-12 sm:h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <h1 className="text-xl sm:text-4xl font-bold text-yellow-300 tracking-wider">Diamond Manager Scorer</h1>
              </div>
            </header>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-300"></div>
                <p className="text-gray-300">Authenticating...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </KeycloakAuthProvider>
  );
};

export default AppWithAuth;