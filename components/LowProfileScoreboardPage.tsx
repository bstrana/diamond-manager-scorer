import React, { useState, useEffect } from 'react';
import type { GameState } from '../types';
import LowProfileScoreboard from './LowProfileScoreboard';
import { initialGameState } from '../hooks/useGameState';
import { broadcastChannel } from '../services/broadcastService';

const LowProfileScoreboardPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize state from localStorage on first render
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
    // Initial fetch on mount (don't wait for first interval)
    const initialFetch = () => {
      const cacheBuster = `?t=${Date.now()}`;
      fetch(`/api/gamestate${cacheBuster}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data && !data.error) {
            setGameState(data);
            console.log('[LowProfileScoreboard] Initial game state loaded from API');
          }
        })
        .catch((err) => {
          console.debug('[LowProfileScoreboard] Initial API fetch failed, using localStorage:', err.message);
          // Fallback to localStorage
          try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              setGameState(parsed);
            }
          } catch (error) {
            console.error("Failed to load initial game state from localStorage:", error);
          }
        });
    };

    // Fetch immediately on mount
    initialFetch();

    // Polling for OBS browser sources (which often don't support BroadcastChannel or storage events)
    // Try API endpoint first (works across isolated contexts), then fallback to localStorage
    const pollInterval = setInterval(() => {
      // Try server API first (best for OBS)
      // Add cache-busting query parameter to prevent browser caching
      const cacheBuster = `?t=${Date.now()}`;
      fetch(`/api/gamestate${cacheBuster}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data && !data.error) {
            setGameState(prevState => {
              const prevStr = JSON.stringify(prevState);
              const newStr = JSON.stringify(data);
              if (prevStr !== newStr) {
                console.log('[LowProfileScoreboard] Game state updated from API');
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
                    console.log('[LowProfileScoreboard] Game state updated from localStorage');
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
        .catch((err) => {
          // API failed, try localStorage
          console.debug('[LowProfileScoreboard] API fetch failed, trying localStorage:', err.message);
          try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              setGameState(prevState => {
                const prevStr = JSON.stringify(prevState);
                const newStr = JSON.stringify(parsed);
                if (prevStr !== newStr) {
                  console.log('[LowProfileScoreboard] Game state updated from localStorage (fallback)');
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

    // Primary listener: BroadcastChannel API (for same-tab updates)
    const handleBroadcastMessage = (event: MessageEvent<GameState>) => {
      if (event.data) {
        setGameState(event.data);
      }
    };
    broadcastChannel.addEventListener('message', handleBroadcastMessage);

    // Fallback listener: 'storage' event (for cross-tab updates)
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

    // Cleanup function
    return () => {
      clearInterval(pollInterval);
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div className={`min-h-screen ${useGreenScreen ? 'bg-[#00b140]' : 'bg-transparent'}`}>
      <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={() => setUseGreenScreen(s => !s)}
          className="text-xs bg-black/50 text-white px-2 py-1 rounded"
          title="Toggle Chroma Key Green Screen"
        >
          {useGreenScreen ? 'Transparent BG' : 'Green Screen BG'}
        </button>
      </div>
      <div className="p-4">
        <LowProfileScoreboard gameState={gameState} />
      </div>
    </div>
  );
};

export default LowProfileScoreboardPage;

