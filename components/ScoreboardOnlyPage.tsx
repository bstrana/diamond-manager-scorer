import React, { useState } from 'react';
import Scoreboard from './Scoreboard';
import { useOverlayGameState } from '../hooks/useOverlayGameState';

const ScoreboardOnlyPage: React.FC = () => {
  const gameState = useOverlayGameState();
  const [useGreenScreen, setUseGreenScreen] = useState(false);

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
