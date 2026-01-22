import React from 'react';

interface StrikeoutTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'looking' | 'swinging') => void;
}

const StrikeoutTypeModal: React.FC<StrikeoutTypeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-600">
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-yellow-300">Strikeout Type</h2>
          <p className="text-sm text-gray-400 mt-1">How was the batter struck out?</p>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                onConfirm('looking');
                onClose();
              }}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-md font-bold transition-colors text-white"
            >
              Looking<br />
              <span className="text-sm font-normal">(Called Strike)</span>
            </button>
            <button
              onClick={() => {
                onConfirm('swinging');
                onClose();
              }}
              className="px-6 py-4 bg-red-600 hover:bg-red-700 rounded-md font-bold transition-colors text-white"
            >
              Swinging<br />
              <span className="text-sm font-normal">(Swinging Strike)</span>
            </button>
          </div>
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-bold transition-colors"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StrikeoutTypeModal;


