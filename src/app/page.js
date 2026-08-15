'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import MetricsBar from '../components/MetricsBar';
import LiveChart from '../components/LiveChart';
import StrategyConfig from '../components/StrategyConfig';
import ExchangeSettings from '../components/ExchangeSettings';
import BacktestWorkbench from '../components/BacktestWorkbench';
import PositionsAudit from '../components/PositionsAudit';
import TerminalLogs from '../components/TerminalLogs';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('tab-chart');
  const [currentPair, setCurrentPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [tickers, setTickers] = useState({});
  const [klinesData, setKlinesData] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [botState, setBotState] = useState({
    status: 'STOPPED',
    activeStrategy: 'AI_ALPHA_85',
    executionMode: 'PAPER',
    paperWallet: { totalEquity: 10000, balanceUSD: 10000, initialDepositUSD: 10000, totalPnL: 0, totalPnLPercent: 0, positions: [] },
    positions: [],
    tradeHistory: [],
    logs: [],
    evalResult: null,
    config: {},
    exchangeConfig: { exchange: 'BINANCE', isTestnet: true, isConnected: false }
  });
  const [isConnected, setIsConnected] = useState(true);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Bot Status from Database
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data) {
        setBotState(json.data);
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Fetch Live Tickers with direct Binance fallback
  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch('/api/tickers', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data && Object.keys(json.data).length > 0) {
        setTickers(json.data);
        return;
      }
    } catch {
      // fallback
    }

    try {
      const symbolsParam = encodeURIComponent(JSON.stringify(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']));
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(item => {
          const entry = {
            symbol: item.symbol.replace('USDT', '/USDT'),
            rawSymbol: item.symbol,
            price: parseFloat(item.lastPrice),
            change24h: parseFloat(item.priceChangePercent),
            high24h: parseFloat(item.highPrice),
            low24h: parseFloat(item.lowPrice),
            volume: parseFloat(item.volume)
          };
          map[item.symbol] = entry;
          map[item.symbol.replace('USDT', '/USDT')] = entry;
        });
        setTickers(map);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Candlestick OHLCV Data with Binance fallback
  const fetchKlines = useCallback(async (symbol, tf) => {
    const formattedSymbol = symbol.replace('/', '').toUpperCase();
    try {
      const res = await fetch(`/api/klines?symbol=${formattedSymbol}&interval=${tf}&limit=100`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setKlinesData(json.data);
        return;
      }
    } catch {
      // fallback
    }

    try {
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=${tf}&limit=100`);
      const rawData = await res.json();
      if (Array.isArray(rawData)) {
        const parsed = rawData.map(c => ({
          timestamp: c[0],
          time: new Date(c[0]).toISOString(),
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[5])
        }));
        setKlinesData(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial Data & Periodic Polling (every 2.5s)
  useEffect(() => {
    fetchStatus();
    fetchTickers();
    fetchKlines(currentPair, timeframe);

    const interval = setInterval(() => {
      fetchStatus();
      fetchTickers();
      fetchKlines(currentPair, timeframe);
    }, 2500);

    return () => clearInterval(interval);
  }, [currentPair, timeframe, fetchStatus, fetchTickers, fetchKlines]);

  // Pair or Timeframe change
  const handlePairChange = (newPair) => {
    setCurrentPair(newPair);
    fetchKlines(newPair, timeframe);
  };

  const handleTimeframeChange = (newTf) => {
    setTimeframe(newTf);
    fetchKlines(currentPair, newTf);
  };

  // Bot Action Triggers
  const handleToggleMasterBot = async () => {
    const isRunning = botState.status === 'RUNNING';
    const endpoint = isRunning ? '/api/bot/stop' : '/api/bot/start';
    const options = isRunning
      ? {}
      : {
          symbol: currentPair,
          strategy: botState.activeStrategy || 'AI_ALPHA_85',
          config: botState.config
        };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: isRunning ? undefined : JSON.stringify(options)
    });
    const json = await res.json();

    if (json.success) {
      showToast(isRunning ? 'Trading Bot Stopped' : `Trading Bot Started (${botState.activeStrategy || 'AI_ALPHA_85'})`, isRunning ? 'warning' : 'success');
      await fetchStatus();
    } else {
      showToast(json.error || 'Failed to toggle bot state', 'error');
    }
  };

  const handleEmergencyStop = async () => {
    const res = await fetch('/api/bot/emergency-stop', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('EMERGENCY KILL-SWITCH: Closed all positions and halted bot!', 'error');
      await fetchStatus();
    }
  };

  const handleClosePosition = async (positionId) => {
    const res = await fetch('/api/bot/close-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      await fetchStatus();
    }
  };

  const handleSelectStrategy = async (strategyName) => {
    const res = await fetch('/api/bot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentPair, strategy: strategyName, config: botState.config })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Selected Algorithm Strategy: ${strategyName}`, 'info');
      await fetchStatus();
    }
  };

  const handleSaveConfig = async (configParams) => {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configParams)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Strategy & Risk parameters saved to Database!', 'success');
      await fetchStatus();
    }
  };

  const handleToggleMode = async (mode) => {
    const res = await fetch('/api/exchange/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Switched execution mode to ${mode}`, 'info');
      await fetchStatus();
    } else if (json.error) {
      showToast(json.error, 'error');
    }
  };

  const handleSaveExchangeConfig = async (exchangeData) => {
    const res = await fetch('/api/exchange/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exchangeData)
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message || 'Binance API Key Verified & Connected!', 'success');
      await fetchStatus();
    } else {
      showToast(json.error || json.message || 'Connection verification failed', 'error');
    }
    return json;
  };

  const handleExecuteManualTrade = async (payload) => {
    const res = await fetch('/api/trade/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      await fetchStatus();
    } else {
      showToast(json.error || 'Trade execution failed', 'error');
    }
    return json;
  };

  const handleResetWallet = async () => {
    const res = await fetch('/api/wallet/reset', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('Paper wallet balance reset to $10,000 USD', 'info');
      await fetchStatus();
    }
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      setIsConnected(false);
      showToast('Live Binance Feed Disconnected by user', 'warning');
    } else {
      showToast('Reconnecting to Binance Live API...', 'info');
      await fetchTickers();
      await fetchStatus();
      setIsConnected(true);
      showToast('Binance Live API Connected & Active!', 'success');
    }
  };

  const handleRunBacktest = async (payload) => {
    const res = await fetch('/api/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  };

  return (
    <>
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`toast-banner ${toastMessage.type}`}>
          <i className={`fa-solid ${toastMessage.type === 'success' ? 'fa-circle-check' : toastMessage.type === 'error' ? 'fa-circle-xmark' : 'fa-bell'}`}></i>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <Header
        tickers={tickers}
        botStatus={botState.status}
        isConnected={isConnected}
        onToggleMasterBot={handleToggleMasterBot}
        onEmergencyStop={handleEmergencyStop}
        onToggleConnection={handleToggleConnection}
      />

      <MetricsBar
        paperWallet={botState.paperWallet}
        activeStrategy={botState.activeStrategy}
        openPositionsCount={botState.positions?.length || 0}
        botStatus={botState.status}
      />

      <nav className="main-tabs">
        {[
          { id: 'tab-chart', label: 'Live Candlestick Chart', icon: 'fa-chart-candlestick' },
          { id: 'tab-strategy', label: 'Strategy Configuration', icon: 'fa-sliders' },
          { id: 'tab-exchange', label: 'Exchange & Live Trading', icon: 'fa-key' },
          { id: 'tab-backtest', label: '85% Accuracy Backtester', icon: 'fa-vial-circle-check' },
          { id: 'tab-trades', label: `Positions (${botState.positions?.length || 0}) & Audit`, icon: 'fa-receipt' },
          { id: 'tab-logs', label: 'Live Bot Logs', icon: 'fa-terminal' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </nav>

      <main className="content-area">
        {activeTab === 'tab-chart' && (
          <LiveChart
            klinesData={klinesData}
            currentPair={currentPair}
            onPairChange={handlePairChange}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            evalResult={botState.evalResult}
            executionMode={botState.executionMode}
            onExecuteTrade={handleExecuteManualTrade}
          />
        )}

        {activeTab === 'tab-strategy' && (
          <StrategyConfig
            activeStrategy={botState.activeStrategy}
            onSelectStrategy={handleSelectStrategy}
            configParams={botState.config}
            onSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'tab-exchange' && (
          <ExchangeSettings
            executionMode={botState.executionMode}
            onToggleMode={handleToggleMode}
            exchangeConfig={botState.exchangeConfig}
            onSaveExchangeConfig={handleSaveExchangeConfig}
            onResetWallet={handleResetWallet}
            onExecuteManualTrade={handleExecuteManualTrade}
          />
        )}

        {activeTab === 'tab-backtest' && (
          <BacktestWorkbench onRunBacktest={handleRunBacktest} />
        )}

        {activeTab === 'tab-trades' && (
          <PositionsAudit
            positions={botState.positions}
            tradeHistory={botState.tradeHistory}
            onClosePosition={handleClosePosition}
          />
        )}

        {activeTab === 'tab-logs' && (
          <TerminalLogs logs={botState.logs} />
        )}
      </main>
    </>
  );
}
