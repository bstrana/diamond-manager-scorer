import React, { useState } from 'react';
import './BaseballField.css';

interface BaseballFieldProps {
  children?: React.ReactNode; // For overlaying player positions
  showPatternSelector?: boolean;
}

const BaseballField: React.FC<BaseballFieldProps> = ({ children, showPatternSelector = false }) => {
  const [pattern, setPattern] = useState<string>('stripes');

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPattern = e.target.value;
    setPattern(selectedPattern);
  };

  return (
    <div>
      {showPatternSelector && (
        <div className="pattern-selector">
          <label htmlFor="pattern" className="pattern-label">
            Select Field Pattern:
          </label>
          <select 
            id="pattern" 
            value={pattern}
            onChange={handlePatternChange}
            className="pattern-select"
          >
            <option value="stripes">Stripes</option>
            <option value="wide-stripes">Wide Stripes</option>
            <option value="cross-cut">Cross Cut</option>
            <option value="radial">Radial</option>
            <option value="diamond">Diamond</option>
            <option value="fan">Fan</option>
          </select>
        </div>
      )}

      <div className="perspective">
        <div className={`field ${pattern}`}>
          <div className="field-inner"></div>
          <div className="right-field-line"></div>
          <div className="left-field-line"></div>
          <div className="infield">
            <div className="infield-inner">
              <span className="home">
                <span className="plate"></span>
              </span>
              <span className="first"></span>
              <span className="second"></span>
              <span className="third"></span>
              <div className="pitchers-mound"></div>
            </div>
          </div>
          {/* Overlay for player positions */}
          {children && (
            <div className="player-positions-overlay">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BaseballField;

