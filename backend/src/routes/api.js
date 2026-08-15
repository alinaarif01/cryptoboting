const express = require('express');
const router = express.Router();
const botManager = require('../engine/botManager');
const exchangeService = require('../services/exchangeService');
const { fetchLiveTickers, fetchKlines } = require('../services/marketData');
const { runBacktest } = require('../engine/backtester');

// GET Bot State
router.get('/status', (req, res) => {
  res.json({ success: true, data: botManager.getState() });
});

// Start Bot
router.post('/bot/start', (req, res) => {
  const { symbol, strategy, config } = req.body;
  botManager.startBot(symbol, strategy, config);
  res.json({ success: true, message: 'Bot started successfully', data: botManager.getState() });
});

// Stop Bot
router.post('/bot/stop', (req, res) => {
  botManager.stopBot();
  res.json({ success: true, message: 'Bot stopped successfully', data: botManager.getState() });
});

// Emergency Kill-Switch (Panic Close All Positions)
router.post('/bot/emergency-stop', async (req, res) => {
  try {
    await botManager.emergencyStop();
    res.json({ success: true, message: '🚨 EMERGENCY KILL-SWITCH ACTIVATED! All positions closed.', data: botManager.getState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Close Single Specific Position
router.post('/bot/close-position', async (req, res) => {
  try {
    const { positionId } = req.body;
    const posIndex = botManager.paperWallet.positions.findIndex(p => p.id === positionId);
    if (posIndex === -1) {
      return res.status(404).json({ success: false, error: 'Position not found' });
    }

    const pos = botManager.paperWallet.positions.splice(posIndex, 1)[0];
    const tickers = await fetchLiveTickers();
    const rawSym = pos.symbol.replace('/', '').toUpperCase();
    const currentPrice = tickers[rawSym] ? tickers[rawSym].price : pos.entryPrice;

    await botManager.closePosition(pos, currentPrice, 'MANUAL_CLOSE');
    res.json({ success: true, message: `Position ${positionId} closed manually`, data: botManager.getState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Config
router.post('/bot/config', (req, res) => {
  botManager.updateConfig(req.body);
  res.json({ success: true, message: 'Bot configuration updated', data: botManager.getState() });
});

// Reset Paper Wallet
router.post('/wallet/reset', (req, res) => {
  botManager.paperWallet.balanceUSD = 10000.00;
  botManager.paperWallet.initialDepositUSD = 10000.00;
  botManager.paperWallet.positions = [];
  botManager.tradeHistory = [];
  botManager.log('WALLET', 'Paper trading wallet reset to $10,000 USD');
  res.json({ success: true, message: 'Wallet reset to $10,000 USD', data: botManager.getState() });
});

// POST Save Exchange API Config & Test Connection
router.post('/exchange/config', async (req, res) => {
  try {
    const { exchange = 'BINANCE', apiKey, apiSecret, isTestnet = true } = req.body;
    exchangeService.setCredentials({ exchange, apiKey, apiSecret, isTestnet });
    
    const testRes = await exchangeService.testConnection();
    botManager.exchangeConfig = {
      exchange,
      isTestnet,
      isConnected: testRes.success,
      message: testRes.message
    };

    botManager.log('EXCHANGE', testRes.message);
    res.json({ success: testRes.success, data: testRes, botState: botManager.getState() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Toggle Execution Mode (PAPER vs LIVE)
router.post('/exchange/mode', (req, res) => {
  const { mode } = req.body;
  if (!['PAPER', 'LIVE'].includes(mode)) {
    return res.status(400).json({ success: false, error: 'Invalid mode. Must be PAPER or LIVE.' });
  }

  if (mode === 'LIVE' && !botManager.exchangeConfig.isConnected) {
    return res.status(400).json({ 
      success: false, 
      error: 'Cannot switch to LIVE mode without a valid connected Exchange API Key.' 
    });
  }

  botManager.executionMode = mode;
  botManager.log('SYSTEM', `Bot Execution Mode switched to >>> ${mode} <<<`);
  res.json({ success: true, mode: botManager.executionMode, data: botManager.getState() });
});

// GET Fetch Real Exchange Balances
router.get('/exchange/balance', async (req, res) => {
  try {
    const balances = await exchangeService.getAccountBalances();
    res.json({ success: true, data: balances });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Live Tickers
router.get('/tickers', async (req, res) => {
  try {
    const tickers = await fetchLiveTickers();
    res.json({ success: true, data: tickers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Candlestick OHLCV Data
router.get('/klines', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'BTCUSDT';
    const interval = req.query.interval || '1h';
    const limit = parseInt(req.query.limit || '100', 10);
    const klines = await fetchKlines(symbol, interval, limit);
    res.json({ success: true, data: klines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Run Backtest
router.post('/backtest', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', interval = '1h', limit = 200, options = {} } = req.body;
    const candles = await fetchKlines(symbol, interval, limit);

    if (!candles || candles.length === 0) {
      return res.status(400).json({ success: false, error: 'Could not fetch candle data for backtest' });
    }

    const report = runBacktest(candles, options);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

