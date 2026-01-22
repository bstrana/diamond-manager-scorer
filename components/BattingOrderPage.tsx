import React, { useState, useEffect } from 'react';
import type { GameState } from '../types';
import BattingOrder from './BattingOrder';
import { initialGameState } from '../hooks/useGameState';
import { broadcastChannel } from '../services/broadcastService';

// Helper function to normalize scoreboardSettings (ensure all fields are present)
const normalizeGameState = (state: GameState): GameState => {
  return {
    ...state,
    scoreboardSettings: {
      ...initialGameState.scoreboardSettings,
      ...(state.scoreboardSettings || {}),
    },
  };
};

const BattingOrderPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize state from localStorage on first render
    try {
      const savedState = localStorage.getItem('gameState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Ensure scoreboardSettings has all required fields (merge with defaults)
        parsed.scoreboardSettings = {
          ...initialGameState.scoreboardSettings,
          ...(parsed.scoreboardSettings || {}),
        };
        return parsed;
      }
      return initialGameState;
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
            setGameState(normalizeGameState(data));
            console.log('[BattingOrder] Initial game state loaded from API');
          }
        })
        .catch((err) => {
          console.debug('[BattingOrder] Initial API fetch failed, using localStorage:', err.message);
          // Fallback to localStorage
          try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              setGameState(normalizeGameState(parsed));
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
            const normalized = normalizeGameState(data);
            setGameState(prevState => {
              const prevStr = JSON.stringify(prevState);
              const newStr = JSON.stringify(normalized);
              if (prevStr !== newStr) {
                console.log('[BattingOrder] Game state updated from API');
                return normalized;
              }
              return prevState;
            });
          } else {
            // Fallback to localStorage if API fails
            try {
              const savedState = localStorage.getItem('gameState');
              if (savedState) {
                const parsed = JSON.parse(savedState);
                const normalized = normalizeGameState(parsed);
                setGameState(prevState => {
                  const prevStr = JSON.stringify(prevState);
                  const newStr = JSON.stringify(normalized);
                  if (prevStr !== newStr) {
                    console.log('[BattingOrder] Game state updated from localStorage');
                    return normalized;
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
          console.debug('[BattingOrder] API fetch failed, trying localStorage:', err.message);
          try {
            const savedState = localStorage.getItem('gameState');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              const normalized = normalizeGameState(parsed);
              setGameState(prevState => {
                const prevStr = JSON.stringify(prevState);
                const newStr = JSON.stringify(normalized);
                if (prevStr !== newStr) {
                  console.log('[BattingOrder] Game state updated from localStorage (fallback)');
                  return normalized;
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
          const parsed = JSON.parse(event.newValue);
          setGameState(normalizeGameState(parsed));
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
    <div className={`min-h-screen ${useGreenScreen ? 'bg-[#00b140]' : 'bg-transparent'}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={() => setUseGreenScreen(s => !s)}
          className="text-xs bg-black/50 text-white px-2 py-1 rounded"
          title="Toggle Chroma Key Green Screen"
        >
          {useGreenScreen ? 'Transparent BG' : 'Green Screen BG'}
        </button>
      </div>
      <BattingOrder gameState={gameState} />
    </div>
  );
};

export default BattingOrderPage;

