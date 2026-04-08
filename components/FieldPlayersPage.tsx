import React, { useState } from 'react';
import FieldPlayers from './FieldPlayers';
import { useOverlayGameState } from '../hooks/useOverlayGameState';

const FieldPlayersPage: React.FC = () => {
  const gameState = useOverlayGameState();
  const [useGreenScreen, setUseGreenScreen] = useState(false);

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
      <FieldPlayers gameState={gameState} />
    </div>
  );
};

export default FieldPlayersPage;
