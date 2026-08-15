'use client';

export default function MetricsBar({
  paperWallet,
  activeStrategy,
  openPositionsCount,
  botStatus = 'STOPPED',
  onToggleMasterBot,
  onEmergencyStop
}) {
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

      {/* Bot Master Controls Card */}
      <div className="metric-card" style={{ background: 'rgba(30, 41, 59, 0.7)', borderColor: 'rgba(56, 189, 248, 0.3)', flex: '1 1 280px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="metric-icon" style={{ background: botStatus === 'RUNNING' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)', color: botStatus === 'RUNNING' ? '#10b981' : '#f43f5e' }}>
            <i className={`fa-solid ${botStatus === 'RUNNING' ? 'fa-circle-play' : 'fa-circle-pause'}`}></i>
          </div>
          <div>
            <span className="label" style={{ fontSize: '11px', color: '#94a3b8' }}>Bot Engine Controls</span>
            <h4 style={{ margin: 0, color: botStatus === 'RUNNING' ? '#10b981' : '#f43f5e', fontSize: '14px', fontWeight: 'bold' }}>
              {botStatus === 'RUNNING' ? '● RUNNING' : '○ STOPPED'}
            </h4>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${botStatus === 'RUNNING' ? 'btn-stop' : 'btn-start'}`}
            onClick={onToggleMasterBot}
            style={{ padding: '7px 12px', fontSize: '12px' }}
          >
            <i className={`fa-solid ${botStatus === 'RUNNING' ? 'fa-square' : 'fa-play'}`}></i>
            {botStatus === 'RUNNING' ? 'STOP BOT' : 'START BOT'}
          </button>

          <button
            className="btn"
            onClick={onEmergencyStop}
            style={{ padding: '7px 10px', fontSize: '11px', background: '#f43f5e', color: '#fff' }}
            title="Emergency Panic Kill-Switch"
          >
            <i className="fa-solid fa-triangle-exclamation"></i> PANIC STOP
          </button>
        </div>
      </div>
    </section>
  );
}
