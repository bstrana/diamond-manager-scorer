import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Player, DefensivePlays } from '../types';

interface MultiOutPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    batterResult: 'groundout' | 'flyout',
    runnerBasesOut: Array<'first' | 'second' | 'third'>,
    defensivePlays?: DefensivePlays,
  ) => void;
  runners: { first: Player | null; second: Player | null; third: Player | null };
  defensiveRoster: Player[];
}

const MultiOutPlayModal: React.FC<MultiOutPlayModalProps> = ({
  isOpen, onClose, onConfirm, runners, defensiveRoster,
}) => {
  const [batterResult, setBatterResult] = useState<'groundout' | 'flyout'>('groundout');
  const [runnersOut, setRunnersOut] = useState<Set<'first' | 'second' | 'third'>>(new Set());
  const [putoutById, setPutoutById] = useState('');
  const [assistByIds, setAssistByIds] = useState<string[]>([]);
  const [errorById, setErrorById] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBatterResult('groundout');
      setRunnersOut(new Set());
      setPutoutById('');
      setAssistByIds([]);
      setErrorById('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalOuts = 1 + runnersOut.size;
  const playLabel = totalOuts === 3 ? 'Triple Play' : totalOuts === 2 ? 'Double Play' : 'Single Out';
  const fielders = defensiveRoster.filter(p => p.position.toUpperCase() !== 'BENCH');
  const availableBases = (
    ['first', 'second', 'third'] as const
  ).filter(b => runners[b] !== null);

  const toggleRunner = (base: 'first' | 'second' | 'third') => {
    setRunnersOut(prev => {
      const next = new Set(prev);
      next.has(base) ? next.delete(base) : next.add(base);
      return next;
    });
  };

  const handleConfirm = () => {
    const dp: DefensivePlays | undefined = (putoutById || assistByIds.length || errorById)
      ? { putoutById: putoutById || undefined, assistByIds, errorById: errorById || undefined }
      : undefined;
    onConfirm(batterResult, Array.from(runnersOut), dp);
    onClose();
  };

  const baseName = { first: '1st', second: '2nd', third: '3rd' } as const;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-600 flex flex-col max-h-[90dvh] overflow-hidden">

        {/* Header */}
        <header className="p-4 border-b border-gray-700 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-yellow-300">Multi-Out Play</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalOuts} out{totalOuts !== 1 ? 's' : ''} —{' '}
              <span className={totalOuts >= 2 ? 'text-yellow-300 font-semibold' : 'text-gray-400'}>
                {playLabel}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Batter result */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">Batter result</p>
            <div className="grid grid-cols-2 gap-2">
              {(['groundout', 'flyout'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setBatterResult(r)}
                  className={`py-2.5 rounded-md font-bold text-sm transition-colors ${
                    batterResult === r
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {r === 'groundout' ? 'Ground Out' : 'Fly Out'}
                </button>
              ))}
            </div>
          </div>

          {/* Runners also out */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">
              Runners also out{' '}
              <span className="text-xs font-normal text-gray-500">(select one for DP, two for TP)</span>
            </p>
            {availableBases.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No runners on base</p>
            ) : (
              <div className="space-y-2">
                {availableBases.map(base => {
                  const runner = runners[base]!;
                  const checked = runnersOut.has(base);
                  return (
                    <label
                      key={base}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                        checked
                          ? 'border-yellow-400 bg-yellow-400/10'
                          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRunner(base)}
                        className="w-4 h-4 accent-yellow-400"
                      />
                      <span className="text-xs font-bold text-gray-400 w-8">{baseName[base]}</span>
                      <span className="text-sm font-semibold text-white">
                        #{runner.number} {runner.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Defensive play */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">Defensive play <span className="text-xs font-normal text-gray-500">(optional)</span></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Putout by</label>
                <select
                  value={putoutById}
                  onChange={e => setPutoutById(e.target.value)}
                  className="bg-gray-700 text-white w-full p-2 rounded border border-gray-600 text-sm"
                >
                  <option value="">— select —</option>
                  {fielders.map(p => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Assisted by (hold Ctrl/⌘ for multiple)</label>
                <select
                  multiple
                  value={assistByIds}
                  onChange={e => setAssistByIds([...e.target.selectedOptions].map(o => o.value))}
                  className="bg-gray-700 text-white w-full p-2 rounded border border-gray-600 text-sm h-20"
                >
                  {fielders.map(p => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-gray-700 flex justify-between items-center shrink-0">
          <div className="flex gap-1.5">
            {[...Array(totalOuts)].map((_, i) => (
              <span key={i} className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
            ))}
            {[...Array(3 - totalOuts)].map((_, i) => (
              <span key={i} className="w-3 h-3 rounded-full bg-gray-600 inline-block" />
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-md font-bold text-sm transition-colors"
            >
              Record {playLabel}
            </button>
          </div>
        </footer>

      </div>
    </div>,
    document.body
  );
};

export default MultiOutPlayModal;
