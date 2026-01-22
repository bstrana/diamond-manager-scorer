import type { GameState } from '../types';

// Create a single BroadcastChannel instance to be used across the app.
// The name "baseball-scoreboard-state" is a unique identifier for our channel.
// A try-catch block is included for environments where BroadcastChannel may not be supported.
let channel: BroadcastChannel;
try {
    channel = new BroadcastChannel('baseball-scoreboard-state');
} catch (e) {
    console.warn("BroadcastChannel API not supported in this environment.");
    // Provide a dummy object so the app doesn't crash if the API is missing.
    channel = {
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
    } as any;
}

export const broadcastChannel = channel;

/**
 * Posts the latest game state to all listening contexts (e.g., the scoreboard overlay).
 * This allows for real-time updates across different browser tabs or windows.
 * @param gameState The complete, updated game state object.
 */
export const broadcastGameState = (gameState: GameState): void => {
  try {
    // The postMessage method sends the gameState object to all listeners on the channel.
    broadcastChannel.postMessage(gameState);
  } catch (error) {
    // Log any errors that occur during broadcasting, e.g., if the data can't be cloned.
    console.error("Could not broadcast game state:", error);
  }
};
