'use client';

import { useState } from 'react';

export default function BacktestWorkbench({ onRunBacktest }) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setIntervalVal] = useState('1h');
  const [limit, setLimit] = useState(300);
  const [strategy, setStrategy] = useState('RSI');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const handleRun = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await onRunBacktest({
      symbol,
      interval,
      limit,
      options: { strategy }
    });
    setLoading(false);
    if (res && res.success && res.data) {
      setReport(res.data);
    }
  };

  return (
    <div className="backtest-grid">
      {/* Backtest Config Controls */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-vial-circle-check"></i> Historical Strategy Backtester</h3>
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
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Historical Candle Depth</label>
            <input type="number" value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Algorithm Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              <option value="RSI">RSI Momentum Strategy</option>
              <option value="GRID">Grid Trading Strategy</option>
              <option value="DCA">Dollar Cost Averaging (DCA)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-start" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            <i className="fa-solid fa-play"></i> {loading ? 'Running Simulation...' : 'Execute Backtest Simulation'}
          </button>
        </form>
      </div>

      {/* Backtest Results Report */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-square-poll-vertical"></i> Backtest Performance Report</h3>
        </div>

        {report ? (
          <div>
            <div className="bt-summary-cards">
              <div className="bt-card">
                <span className="title">Total Return PnL</span>
                <h3 style={{ color: report.summary.totalPnLUSD >= 0 ? '#10b981' : '#f43f5e' }}>
                  ${report.summary.totalPnLUSD.toFixed(2)} ({report.summary.totalPnLPercent.toFixed(2)}%)
                </h3>
              </div>

              <div className="bt-card">
                <span className="title">Win Rate</span>
                <h3 style={{ color: '#38bdf8' }}>{report.summary.winRatePercent.toFixed(1)}%</h3>
              </div>

              <div className="bt-card">
                <span className="title">Total Trades</span>
                <h3>{report.summary.totalTrades}</h3>
              </div>

              <div className="bt-card">
                <span className="title">Max Drawdown</span>
                <h3 style={{ color: '#f43f5e' }}>{report.summary.maxDrawdownPercent.toFixed(2)}%</h3>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Time</th>
                    <th>PnL ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.trades && report.trades.length > 0 ? (
                    report.trades.slice(0, 10).map((t, idx) => (
                      <tr key={idx}>
                        <td style={{ color: t.type === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{t.type}</td>
                        <td>${t.price.toFixed(2)}</td>
                        <td>{t.amount.toFixed(4)}</td>
                        <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
                        <td style={{ color: t.pnlUSD > 0 ? '#10b981' : t.pnlUSD < 0 ? '#f43f5e' : '#94a3b8' }}>
                          {t.pnlUSD ? `$${t.pnlUSD.toFixed(2)}` : '--'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">No trades triggered during backtest period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <i className="fa-solid fa-chart-line" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
            Run a historical backtest to analyze strategy win rate, profit factor, drawdown, and trade logs.
          </div>
        )}
      </div>
    </div>
  );
}
