'use client';

export default function Header({ tickers, botStatus, isConnected, onToggleMasterBot, onEmergencyStop }) {
  return (
    <header className="top-header">
      <div className="brand">
        <div className="logo-icon">
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <div className="brand-text">
          <h1>CYPHER<span>BOT</span></h1>
          <span className="version-tag">NEXT v3.0</span>
        </div>
      </div>

      {/* Ticker Tape */}
      <div className="ticker-tape" id="tickerTape">
        {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'].map((pairKey) => {
          const slashKey = pairKey.replace('USDT', '/USDT');
          const item = (tickers && (tickers[pairKey] || tickers[slashKey])) || {
            symbol: slashKey,
            price: 0,
            change24h: 0
          };
          const isPositive = item.change24h > 0;
          const isNegative = item.change24h < 0;
          const changeClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';
          const sign = isPositive ? '+' : '';

          return (
            <div key={pairKey} className="ticker-item">
              <span className="pair">{item.symbol || pairKey}</span>
              <span className="price">${item.price ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
              <span className={`change ${changeClass}`}>
                {sign}{item.change24h ? item.change24h.toFixed(2) : '0.00'}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Connection & Controls */}
      <div className="header-actions">
        <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
          <span className="dot"></span>
          <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div className="master-toggle">
          <button
            className={`btn ${botStatus === 'RUNNING' ? 'btn-stop' : 'btn-start'}`}
            onClick={onToggleMasterBot}
          >
            <i className={`fa-solid ${botStatus === 'RUNNING' ? 'fa-square' : 'fa-play'}`}></i>
            {botStatus === 'RUNNING' ? 'STOP BOT' : 'START BOT'}
          </button>

          <button
            className="btn btn-danger"
            onClick={onEmergencyStop}
            title="Emergency Panic Kill-Switch: Instantly Close All Positions & Stop Bot"
          >
            <i className="fa-solid fa-triangle-exclamation"></i> EMERGENCY STOP
          </button>
        </div>
      </div>
    </header>
  );
}
