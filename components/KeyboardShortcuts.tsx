import React, { useState, useEffect } from 'react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'B', action: 'Ball' },
    { key: 'S', action: 'Strike' },
    { key: 'F', action: 'Foul' },
    { key: '1', action: 'Single (1B)' },
    { key: '2', action: 'Double (2B)' },
    { key: '3', action: 'Triple (3B)' },
    { key: 'H', action: 'Home Run' },
    { key: 'O', action: 'Fly Out' },
    { key: 'G', action: 'Ground Out' },
    { key: 'W', action: 'Walk' },
    { key: 'P', action: 'Hit By Pitch (HBP)' },
    { key: 'I', action: 'Intentional Walk' },
    { key: 'E', action: 'Reached on Error' },
    { key: 'A', action: 'Advance Runners' },
    { key: 'R', action: 'Reset Count' },
    { key: '?', action: 'Show/Hide Shortcuts' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-600" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-yellow-300">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.key} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">{shortcut.action}</span>
                <kbd className="px-3 py-1 bg-gray-900 border border-gray-600 rounded text-yellow-300 font-mono font-bold text-sm">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-4 text-center">
            Press <kbd className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-yellow-300 font-mono text-xs">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;


