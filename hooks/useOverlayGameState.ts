import { useState, useEffect } from 'react';
import type { GameState } from '../types';
import { initialGameState } from './useGameState';
import { broadcastChannel } from '../services/broadcastService';
import { getPbClient } from '../services/pocketbaseClient';

const parseStateJson = (raw: unknown): GameState | null => {
  try {
    if (typeof raw === 'string') return JSON.parse(raw) as GameState;
    if (raw && typeof raw === 'object') return raw as GameState;
  } catch { /* ignore */ }
  return null;
};

/**
 * Shared hook for all overlay pages.
 *
 * - If the URL contains `?game=<pbRecordId>`: subscribes to PocketBase realtime
 *   SSE for that `game_states` record — instant push updates, no polling.
 * - Without `?game=`: falls back to 250 ms HTTP polling + BroadcastChannel +
 *   storage events (backward-compatible behaviour for un-parameterised links).
 */
export const useOverlayGameState = (): GameState => {
  const gameParam = new URLSearchParams(window.location.search).get('game');

  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem('gameState');
      return saved ? JSON.parse(saved) as GameState : initialGameState;
    } catch {
      return initialGameState;
    }
  });

  useEffect(() => {
    if (gameParam) {
      // ── PocketBase realtime mode ─────────────────────────────────────────────
      const pb = getPbClient();
      let cancelled = false;
      let pollInterval: ReturnType<typeof setInterval> | null = null;

      // Initial fetch
      pb.collection('game_states').getOne(gameParam)
        .then(record => {
          if (cancelled) return;
          const state = parseStateJson(record.state_json);
          if (state) setGameState(state);
        })
        .catch(err => console.debug('[Overlay] PB initial fetch failed:', err));

      // Try SSE realtime. If a proxy (e.g. Cloudron's outer nginx) blocks the
      // EventSource stream, subscribe() rejects — fall back to 3-second polling.
      pb.collection('game_states').subscribe(gameParam, (e) => {
        const state = parseStateJson(e.record?.state_json);
        if (state) setGameState(state);
      }).catch(err => {
        console.debug('[Overlay] PB SSE blocked, falling back to polling:', err);
        const poll = async () => {
          if (cancelled) return;
          try {
            const record = await pb.collection('game_states').getOne(gameParam);
            if (cancelled) return;
            const state = parseStateJson(record.state_json);
            if (state) setGameState(state);
          } catch { /* ignore transient errors */ }
        };
        poll();
        pollInterval = setInterval(poll, 3000);
      });

      return () => {
        cancelled = true;
        if (pollInterval) clearInterval(pollInterval);
        pb.collection('game_states').unsubscribe(gameParam);
      };
    }

    // ── Legacy polling mode (no ?game= param) ───────────────────────────────
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/gamestate?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json() as GameState & { error?: string };
          if (data && !data.error) {
            setGameState(prev => JSON.stringify(prev) !== JSON.stringify(data) ? data : prev);
            return;
          }
        }
      } catch { /* fall through to localStorage */ }
      try {
        const saved = localStorage.getItem('gameState');
        if (saved) {
          const parsed = JSON.parse(saved) as GameState;
          setGameState(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
      } catch { /* ignore */ }
    };

    fetchState();
    const interval = setInterval(fetchState, 250);

    const handleBroadcast = (e: MessageEvent<GameState>) => { if (e.data) setGameState(e.data); };
    broadcastChannel.addEventListener('message', handleBroadcast);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gameState' && e.newValue) {
        try { setGameState(JSON.parse(e.newValue) as GameState); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      broadcastChannel.removeEventListener('message', handleBroadcast);
      window.removeEventListener('storage', handleStorage);
    };
  }, [gameParam]);

  return gameState;
};
