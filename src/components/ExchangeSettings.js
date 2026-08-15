'use client';

import { useState } from 'react';

export default function ExchangeSettings({
  executionMode,
  onToggleMode,
  exchangeConfig,
  onSaveExchangeConfig,
  onResetWallet,
  onExecuteManualTrade
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(exchangeConfig?.isTestnet ?? true);
  const [exchange, setExchange] = useState(exchangeConfig?.exchange || 'BINANCE');
  const [marketType, setMarketType] = useState(exchangeConfig?.marketType || 'SPOT');
  const [statusMsg, setStatusMsg] = useState(exchangeConfig?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Trade Form State
  const [tradeSymbol, setTradeSymbol] = useState('BTCUSDT');
  const [tradeAmountUSD, setTradeAmountUSD] = useState(100);
  const [tradeStatus, setTradeStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await onSaveExchangeConfig({ exchange, marketType, apiKey, apiSecret, isTestnet });
      if (res && res.message) {
        setStatusMsg(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualTrade = async (side) => {
    setTradeStatus(`Dispatching ${side} order...`);
    try {
      if (onExecuteManualTrade) {
        const res = await onExecuteManualTrade({ symbol: tradeSymbol, side, amountUSD: Number(tradeAmountUSD) });
        if (res && res.message) {
          setTradeStatus(`Success: ${res.message}`);
        } else {
          setTradeStatus(`Executed ${side} order for $${tradeAmountUSD} USD on ${tradeSymbol}`);
        }
      } else {
        const res = await fetch('/api/trade/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: tradeSymbol, side, amountUSD: Number(tradeAmountUSD) })
        });
        const json = await res.json();
        if (json.success) {
          setTradeStatus(`Success: ${json.message}`);
        } else {
          setTradeStatus(`Error: ${json.error}`);
        }
      }
    } catch (err) {
      setTradeStatus(`Execution Error: ${err.message}`);
    }
  };

  return (
    <div className="exchange-config-grid">
      {/* Execution Mode Selector */}
      <div className="panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-toggle-on"></i> Bot Execution Mode</h3>
        </div>

        <div className="mode-selector-card">
          <div
            className={`mode-option ${executionMode === 'PAPER' ? 'active-paper' : ''}`}
            onClick={() => onToggleMode('PAPER')}
          >
            <div className="mode-icon"><i className="fa-solid fa-shield-cat"></i></div>
            <div className="mode-info">
              <h4>Paper Trading Simulation</h4>
              <p>Risk-free paper trading with $10,000 USD virtual simulated funds and real-time Binance feeds.</p>
            </div>
            <div className="radio-indicator">
              <i className={`fa-solid ${executionMode === 'PAPER' ? 'fa-circle-dot' : 'fa-circle'}`}></i>
            </div>
          </div>

          <div
            className={`mode-option ${executionMode === 'LIVE' ? 'active-live' : ''}`}
            onClick={() => onToggleMode('LIVE')}
          >
            <div className="mode-icon live-icon"><i className="fa-solid fa-bolt"></i></div>
            <div className="mode-info">
              <h4>Live Binance Exchange API Trading</h4>
              <p>Executes automated and manual orders directly on your connected Binance account using API Keys.</p>
            </div>
            <div className="radio-indicator">
              <i className={`fa-solid ${executionMode === 'LIVE' ? 'fa-circle-dot' : 'fa-circle'}`}></i>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Virtual Wallet Balance: <strong>$10,000.00 USD</strong></span>
          <button className="btn btn-outline" onClick={onResetWallet}>
            <i className="fa-solid fa-rotate-left"></i> Reset Paper Balance
          </button>
        </div>
      </div>

      {/* Exchange API Key Setup */}
      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><i className="fa-solid fa-key"></i> Connect Binance API</h3>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: exchangeConfig?.isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: exchangeConfig?.isConnected ? '#10b981' : '#f87171',
            fontWeight: '600'
          }}>
            {exchangeConfig?.isConnected ? '● CONNECTED' : '○ DISCONNECTED'}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label>Exchange Platform</label>
              <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                <option value="BINANCE">Binance Spot / Futures</option>
                <option value="BYBIT">Bybit (CCXT)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Market Type</label>
              <select value={marketType} onChange={(e) => setMarketType(e.target.value)}>
                <option value="SPOT">Spot Market</option>
                <option value="FUTURES">USD-M Futures</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Binance API Key</label>
            <input
              type="text"
              placeholder="Paste Binance API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Binance API Secret Key</label>
            <input
              type="password"
              placeholder="Paste Binance API Secret..."
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="chkTestnet"
              checked={isTestnet}
              onChange={(e) => setIsTestnet(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="chkTestnet" style={{ cursor: 'pointer', margin: 0 }}>
              Use Binance Testnet Environment ({marketType === 'FUTURES' ? 'testnet.binancefuture.com' : 'testnet.binance.vision'})
            </label>
          </div>

          {statusMsg && (
            <div style={{
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: exchangeConfig?.isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)',
              color: exchangeConfig?.isConnected ? '#10b981' : '#38bdf8',
              marginBottom: '12px'
            }}>
              {statusMsg}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-accent" disabled={isSubmitting}>
              <i className="fa-solid fa-plug"></i> {isSubmitting ? 'Testing Connection...' : 'Connect & Verify API Key'}
            </button>
          </div>
        </form>
      </div>

      {/* Manual Instant Order Execution Panel */}
      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-header">
          <h3><i className="fa-solid fa-bolt-lightning"></i> Instant Manual Order Execution ({executionMode} Mode)</h3>
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
          Execute an immediate market order directly on Binance ({executionMode === 'LIVE' ? 'LIVE Exchange API' : 'Paper Simulation'}).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
          <div className="form-group">
            <label>Trading Pair</label>
            <select value={tradeSymbol} onChange={(e) => setTradeSymbol(e.target.value)}>
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
            </select>
          </div>

          <div className="form-group">
            <label>Order Amount (USD)</label>
            <input
              type="number"
              min="10"
              step="10"
              value={tradeAmountUSD}
              onChange={(e) => setTradeAmountUSD(e.target.value)}
            />
          </div>

          <button className="btn" style={{ background: '#10b981', color: '#fff' }} onClick={() => handleManualTrade('BUY')}>
            <i className="fa-solid fa-arrow-trend-up"></i> Execute Instant BUY Order
          </button>

          <button className="btn" style={{ background: '#f43f5e', color: '#fff' }} onClick={() => handleManualTrade('SELL')}>
            <i className="fa-solid fa-arrow-trend-down"></i> Execute Instant SELL Order
          </button>
        </div>

        {tradeStatus && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: tradeStatus.includes('Error') ? '#f87171' : '#38bdf8' }}>
            {tradeStatus}
          </div>
        )}
      </div>
    </div>
  );
}
