'use client';

import { useState, useEffect, useRef } from 'react';

export default function Header({ tickers, botStatus, isConnected, onToggleMasterBot, onEmergencyStop, onToggleConnection }) {
  const [livePrices, setLivePrices] = useState({});
  const [priceDirections, setPriceDirections] = useState({});
  const [isToggling, setIsToggling] = useState(false);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const prevPricesRef = useRef({});

  // Sync props tickers into livePrices
  useEffect(() => {
    if (tickers && Object.keys(tickers).length > 0) {
      setLivePrices(prev => {
        const next = { ...prev };
        const dirs = { ...priceDirections };

        Object.keys(tickers).forEach(k => {
          const item = tickers[k];
          if (item && item.price) {
            const sym = item.rawSymbol || k.replace('/', '');
            const oldP = prevPricesRef.current[sym];
            if (oldP && oldP !== item.price) {
              dirs[sym] = item.price > oldP ? 'up' : 'down';
            }
            prevPricesRef.current[sym] = item.price;
            next[sym] = item;
          }
        });
        setPriceDirections(dirs);
        return next;
      });
    }
  }, [tickers]);

  // Connect live Binance multi-ticker WebSocket for instantaneous second-by-second live price ticks
  useEffect(() => {
    let ws = null;
    try {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      ws.onmessage = (event) => {
        try {
          const arr = JSON.parse(event.data);
          if (Array.isArray(arr)) {
            const targetSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
            const updates = {};
            const dirs = {};

            arr.forEach(item => {
              if (targetSymbols.includes(item.s)) {
                const currentPrice = parseFloat(item.c);
                const openPrice = parseFloat(item.o);
                const changePct = ((currentPrice - openPrice) / openPrice) * 100;
                const oldP = prevPricesRef.current[item.s];

                if (oldP && oldP !== currentPrice) {
                  dirs[item.s] = currentPrice > oldP ? 'up' : 'down';
                }
                prevPricesRef.current[item.s] = currentPrice;

                updates[item.s] = {
                  symbol: item.s.replace('USDT', '/USDT'),
                  rawSymbol: item.s,
                  price: currentPrice,
                  change24h: changePct,
                  high24h: parseFloat(item.h),
                  low24h: parseFloat(item.l),
                  volume: parseFloat(item.v)
                };
              }
            });

            if (Object.keys(updates).length > 0) {
              setLivePrices(prev => ({ ...prev, ...updates }));
              setPriceDirections(prev => ({ ...prev, ...dirs }));
            }
          }
        } catch {
          // ignore stream parse errors
        }
      };

      ws.onerror = () => {};
    } catch {
      // ignore
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleMasterBot();
    } finally {
      setIsToggling(false);
    }
  };

  const handlePanic = async () => {
    setIsEmergencyStopping(true);
    try {
      await onEmergencyStop();
    } finally {
      setIsEmergencyStopping(false);
    }
  };

  const displayPairs = [
    { key: 'BTCUSDT', label: 'BTC/USDT', icon: 'fa-brands fa-bitcoin', color: '#f7931a' },
    { key: 'ETHUSDT', label: 'ETH/USDT', icon: 'fa-brands fa-ethereum', color: '#627eea' },
    { key: 'SOLUSDT', label: 'SOL/USDT', icon: 'fa-solid fa-bolt', color: '#14f195' },
    { key: 'BNBUSDT', label: 'BNB/USDT', icon: 'fa-solid fa-coins', color: '#f3ba2f' }
  ];

  return (
    <header className="top-header">
      <div className="brand">
        <div className="logo-icon">
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <div className="brand-text">
          <h1>CYPHER<span>BOT</span></h1>
          <span className="version-tag">PRO v3.2 AI</span>
        </div>
      </div>

      {/* Ticker Tape (Original Pill Design - 100% Full Visibility) */}
      <div className="ticker-tape" id="tickerTape">
        {displayPairs.map((p) => {
          const item = livePrices[p.key] || (tickers && (tickers[p.key] || tickers[p.label])) || {
            symbol: p.label,
            price: 0,
            change24h: 0
          };
          const isPositive = item.change24h > 0;
          const isNegative = item.change24h < 0;
          const changeClass = isPositive ? 'positive' : isNegative ? 'negative' : 'neutral';
          const sign = isPositive ? '+' : '';

          return (
            <div key={p.key} className="ticker-item">
              <span className="pair">{p.label}</span>
              <span className="price">
                ${item.price ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: item.price < 10 ? 4 : 2 }) : '0.00'}
              </span>
              <span className={`change ${changeClass}`}>
                {sign}{item.change24h ? item.change24h.toFixed(2) : '0.00'}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Connection & Action Controls */}
      <div className="header-actions">
        <button
          className={`status-indicator ${isConnected ? 'online' : 'offline'} clickable`}
          onClick={onToggleConnection}
          title={isConnected ? 'Click to Disconnect Live Feed' : 'Click to Reconnect Binance Live Feed'}
          type="button"
        >
          <span className="dot"></span>
          <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </button>

        <div className="master-toggle">
          <button
            className={`btn ${botStatus === 'RUNNING' ? 'btn-stop' : 'btn-start'} ${isToggling ? 'btn-loading' : ''}`}
            onClick={handleToggle}
            disabled={isToggling}
            title={botStatus === 'RUNNING' ? 'Pause Automated Trading Loop' : 'Activate Real-Time Strategy Execution Engine'}
          >
            <i className={`fa-solid ${isToggling ? 'fa-spinner fa-spin' : botStatus === 'RUNNING' ? 'fa-square' : 'fa-play'}`}></i>
            {isToggling ? 'UPDATING...' : botStatus === 'RUNNING' ? 'STOP BOT' : 'START BOT'}
          </button>

          <button
            className={`btn btn-danger ${isEmergencyStopping ? 'btn-loading' : ''}`}
            onClick={handlePanic}
            disabled={isEmergencyStopping}
            title="Panic Kill-Switch: Instantly Closes All Open Positions & Stops Bot"
          >
            <i className={`fa-solid ${isEmergencyStopping ? 'fa-spinner fa-spin' : 'fa-triangle-exclamation'}`}></i>
            {isEmergencyStopping ? 'CLOSING...' : 'EMERGENCY STOP'}
          </button>
        </div>
      </div>
    </header>
  );
}
