'use client';

import { useState } from 'react';

export default function StrategyConfig({
  activeStrategy,
  onSelectStrategy,
  configParams,
  onSaveConfig
}) {
  const [formState, setFormState] = useState({
    rsiOversold: configParams?.rsiOversold || 30,
    rsiOverbought: configParams?.rsiOverbought || 70,
    rsiPeriod: configParams?.rsiPeriod || 14,
    gridLower: configParams?.gridLower || 60000,
    gridUpper: configParams?.gridUpper || 70000,
    gridLevels: configParams?.gridLevels || 5,
    stopLossPercent: configParams?.stopLossPercent || 3.0,
    takeProfitPercent: configParams?.takeProfitPercent || 6.0,
    tradeAllocationUSD: configParams?.tradeAllocationUSD || 1000
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: parseFloat(value) || value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveConfig(formState);
  };

  return (
    <div className="strategy-grid">
      {/* Strategy Selection Cards */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-layer-group"></i> Choose Algorithmic Strategy</h3>
        </div>

        <div className="strategy-cards-container">
          <div
            className={`strategy-option-card ${activeStrategy === 'RSI' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('RSI')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-chart-line"></i>
              <h4>RSI Momentum & EMA Filter</h4>
            </div>
            <p>Triggers BUY when 14-period RSI drops below Oversold boundary (e.g. 30) while price holds above trend filter. Sells on Overbought crossover.</p>
            <div className="strat-tags">
              <span>Momentum</span><span>Trend Following</span><span>Auto TP/SL</span>
            </div>
          </div>

          <div
            className={`strategy-option-card ${activeStrategy === 'GRID' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('GRID')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-grip"></i>
              <h4>Grid Trading Bot</h4>
            </div>
            <p>Places laddered buy & sell limit grid orders within a target price corridor to capture profits from sideways rangebound volatility.</p>
            <div className="strat-tags">
              <span>Rangebound</span><span>Volatile Market</span><span>Fixed Grids</span>
            </div>
          </div>

          <div
            className={`strategy-option-card ${activeStrategy === 'DCA' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('DCA')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-sack-dollar"></i>
              <h4>Dollar Cost Averaging (DCA)</h4>
            </div>
            <p>Automatically accumulates asset positions at fixed timed intervals regardless of short-term price fluctuations to lower average entry price.</p>
            <div className="strat-tags">
              <span>Long-Term</span><span>Low Maintenance</span><span>Accumulation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Parameter Form */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-sliders"></i> Strategy & Risk Controls</h3>
        </div>

        <form onSubmit={handleSubmit}>
          {activeStrategy === 'RSI' && (
            <div className="param-section">
              <h4><i className="fa-solid fa-sliders"></i> RSI Parameters</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>RSI Period</label>
                  <input type="number" name="rsiPeriod" value={formState.rsiPeriod} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Oversold Trigger (Buy)</label>
                  <input type="number" name="rsiOversold" value={formState.rsiOversold} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Overbought Trigger (Sell)</label>
                  <input type="number" name="rsiOverbought" value={formState.rsiOverbought} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {activeStrategy === 'GRID' && (
            <div className="param-section">
              <h4><i className="fa-solid fa-grip"></i> Grid Parameters</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Lower Price Limit ($)</label>
                  <input type="number" name="gridLower" value={formState.gridLower} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Upper Price Limit ($)</label>
                  <input type="number" name="gridUpper" value={formState.gridUpper} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Grid Levels</label>
                  <input type="number" name="gridLevels" value={formState.gridLevels} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          <div className="param-section">
            <h4><i className="fa-solid fa-shield-halved"></i> Risk Management & Allocation</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Trade Allocation ($)</label>
                <input type="number" name="tradeAllocationUSD" value={formState.tradeAllocationUSD} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Stop Loss (%)</label>
                <input type="number" step="0.1" name="stopLossPercent" value={formState.stopLossPercent} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Take Profit (%)</label>
                <input type="number" step="0.1" name="takeProfitPercent" value={formState.takeProfitPercent} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <i className="fa-solid fa-floppy-disk"></i> Apply Parameters
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
