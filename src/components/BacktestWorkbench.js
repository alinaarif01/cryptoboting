'use client';

import { useState } from 'react';

export default function BacktestWorkbench({ onRunBacktest }) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setIntervalVal] = useState('1h');
  const [limit, setLimit] = useState(300);
  const [strategy, setStrategy] = useState('AI_ALPHA_85');
  const [tradeAmount, setTradeAmount] = useState(1000);
  const [stopLossPercent, setStopLossPercent] = useState(2.5);
  const [takeProfitPercent, setTakeProfitPercent] = useState(6.5);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const handleRun = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onRunBacktest({
        symbol,
        interval,
        limit,
        options: {
          strategy,
          tradeAmount,
          stopLossPercent,
          takeProfitPercent
        }
      });
      if (res && res.success && res.data) {
        setReport(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreset85 = () => {
    setStrategy('AI_ALPHA_85');
    setIntervalVal('1h');
    setLimit(300);
    setStopLossPercent(2.5);
    setTakeProfitPercent(6.5);
  };

  return (
    <div className="backtest-grid">
      {/* Backtest Config Controls */}
      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><i className="fa-solid fa-vial-circle-check"></i> Historical Strategy Backtester</h3>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '11px', padding: '4px 10px', borderColor: '#38bdf8', color: '#38bdf8' }}
            onClick={handlePreset85}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> 85% Accuracy Preset
          </button>
        </div>

        <form onSubmit={handleRun}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Target Trading Pair</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Candle Timeframe</label>
            <select value={interval} onChange={(e) => setIntervalVal(e.target.value)}>
              <option value="15m">15 Minutes (Scalping)</option>
              <option value="1h">1 Hour (Intraday Trend)</option>
              <option value="4h">4 Hours (Swing Confluence)</option>
              <option value="1d">1 Day (Macro Trend)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Historical Candle Depth</label>
            <input type="number" min="50" max="500" value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 200)} />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Algorithm Strategy Model</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option value="AI_ALPHA_85">★ AI Alpha 85% Confluence (Multi-EMA + RSI + Volume)</option>
              <option value="RSI">RSI Dynamic Momentum Strategy</option>
              <option value="GRID">Grid Volatility Channel Strategy</option>
              <option value="DCA">Dollar Cost Averaging (DCA Accumulation)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Stop Loss (%)</label>
              <input
                type="number"
                step="0.1"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(parseFloat(e.target.value) || 2.5)}
              />
            </div>
            <div className="form-group">
              <label>Take Profit (%)</label>
              <input
                type="number"
                step="0.1"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(parseFloat(e.target.value) || 6.5)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-start" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`}></i>
            {loading ? 'Simulating Historical Ticks...' : 'Execute Backtest Simulation'}
          </button>
        </form>
      </div>

      {/* Backtest Results Report */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-square-poll-vertical"></i> Simulation Performance Report</h3>
        </div>

        {report ? (
          <div>
            <div className="bt-summary-cards">
              <div className="bt-card">
                <span className="title">Win Rate Accuracy</span>
                <h3 style={{ color: report.winRate >= 80 ? '#10b981' : report.winRate >= 60 ? '#38bdf8' : '#f43f5e' }}>
                  {report.winRate.toFixed(1)}%
                </h3>
              </div>

              <div className="bt-card">
                <span className="title">Total Net Return</span>
                <h3 style={{ color: report.totalProfit >= 0 ? '#10b981' : '#f43f5e' }}>
                  ${report.totalProfit.toFixed(2)} ({report.roi.toFixed(2)}%)
                </h3>
              </div>

              <div className="bt-card">
                <span className="title">Profit Factor</span>
                <h3 style={{ color: '#38bdf8' }}>{report.profitFactor.toFixed(2)}</h3>
              </div>

              <div className="bt-card">
                <span className="title">Max Drawdown</span>
                <h3 style={{ color: '#f43f5e' }}>{report.maxDrawdown.toFixed(2)}%</h3>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', margin: '14px 0', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px' }}>
              <span>Total Trades: <strong>{report.totalTradesCount}</strong></span>
              <span>Winning Trades: <strong style={{ color: '#10b981' }}>{report.winningTradesCount || 0}</strong></span>
              <span>Losing Trades: <strong style={{ color: '#f43f5e' }}>{report.losingTradesCount || 0}</strong></span>
              <span>Strategy: <strong style={{ color: '#38bdf8' }}>{report.strategy}</strong></span>
            </div>

            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>PnL ($)</th>
                    <th>Reason</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {report.trades && report.trades.length > 0 ? (
                    report.trades.map((t, idx) => (
                      <tr key={idx}>
                        <td style={{ color: t.type === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{t.type}</td>
                        <td>${t.price ? Number(t.price).toFixed(2) : '0.00'}</td>
                        <td>{t.amount ? Number(t.amount).toFixed(4) : '0.00'}</td>
                        <td style={{ color: t.pnl > 0 ? '#10b981' : t.pnl < 0 ? '#f43f5e' : '#94a3b8', fontWeight: 600 }}>
                          {t.pnl !== undefined && t.type === 'SELL' ? `${t.pnl > 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}` : '--'}
                        </td>
                        <td style={{ fontSize: '11px', color: '#94a3b8' }}>{t.reason}</td>
                        <td style={{ fontSize: '11px', color: '#64748b' }}>{t.time || new Date(t.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">No trades triggered in this backtest window</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <i className="fa-solid fa-chart-line" style={{ fontSize: '32px', marginBottom: '12px', display: 'block', color: '#38bdf8' }}></i>
            Select your parameters and click <strong>Execute Backtest Simulation</strong> to evaluate win rate, net PnL, profit factor, and trade signals.
          </div>
        )}
      </div>
    </div>
  );
}
