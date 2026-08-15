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
  const [botState, setBotState] = useState({
    status: 'STOPPED',
    activeStrategy: 'RSI',
    executionMode: 'PAPER',
    paperWallet: { totalEquity: 10000, balanceUSD: 10000, totalPnL: 0, totalPnLPercent: 0, positions: [] },
    positions: [],
    tradeHistory: [],
    logs: [],
    evalResult: null,
    config: {},
    exchangeConfig: { exchange: 'BINANCE', isTestnet: true, isConnected: false }
  });
  const [isConnected, setIsConnected] = useState(true);

  // Fetch Bot Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const json = await res.json();
      if (json.success && json.data) {
        setBotState(json.data);
        setIsConnected(true);
      }
    } catch {
      setIsConnected(false);
    }
  }, []);

  // Fetch Live Tickers with direct Binance fallback for 100% navbar price rendering
  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch('/api/tickers');
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

  // Fetch Candlestick OHLCV Data with direct Binance fallback for instant chart rendering
  const fetchKlines = useCallback(async (symbol, tf) => {
    const formattedSymbol = symbol.replace('/', '').toUpperCase();
    try {
      const res = await fetch(`/api/klines?symbol=${formattedSymbol}&interval=${tf}&limit=100`);
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

  // Initial Data & Periodic Polling
  useEffect(() => {
    fetchStatus();
    fetchTickers();
    fetchKlines(currentPair, timeframe);

    const interval = setInterval(() => {
      fetchStatus();
      fetchTickers();
      fetchKlines(currentPair, timeframe);
    }, 3000);

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
    const options = isRunning ? {} : { symbol: currentPair, strategy: botState.activeStrategy, config: botState.config };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: isRunning ? undefined : JSON.stringify(options)
    });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
    }
  };

  const handleEmergencyStop = async () => {
    const res = await fetch('/api/bot/emergency-stop', { method: 'POST' });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
      alert(json.message);
    }
  };

  const handleClosePosition = async (positionId) => {
    const res = await fetch('/api/bot/close-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId })
    });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
    }
  };

  const handleSelectStrategy = async (strategyName) => {
    const res = await fetch('/api/bot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: currentPair, strategy: strategyName, config: botState.config })
    });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
    }
  };

  const handleSaveConfig = async (configParams) => {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configParams)
    });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
      alert('Strategy parameters updated successfully!');
    }
  };

  const handleToggleMode = async (mode) => {
    const res = await fetch('/api/exchange/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
    } else if (json.error) {
      alert(json.error);
    }
  };

  const handleSaveExchangeConfig = async (exchangeData) => {
    const res = await fetch('/api/exchange/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exchangeData)
    });
    const json = await res.json();
    if (json.botState) {
      setBotState(json.botState);
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
    if (json.data) {
      setBotState(json.data);
    }
    return json;
  };

  const handleResetWallet = async () => {
    const res = await fetch('/api/wallet/reset', { method: 'POST' });
    const json = await res.json();
    if (json.success && json.data) {
      setBotState(json.data);
      alert('Paper wallet balance reset to $10,000 USD');
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
      <Header
        tickers={tickers}
        botStatus={botState.status}
        isConnected={isConnected}
        onToggleMasterBot={handleToggleMasterBot}
        onEmergencyStop={handleEmergencyStop}
      />

      <MetricsBar
        paperWallet={botState.paperWallet}
        activeStrategy={botState.activeStrategy}
        openPositionsCount={botState.positions?.length || 0}
        botStatus={botState.status}
        onToggleMasterBot={handleToggleMasterBot}
        onEmergencyStop={handleEmergencyStop}
      />

      <nav className="main-tabs">
        {[
          { id: 'tab-chart', label: 'Live Charts & Market', icon: 'fa-chart-candlestick' },
          { id: 'tab-strategy', label: 'Strategy Configuration', icon: 'fa-sliders' },
          { id: 'tab-exchange', label: 'Exchange & Live Trading', icon: 'fa-key' },
          { id: 'tab-backtest', label: 'Backtesting Engine', icon: 'fa-vial-circle-check' },
          { id: 'tab-trades', label: 'Positions & Trade Audit', icon: 'fa-receipt' },
          { id: 'tab-logs', label: 'Bot Logs', icon: 'fa-terminal' },
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
