import React, { useState, useEffect } from 'react';
import type { GameState } from '../types';
import Scoreboard from './Scoreboard';
import { initialGameState } from '../hooks/useGameState';
import { broadcastChannel } from '../services/broadcastService';

const ScoreboardOnlyPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize state from localStorage on first render. This ensures
    // that if the overlay is refreshed, it loads the last known state.
    try {
      const savedState = localStorage.getItem('gameState');
      return savedState ? JSON.parse(savedState) : initialGameState;
    } catch (error) {
      console.error("Failed to parse game state from localStorage on init", error);
      return initialGameState;
    }
  });
  const [useGreenScreen, setUseGreenScreen] = useState(false);

  useEffect(() => {
    // This effect sets up listeners for real-time updates.
    
    // Primary listener: BroadcastChannel API. This is the most reliable method
    // for cross-window communication, especially for streaming software overlays (e.g., OBS).
    const handleBroadcastMessage = (event: MessageEvent<GameState>) => {
      if (event.data) {
        setGameState(event.data);
      }
    };
    broadcastChannel.addEventListener('message', handleBroadcastMessage);

    // Fallback listener: 'storage' event. This works between standard browser tabs
    // but often fails with isolated browser sources in streaming software.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'gameState' && event.newValue) {
        try {
          setGameState(JSON.parse(event.newValue));
        } catch (error) {
          console.error("Failed to parse game state from storage event", error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Polling fallback for OBS browser sources (which often don't support BroadcastChannel or storage events)
    // Try API endpoint first (works across isolated contexts), then fallback to localStorage
    const pollInterval = setInterval(() => {
      // Try server API first (best for OBS)
      fetch('/api/gamestate')
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setGameState(prevState => {
              const prevStr = JSON.stringify(prevState);
              const newStr = JSON.stringify(data);
              if (prevStr !== newStr) {
                return data;
              }
              return prevState;
            });
          } else {
            // Fallback to localStorage if API fails
            try {
              const savedState = localStorage.getItem('gameState');
              if (savedState) {
                const parsed = JSON.parse(savedState);
                setGameState(prevState => {
                  const prevStr = JSON.stringify(prevState);
                  const newStr = JSON.stringify(parsed);
                  if (prevStr !== newStr) {
                    return parsed;
                  }
                  return prevState;
                });
              }
            } catch (error) {
              console.error("Failed to poll game state from localStorage:", error);
            }
          }
        })
        .catch(() => {
          // API failed, try localStorage
          try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              setGameState(prevState => {
                const prevStr = JSON.stringify(prevState);
                const newStr = JSON.stringify(parsed);
                if (prevStr !== newStr) {
                  return parsed;
                }
                return prevState;
              });
            }
          } catch (error) {
            console.error("Failed to poll game state from localStorage:", error);
          }
        });
    }, 250); // Poll every 250ms for near real-time updates

    // Cleanup function to remove listeners when the component unmounts.
    return () => {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  return (
    <div className={`min-h-screen ${useGreenScreen ? 'bg-[#00b140]' : 'bg-transparent'}`}>
       <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
            <button 
                onClick={() => setUseGreenScreen(s => !s)}
                className="text-xs bg-black/50 text-white px-2 py-1 rounded"
                title="Toggle Chroma Key Green Screen"
            >
                {useGreenScreen ? 'Transparent BG' : 'Green Screen BG'}
            </button>
        </div>
      <div className="p-4">
        <Scoreboard gameState={gameState} />
      </div>
    </div>
  );
};

export default ScoreboardOnlyPage;
