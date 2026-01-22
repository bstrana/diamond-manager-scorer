import React, { useState, useEffect } from 'react';
import type { GameState } from '../types';
import Linescore from './Linescore';
import { initialGameState } from '../hooks/useGameState';
import { broadcastChannel } from '../services/broadcastService';

const LinescorePage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize state from localStorage on first render
    try {
      const savedState = localStorage.getItem('gameState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
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
    // Set up listeners for real-time updates
    
    // Primary listener: BroadcastChannel API
    const handleBroadcastMessage = (event: MessageEvent<GameState>) => {
      if (event.data) {
        setGameState(event.data);
        // Also update localStorage for persistence
        try {
          localStorage.setItem('gameState', JSON.stringify(event.data));
        } catch (e) {
          console.error("Failed to save game state to localStorage:", e);
        }
      }
    };
    broadcastChannel.addEventListener('message', handleBroadcastMessage);

    // Fallback listener: 'storage' event
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

    // Also poll API endpoint periodically as a fallback (for OBS browser sources)
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
            // Fallback to localStorage
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
    }, 250); // Poll every 250ms for faster updates

    // Cleanup function
    return () => {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className={`min-h-screen ${useGreenScreen ? 'bg-[#00b140]' : 'bg-transparent'}`}>
      <div className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity z-50">
        <button 
          onClick={() => setUseGreenScreen(s => !s)}
          className="text-xs bg-black/50 text-white px-2 py-1 rounded"
          title="Toggle Chroma Key Green Screen"
        >
          {useGreenScreen ? 'Transparent BG' : 'Green Screen BG'}
        </button>
      </div>
      <div className="p-4">
        <Linescore gameState={gameState} />
      </div>
    </div>
  );
};

export default LinescorePage;


