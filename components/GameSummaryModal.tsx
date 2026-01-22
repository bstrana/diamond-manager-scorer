import React, { useMemo, useState, useEffect } from 'react';
import type { GameState } from '../types';
import { generateGameSummary } from '../services/gameSummaryService';
import { generateAIGameRecap, isOpenRouterConfigured } from '../services/openRouterService';

interface GameSummaryModalProps {
  gameState: GameState;
  onClose: () => void;
}


const GameSummaryModal: React.FC<GameSummaryModalProps> = ({ gameState, onClose }) => {
    const [copied, setCopied] = useState(false);
    const [useAI, setUseAI] = useState(false);
    const [aiRecap, setAiRecap] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const basicSummary = useMemo(() => generateGameSummary(gameState), [gameState]);
    const openRouterAvailable = isOpenRouterConfigured();

    const summaryText = useAI ? (aiRecap || '') : basicSummary;

    useEffect(() => {
        // Reset AI state when switching modes
        if (!useAI) {
            setAiRecap(null);
            setAiError(null);
        }
    }, [useAI]);

    const handleGenerateAI = async () => {
        if (!openRouterAvailable) {
            setAiError('OpenRouter API key is not configured');
            return;
        }

        setIsGenerating(true);
        setAiError(null);
        setUseAI(true);

        try {
            const recap = await generateAIGameRecap(gameState);
            setAiRecap(recap);
        } catch (error) {
            setAiError(error instanceof Error ? error.message : 'Failed to generate AI recap');
            console.error('Error generating AI recap:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(summaryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
  
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            aria-labelledby="summary-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-600 flex flex-col">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 id="summary-modal-title" className="text-xl font-bold text-yellow-300">
                            {useAI ? 'AI Game Recap' : 'Game Summary'}
                        </h2>
                        {openRouterAvailable && (
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useAI}
                                        onChange={(e) => {
                                            setUseAI(e.target.checked);
                                            if (e.target.checked && !aiRecap && !isGenerating) {
                                                handleGenerateAI();
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500 focus:ring-2"
                                    />
                                    <span>AI Recap</span>
                                </label>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white" aria-label="Close Summary" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto" style={{maxHeight: '70vh'}}>
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-300 mb-4"></div>
                            <p className="text-gray-300">Generating AI recap...</p>
                        </div>
                    ) : aiError ? (
                        <div className="bg-red-900/20 border border-red-700 rounded-md p-4 text-red-400">
                            <p className="font-bold mb-2">Error generating AI recap:</p>
                            <p className="text-sm">{aiError}</p>
                            {openRouterAvailable && (
                                <button
                                    onClick={handleGenerateAI}
                                    className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md font-bold transition-colors text-white"
                                >
                                    Try Again
                                </button>
                            )}
                        </div>
                    ) : useAI && aiRecap ? (
                        <div className="bg-gray-900/50 p-6 rounded-md text-white whitespace-pre-wrap text-sm border border-gray-700 leading-relaxed">
                            {aiRecap}
                        </div>
                    ) : (
                        <pre className="bg-gray-900/50 p-4 rounded-md text-white whitespace-pre-wrap font-mono text-sm border border-gray-700">
                            {summaryText}
                        </pre>
                    )}
                </div>

                <footer className="p-4 border-t border-gray-700 flex justify-between items-center">
                    <div>
                        {openRouterAvailable && !useAI && (
                            <button
                                onClick={handleGenerateAI}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-bold transition-colors text-white text-sm"
                            >
                                {isGenerating ? 'Generating...' : 'Generate AI Recap'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleCopy}
                            disabled={isGenerating || (useAI && !aiRecap)}
                            className={`px-4 py-2 rounded-md font-bold transition-colors w-40 text-center disabled:opacity-50 disabled:cursor-not-allowed ${copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default GameSummaryModal;