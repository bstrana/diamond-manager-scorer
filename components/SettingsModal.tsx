import React, { useState, useEffect } from 'react';
import type { ScoreboardSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ScoreboardSettings) => void;
  currentSettings: ScoreboardSettings;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState(currentSettings);

  useEffect(() => {
    if (isOpen) {
        setSettings(currentSettings);
    }
  }, [currentSettings, isOpen]);

  const handleToggle = (key: keyof ScoreboardSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  if (!isOpen) return null;

  const ToggleSwitch: React.FC<{ label: string; isEnabled: boolean; onToggle: () => void; description: string }> = ({ label, isEnabled, onToggle, description }) => (
    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
      <div>
        <label className="font-medium text-white">{label}</label>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
        aria-checked={isEnabled}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-600">
        <h2 className="text-xl font-bold text-yellow-300 mb-4">Scoreboard Display Options</h2>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          <ToggleSwitch
            label="Show H/E/LOB"
            description="Display Hits, Errors, and Left on Base columns."
            isEnabled={settings.showHits} // Toggling one toggles all three
            onToggle={() => {
              const newState = !settings.showHits;
              setSettings(prev => ({ ...prev, showHits: newState, showErrors: newState, showLOB: newState }));
            }}
          />
          <ToggleSwitch
            label="Show Current Pitcher"
            description="Display the pitcher's name and pitch count."
            isEnabled={settings.showCurrentPitcher}
            onToggle={() => handleToggle('showCurrentPitcher')}
          />
          <ToggleSwitch
            label="Show Current Batter"
            description="Display the batter's name and daily stat line."
            isEnabled={settings.showCurrentBatter}
            onToggle={() => handleToggle('showCurrentBatter')}
          />
           <ToggleSwitch
            label="Show On Deck"
            description="Display the 'On Deck' and 'In the Hole' batters."
            isEnabled={settings.showOnDeck}
            onToggle={() => handleToggle('showOnDeck')}
          />
          {/* Lower Thirds Background Color */}
          <div className="bg-gray-700 p-3 rounded-md">
            <label className="font-medium text-white block mb-2">Lower Thirds Background Color</label>
            <p className="text-xs text-gray-400 mb-2">Set the background color for the batter lower thirds overlay.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={(() => {
                  // Extract hex from rgba or use default
                  const color = settings.lowerThirdsBackgroundColor || 'rgba(0, 0, 0, 0.9)';
                  if (color.startsWith('#')) return color;
                  if (color.startsWith('rgba')) {
                    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (match) {
                      const r = parseInt(match[1]).toString(16).padStart(2, '0');
                      const g = parseInt(match[2]).toString(16).padStart(2, '0');
                      const b = parseInt(match[3]).toString(16).padStart(2, '0');
                      return `#${r}${g}${b}`;
                    }
                  }
                  return '#000000';
                })()}
                onChange={(e) => {
                  // Convert hex to rgba with 90% opacity
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  const rgba = `rgba(${r}, ${g}, ${b}, 0.9)`;
                  setSettings(prev => ({ ...prev, lowerThirdsBackgroundColor: rgba }));
                }}
                className="w-16 h-10 rounded border-2 border-gray-500 cursor-pointer"
              />
              <input
                type="text"
                value={settings.lowerThirdsBackgroundColor || 'rgba(0, 0, 0, 0.9)'}
                onChange={(e) => setSettings(prev => ({ ...prev, lowerThirdsBackgroundColor: e.target.value }))}
                placeholder="rgba(0, 0, 0, 0.9)"
                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Supports hex (#000000) or rgba (rgba(0, 0, 0, 0.9)) format</p>
          </div>
          {/* Lower Thirds Text Color */}
          <div className="bg-gray-700 p-3 rounded-md">
            <label className="font-medium text-white block mb-2">Lower Thirds Text Color</label>
            <p className="text-xs text-gray-400 mb-2">Set the text color for the batter lower thirds overlay.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={(() => {
                  // Extract hex from rgba or use default
                  const color = settings.lowerThirdsTextColor || '#ffffff';
                  if (color.startsWith('#')) return color;
                  if (color.startsWith('rgba')) {
                    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                    if (match) {
                      const r = parseInt(match[1]).toString(16).padStart(2, '0');
                      const g = parseInt(match[2]).toString(16).padStart(2, '0');
                      const b = parseInt(match[3]).toString(16).padStart(2, '0');
                      return `#${r}${g}${b}`;
                    }
                  }
                  return '#ffffff';
                })()}
                onChange={(e) => {
                  // Use hex directly for text color (no opacity needed)
                  setSettings(prev => ({ ...prev, lowerThirdsTextColor: e.target.value }));
                }}
                className="w-16 h-10 rounded border-2 border-gray-500 cursor-pointer"
              />
              <input
                type="text"
                value={settings.lowerThirdsTextColor || '#ffffff'}
                onChange={(e) => setSettings(prev => ({ ...prev, lowerThirdsTextColor: e.target.value }))}
                placeholder="#ffffff"
                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Supports hex (#ffffff) or rgba (rgba(255, 255, 255, 1)) format</p>
          </div>
          {/* Overlay Settings Section */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <h3 className="text-lg font-bold text-yellow-300 mb-4">Overlay Settings</h3>
            <div className="space-y-3">
              <ToggleSwitch
                label="Lock Overlay Positions"
                isEnabled={settings.lockOverlayPositions ?? false}
                onToggle={() => handleToggle('lockOverlayPositions')}
                description="Prevent dragging name tags in field players and batting order overlays"
              />
              {/* Name Tag Accent Color */}
              <div className="bg-gray-700 p-3 rounded-md">
                <label className="font-medium text-white block mb-2">Name Tag Accent Color</label>
                <p className="text-xs text-gray-400 mb-2">Set the accent color for name tags in field players and batting order overlays.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.nameTagAccentColor || '#facc15'}
                    onChange={(e) => setSettings(prev => ({ ...prev, nameTagAccentColor: e.target.value }))}
                    className="w-16 h-10 rounded border-2 border-gray-500 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.nameTagAccentColor || '#facc15'}
                    onChange={(e) => setSettings(prev => ({ ...prev, nameTagAccentColor: e.target.value }))}
                    placeholder="#facc15"
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Supports hex color format (e.g., #facc15)</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-bold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
