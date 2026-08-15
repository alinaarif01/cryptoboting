'use client';

import { useState, useEffect } from 'react';

export default function StrategyConfig({
  activeStrategy = 'AI_ALPHA_85',
  onSelectStrategy,
  configParams = {},
  onSaveConfig
}) {
  const [formState, setFormState] = useState({
    rsiOversold: configParams?.rsiOversold ?? 32,
    rsiOverbought: configParams?.rsiOverbought ?? 68,
    rsiPeriod: configParams?.rsiPeriod ?? 14,
    gridLower: configParams?.gridLower ?? 60000,
    gridUpper: configParams?.gridUpper ?? 70000,
    gridLevels: configParams?.gridLevels ?? 5,
    stopLossPercent: configParams?.stopLossPercent ?? 2.5,
    takeProfitPercent: configParams?.takeProfitPercent ?? 6.5,
    tradeAllocationUSD: configParams?.tradeAllocationUSD ?? 1000,
    dailyMaxLossUSD: configParams?.dailyMaxLossUSD ?? 500,
    maxOpenPositions: configParams?.maxOpenPositions ?? 5,
    dailyMaxTrades: configParams?.dailyMaxTrades ?? 20,
    orderType: configParams?.orderType ?? 'MARKET',
    minWinRateTarget: configParams?.minWinRateTarget ?? 85
  });

  useEffect(() => {
    if (configParams && Object.keys(configParams).length > 0) {
      setFormState(prev => ({
        ...prev,
        ...configParams
      }));
    }
  }, [configParams]);

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
          <h3><i className="fa-solid fa-layer-group"></i> Algorithmic Strategy Selection</h3>
        </div>

        <div className="strategy-cards-container">
          <div
            className={`strategy-option-card ${activeStrategy === 'AI_ALPHA_85' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('AI_ALPHA_85')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#38bdf8' }}></i>
              <div>
                <h4>★ AI Alpha 85% Confluence Engine</h4>
                <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>HIGH ACCURACY QUANT ENGINE</span>
              </div>
            </div>
            <p>
              Combines Multi-EMA Trend Alignment (EMA20 &gt; EMA50) + Dynamic RSI Pullback + Volume Surge Confirmation with strict risk-to-reward ratio for maximum win-rate.
            </p>
            <div className="strat-tags">
              <span>85%+ Target</span><span>Trend Confluence</span><span>Volume Surge</span><span>Dynamic ATR</span>
            </div>
          </div>

          <div
            className={`strategy-option-card ${activeStrategy === 'RSI' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('RSI')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-chart-line" style={{ color: '#10b981' }}></i>
              <h4>RSI Dynamic Momentum</h4>
            </div>
            <p>Triggers BUY when 14-period RSI drops below Oversold boundary and SELLS upon crossing Overbought threshold.</p>
            <div className="strat-tags">
              <span>Momentum</span><span>Mean Reversion</span><span>Oscillator</span>
            </div>
          </div>

          <div
            className={`strategy-option-card ${activeStrategy === 'GRID' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('GRID')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-grip" style={{ color: '#a855f7' }}></i>
              <h4>Grid Trading Channel</h4>
            </div>
            <p>Executes automated laddered orders within a price range corridor to profit from sideways consolidation volatility.</p>
            <div className="strat-tags">
              <span>Rangebound</span><span>Volatile Market</span><span>Channel</span>
            </div>
          </div>

          <div
            className={`strategy-option-card ${activeStrategy === 'DCA' ? 'active' : ''}`}
            onClick={() => onSelectStrategy('DCA')}
          >
            <div className="strat-header">
              <i className="fa-solid fa-sack-dollar" style={{ color: '#f59e0b' }}></i>
              <h4>Dollar Cost Averaging (DCA)</h4>
            </div>
            <p>Systematically accumulates asset positions at periodic market intervals to reduce average cost basis over time.</p>
            <div className="strat-tags">
              <span>Accumulation</span><span>Low Drawdown</span><span>Long Term</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Parameter Form */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-sliders"></i> Strategy Parameters & Risk Management</h3>
        </div>

        <form onSubmit={handleSubmit}>
          {activeStrategy === 'AI_ALPHA_85' && (
            <div className="param-section">
              <h4><i className="fa-solid fa-microchip"></i> AI Alpha 85% Confluence Parameters</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>RSI Pullback Trigger (Max)</label>
                  <input type="number" name="rsiOversold" value={formState.rsiOversold} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Target Profit RSI Threshold</label>
                  <input type="number" name="rsiOverbought" value={formState.rsiOverbought} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Target Win Rate Accuracy (%)</label>
                  <input type="number" name="minWinRateTarget" value={formState.minWinRateTarget} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

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
            <h4><i className="fa-solid fa-shield-halved"></i> Capital Allocation & Risk Management</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Position Sizing / Trade ($ USD)</label>
                <input type="number" name="tradeAllocationUSD" value={formState.tradeAllocationUSD || 1000} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Stop Loss (%)</label>
                <input type="number" step="0.1" name="stopLossPercent" value={formState.stopLossPercent || 2.5} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Take Profit (%)</label>
                <input type="number" step="0.1" name="takeProfitPercent" value={formState.takeProfitPercent || 6.5} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Maximum Daily Loss Limit ($ USD)</label>
                <input type="number" name="dailyMaxLossUSD" value={formState.dailyMaxLossUSD || 500} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Max Concurrent Open Trades</label>
                <input type="number" name="maxOpenPositions" value={formState.maxOpenPositions || 5} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Daily Trading Limit (Max Trades)</label>
                <input type="number" name="dailyMaxTrades" value={formState.dailyMaxTrades || 20} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Order Execution Type</label>
                <select name="orderType" value={formState.orderType || 'MARKET'} onChange={handleChange}>
                  <option value="MARKET">Market Order (Instant Fill)</option>
                  <option value="LIMIT">Limit Order (Price Target)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="fa-solid fa-floppy-disk"></i> Save & Apply Configuration to Persistent Database
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
