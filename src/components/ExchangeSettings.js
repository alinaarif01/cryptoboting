'use client';

import { useState } from 'react';

export default function ExchangeSettings({
  executionMode,
  onToggleMode,
  exchangeConfig,
  onSaveExchangeConfig,
  onResetWallet
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(true);
  const [exchange, setExchange] = useState('BINANCE');
  const [statusMsg, setStatusMsg] = useState(exchangeConfig?.message || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await onSaveExchangeConfig({ exchange, apiKey, apiSecret, isTestnet });
    if (res && res.message) {
      setStatusMsg(res.message);
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
              <p>Risk-free paper trading with $10,000 USD virtual simulated funds and Binance real-time price feeds.</p>
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
              <h4>Live Exchange API Trading</h4>
              <p>Executes automated orders directly on your connected Binance account using secure API Keys.</p>
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
        <div className="panel-header">
          <h3><i className="fa-solid fa-key"></i> Connect Exchange API</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Select Crypto Exchange</label>
            <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
              <option value="BINANCE">Binance Spot / Futures</option>
              <option value="BYBIT">Bybit (CCXT Compatible)</option>
              <option value="COINBASE">Coinbase Advanced</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>API Key</label>
            <input
              type="text"
              placeholder="Paste Exchange API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>API Secret Key</label>
            <input
              type="password"
              placeholder="Paste Exchange API Secret..."
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
            <label htmlFor="chkTestnet" style={{ cursor: 'pointer', margin: 0 }}>Use Exchange Testnet Environment</label>
          </div>

          {statusMsg && (
            <div style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', marginBottom: '12px' }}>
              {statusMsg}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-accent">
              <i className="fa-solid fa-plug"></i> Connect & Test API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
