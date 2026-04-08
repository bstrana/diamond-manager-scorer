import { getPbClient } from './pocketbaseClient';

export interface GameLock {
  id: string;
  game_id: string;
  scorekeeper_name: string;
  locked_at: string;
}

const LOCK_KEY = 'currentGameLockId';

export const getStoredLockId = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(LOCK_KEY) : null;

export const fetchGameLocks = async (): Promise<GameLock[]> => {
  try {
    const pb = getPbClient();
    return await pb.collection('game_locks').getFullList<GameLock>();
  } catch {
    return [];
  }
};

/** Create a lock for a scheduled game. Releases any previously held lock first. */
export const createGameLock = async (gameId: string, scorekeeperName: string): Promise<string | null> => {
  await releaseStoredLock();
  try {
    const pb = getPbClient();
    const record = await pb.collection('game_locks').create<GameLock>({
      game_id: gameId,
      scorekeeper_name: scorekeeperName || 'Scorekeeper',
      locked_at: new Date().toISOString(),
    });
    localStorage.setItem(LOCK_KEY, record.id);
    return record.id;
  } catch (err) {
    console.debug('[GameLock] Failed to create lock:', err);
    return null;
  }
};

/** Release the lock stored in localStorage (best-effort). */
export const releaseStoredLock = async (): Promise<void> => {
  const lockId = localStorage.getItem(LOCK_KEY);
  if (!lockId) return;
  localStorage.removeItem(LOCK_KEY);
  try {
    const pb = getPbClient();
    await pb.collection('game_locks').delete(lockId);
  } catch {
    // Already deleted or PB unavailable — ignore
  }
};

/**
 * Subscribe to real-time lock changes.
 * Returns an unsubscribe function.
 */
export const subscribeToGameLocks = async (
  onUpdate: (locks: GameLock[]) => void
): Promise<() => void> => {
  const pb = getPbClient();
  await pb.collection('game_locks').subscribe('*', async () => {
    const locks = await fetchGameLocks();
    onUpdate(locks);
  });
  return () => { pb.collection('game_locks').unsubscribe('*'); };
};
