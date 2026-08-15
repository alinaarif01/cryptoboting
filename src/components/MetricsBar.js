'use client';

export default function MetricsBar({ paperWallet, activeStrategy, openPositionsCount }) {
  const equity = paperWallet?.totalEquity || 10000;
  const balance = paperWallet?.balanceUSD || 10000;
  const pnlUSD = paperWallet?.totalPnL || 0;
  const pnlPercent = paperWallet?.totalPnLPercent || 0;

  const isPositive = pnlUSD > 0;
  const isNegative = pnlUSD < 0;
  const pnlClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';
  const sign = isPositive ? '+' : '';

  return (
    <section className="metrics-bar">
      <div className="metric-card">
        <div className="metric-icon usd"><i className="fa-solid fa-wallet"></i></div>
        <div className="metric-info">
          <span className="label">Total Equity</span>
          <h3 className="value">${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon cash"><i className="fa-solid fa-coins"></i></div>
        <div className="metric-info">
          <span className="label">Paper Balance</span>
          <h3 className="value">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon pnl"><i className="fa-solid fa-chart-pie"></i></div>
        <div className="metric-info">
          <span className="label">Total PnL ($)</span>
          <h3 className={`value ${pnlClass}`}>
            {sign}${pnlUSD.toFixed(2)} ({sign}{pnlPercent.toFixed(2)}%)
          </h3>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon strategy"><i className="fa-solid fa-robot"></i></div>
        <div className="metric-info">
          <span className="label">Active Strategy</span>
          <h3 className="value highlight">{activeStrategy || 'RSI'}</h3>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon positions"><i className="fa-solid fa-layer-group"></i></div>
        <div className="metric-info">
          <span className="label">Open Positions</span>
          <h3 className="value">{openPositionsCount || 0}</h3>
        </div>
      </div>
    </section>
  );
}
