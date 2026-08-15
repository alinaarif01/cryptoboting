const { fetchKlines, getTickerCache } = require('../services/marketData');
const { evaluateRSIStrategy } = require('./strategies/rsiStrategy');
const { evaluateGridStrategy } = require('./strategies/gridStrategy');
const { evaluateDCAStrategy } = require('./strategies/dcaStrategy');
const exchangeService = require('../services/exchangeService');

class BotManager {
  constructor() {
    this.status = 'STOPPED'; // 'RUNNING' or 'STOPPED'
    this.symbol = 'BTCUSDT';
    this.pairLabel = 'BTC/USDT';
    this.activeStrategy = 'RSI';
    this.executionMode = 'PAPER'; // 'PAPER' or 'LIVE'
    this.exchangeConfig = {
      exchange: 'BINANCE',
      isTestnet: true,
      isConnected: false
    };

    // Strategy Parameters
    this.config = {
      rsiOversold: 30,
      rsiOverbought: 70,
      rsiPeriod: 14,
      gridLower: 60000,
      gridUpper: 70000,
      gridLevels: 5,
      stopLossPercent: 3.0,
      takeProfitPercent: 6.0,
      tradeAllocationUSD: 1000,
      dailyMaxLossUSD: 500.00,
      dailyMaxTrades: 20
    };

    this.supportedSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    this.tradesToday = 0;
    this.todayPnLUSD = 0;

    // Paper Wallet & State
    this.paperWallet = {
      balanceUSD: 10000.00,
      initialDepositUSD: 10000.00,
      positions: [] // Array of active open position objects
    };

    this.tradeHistory = [];
    this.logs = [];

    this.timer = null;
    this.wsBroadcastCallback = null;

    this.log('SYSTEM', 'Crypto Trading Bot Engine initialized in Automated Trading mode');
    this.initExchangeConnection();
    
    // Auto-start trading loop automatically
    this.startBot(this.symbol, this.activeStrategy);
  }

  async initExchangeConnection() {
    if (exchangeService.apiKey && exchangeService.apiSecret) {
      const res = await exchangeService.testConnection();
      this.exchangeConfig = {
        exchange: exchangeService.exchange,
        marketType: exchangeService.marketType,
        isTestnet: exchangeService.isTestnet,
        isConnected: res.success,
        message: res.message
      };
      if (res.success) {
        this.executionMode = 'LIVE'; // Automatically activate LIVE execution mode
        this.log('EXCHANGE', `Binance API Connected & LIVE Auto-Trading Activated (${exchangeService.marketType} Market)!`);
      } else {
        this.log('EXCHANGE_WARN', `Binance API Auto-connection note: ${res.message}`);
      }
    }
  }

  setBroadcastCallback(cb) {
    this.wsBroadcastCallback = cb;
  }

  log(category, message) {
    const logItem = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString(),
      category,
      message
    };
    this.logs.unshift(logItem);
    if (this.logs.length > 200) this.logs.pop();

    if (this.wsBroadcastCallback) {
      this.wsBroadcastCallback({ type: 'LOG', data: logItem });
    }
  }

  startBot(newSymbol, newStrategy, newConfig) {
    if (newSymbol) {
      this.symbol = newSymbol.replace('/', '').toUpperCase();
      this.pairLabel = newSymbol.includes('/') ? newSymbol : `${this.symbol.replace('USDT', '')}/USDT`;
    }
    if (newStrategy) this.activeStrategy = newStrategy;
    if (newConfig) this.config = { ...this.config, ...newConfig };

    this.status = 'RUNNING';
    this.log('BOT_CONTROL', `Bot STARTED for Multi-Pair Engine (${this.supportedSymbols.join(', ')}) using ${this.activeStrategy} Strategy`);

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 4000); // Strategy evaluation every 4s
    this.tick(); // Run immediately
  }

  stopBot() {
    this.status = 'STOPPED';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.log('BOT_CONTROL', `Bot STOPPED by User`);
  }

  async emergencyStop() {
    this.status = 'STOPPED';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.log('EMERGENCY', `🚨 EMERGENCY PANIC KILL-SWITCH ACTIVATED! Closing all open positions...`);

    const openPositions = [...this.paperWallet.positions];
    for (const pos of openPositions) {
      const tickers = getTickerCache();
      const rawSym = pos.symbol.replace('/', '').toUpperCase();
      const currentPrice = tickers[rawSym] ? tickers[rawSym].price : pos.entryPrice;
      await this.closePosition(pos, currentPrice, 'EMERGENCY_PANIC_SELL');
    }

    this.paperWallet.positions = [];
    this.log('EMERGENCY', `🚨 All open positions closed! Bot execution terminated.`);
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('CONFIG', 'Strategy & Risk Management parameters updated');
  }

  async tick() {
    if (this.status !== 'RUNNING') return;

    // Daily Risk Limits Guard
    if (this.todayPnLUSD <= -this.config.dailyMaxLossUSD) {
      this.log('RISK_GUARD', `🚨 Daily Maximum Loss Limit Hit ($${this.todayPnLUSD.toFixed(2)} <= -$${this.config.dailyMaxLossUSD}). Pausing bot trading today.`);
      this.stopBot();
      return;
    }

    if (this.tradesToday >= this.config.dailyMaxTrades) {
      this.log('RISK_GUARD', `🚨 Daily Trade Count Limit Reached (${this.tradesToday} trades). Pausing bot trading today.`);
      this.stopBot();
      return;
    }

    try {
      // Concurrent multi-pair market evaluation
      for (const targetSymbol of this.supportedSymbols) {
        const candles = await fetchKlines(targetSymbol, '15m', 50);
        if (!candles || candles.length === 0) continue;

        const currentPrice = candles[candles.length - 1].close;
        const pairLabel = `${targetSymbol.replace('USDT', '')}/USDT`;

        // 1. Evaluate open positions for this symbol
        this.checkRiskManagement(currentPrice, pairLabel);

        // 2. Evaluate Strategy Signal
        let evalResult = null;
        if (this.activeStrategy === 'RSI') {
          evalResult = evaluateRSIStrategy(candles, this.config);
        } else if (this.activeStrategy === 'GRID') {
          evalResult = evaluateGridStrategy(currentPrice, this.config);
        } else if (this.activeStrategy === 'DCA') {
          const lastBuy = this.paperWallet.positions.length > 0 ? this.paperWallet.positions[0].entryPrice : null;
          evalResult = evaluateDCAStrategy(currentPrice, lastBuy, this.config);
        }

        if (evalResult) {
          if (evalResult.signal === 'BUY') {
            await this.executeBuy(currentPrice, evalResult.reason, targetSymbol, pairLabel);
          } else if (evalResult.signal === 'SELL') {
            await this.executeSell(currentPrice, evalResult.reason, targetSymbol, pairLabel);
          }
        }

        // Broadcast update to frontend via WebSocket
        if (this.wsBroadcastCallback) {
          this.wsBroadcastCallback({
            type: 'TICK',
            data: {
              symbol: pairLabel,
              price: currentPrice,
              status: this.status,
              activeStrategy: this.activeStrategy,
              evalResult,
              paperWallet: this.getWalletSummary(currentPrice),
              positions: this.paperWallet.positions,
              openPositionsCount: this.paperWallet.positions.length
            }
          });
        }
      }
    } catch (err) {
      this.log('ERROR', `Tick error: ${err.message}`);
    }
  }

  checkRiskManagement(currentPrice) {
    const remainingPositions = [];

    for (const pos of this.paperWallet.positions) {
      const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

      if (pnlPercent <= -this.config.stopLossPercent) {
        this.log('RISK_EXECUTION', `STOP-LOSS Triggered at $${currentPrice} (${pnlPercent.toFixed(2)}%)`);
        this.closePosition(pos, currentPrice, 'STOP_LOSS');
      } else if (pnlPercent >= this.config.takeProfitPercent) {
        this.log('RISK_EXECUTION', `TAKE-PROFIT Triggered at $${currentPrice} (+${pnlPercent.toFixed(2)}%)`);
        this.closePosition(pos, currentPrice, 'TAKE_PROFIT');
      } else {
        remainingPositions.push(pos);
      }
    }

    this.paperWallet.positions = remainingPositions;
  }

  async executeBuy(currentPrice, reason) {
    const allocation = this.config.tradeAllocationUSD;
    if (this.paperWallet.balanceUSD < allocation && this.executionMode === 'PAPER') {
      this.log('ORDER_SKIP', `Insufficient USD balance ($${this.paperWallet.balanceUSD.toFixed(2)}) for buy order of $${allocation}`);
      return;
    }

    // Limit maximum open positions to 3 for safety
    if (this.paperWallet.positions.length >= 3) {
      return;
    }

    const feeUSD = allocation * 0.001; // 0.1% fee
    const netUSD = allocation - feeUSD;
    const amountCrypto = netUSD / currentPrice;

    if (this.executionMode === 'LIVE') {
      try {
        this.log('EXCHANGE', `Dispatching LIVE MARKET BUY Order to ${this.exchangeConfig.exchange} for ${amountCrypto.toFixed(5)} ${this.symbol}...`);
        const liveOrder = await exchangeService.placeSpotOrder({
          symbol: this.symbol,
          side: 'BUY',
          type: 'MARKET',
          quantity: amountCrypto
        });
        this.log('EXCHANGE', `LIVE BUY ORDER EXECUTED! Order ID: ${liveOrder.orderId} | Status: ${liveOrder.status}`);
      } catch (err) {
        this.log('EXCHANGE_ERROR', `LIVE BUY FAILED: ${err.message}`);
        return;
      }
    }

    this.paperWallet.balanceUSD -= allocation;

    const position = {
      id: `POS-${Date.now()}`,
      symbol: this.pairLabel,
      entryPrice: currentPrice,
      amount: amountCrypto,
      costUSD: allocation,
      feeUSD,
      openTime: new Date().toISOString(),
      reason,
      mode: this.executionMode
    };

    this.paperWallet.positions.push(position);

    const tradeRecord = {
      id: `TR-${Date.now()}`,
      type: 'BUY',
      symbol: this.pairLabel,
      price: currentPrice,
      amount: amountCrypto,
      totalUSD: allocation,
      feeUSD,
      time: new Date().toLocaleTimeString(),
      reason,
      mode: this.executionMode
    };

    this.tradeHistory.unshift(tradeRecord);
    if (this.tradeHistory.length > 100) this.tradeHistory.pop();
    this.log('TRADE', `[${this.executionMode}] BUY Executed: ${amountCrypto.toFixed(6)} ${this.pairLabel.split('/')[0]} @ $${currentPrice.toFixed(2)} | ${reason}`);
  }

  executeSell(currentPrice, reason) {
    if (this.paperWallet.positions.length === 0) return;

    // Sell the first open position
    const pos = this.paperWallet.positions.shift();
    this.closePosition(pos, currentPrice, reason);
  }

  async closePosition(pos, currentPrice, reason) {
    if (this.executionMode === 'LIVE') {
      try {
        this.log('EXCHANGE', `Dispatching LIVE MARKET SELL Order to ${this.exchangeConfig.exchange} for ${pos.amount.toFixed(5)} ${this.symbol}...`);
        const liveOrder = await exchangeService.placeSpotOrder({
          symbol: this.symbol,
          side: 'SELL',
          type: 'MARKET',
          quantity: pos.amount
        });
        this.log('EXCHANGE', `LIVE SELL ORDER EXECUTED! Order ID: ${liveOrder.orderId} | Status: ${liveOrder.status}`);
      } catch (err) {
        this.log('EXCHANGE_ERROR', `LIVE SELL FAILED: ${err.message}`);
      }
    }

    const grossReturn = pos.amount * currentPrice;
    const feeUSD = grossReturn * 0.001;
    const netReturn = grossReturn - feeUSD;

    const pnlUSD = netReturn - pos.costUSD;
    const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

    this.paperWallet.balanceUSD += netReturn;

    const tradeRecord = {
      id: `TR-${Date.now()}`,
      type: 'SELL',
      symbol: pos.symbol,
      entryPrice: pos.entryPrice,
      exitPrice: currentPrice,
      amount: pos.amount,
      totalUSD: netReturn,
      feeUSD,
      pnlUSD: parseFloat(pnlUSD.toFixed(2)),
      pnlPercent: parseFloat(pnlPercent.toFixed(2)),
      time: new Date().toLocaleTimeString(),
      reason,
      mode: this.executionMode
    };

    this.tradeHistory.unshift(tradeRecord);
    if (this.tradeHistory.length > 100) this.tradeHistory.pop();
    this.log('TRADE', `[${this.executionMode}] SELL Executed: ${pos.amount.toFixed(6)} ${pos.symbol.split('/')[0]} @ $${currentPrice.toFixed(2)} | PnL: $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%) | ${reason}`);
  }

  getWalletSummary(currentPrice = 0) {
    let positionValueUSD = 0;

    this.paperWallet.positions.forEach(pos => {
      positionValueUSD += pos.amount * (currentPrice || pos.entryPrice);
    });

    const totalEquity = this.paperWallet.balanceUSD + positionValueUSD;
    const totalPnL = totalEquity - this.paperWallet.initialDepositUSD;
    const totalPnLPercent = (totalPnL / this.paperWallet.initialDepositUSD) * 100;

    return {
      balanceUSD: parseFloat(this.paperWallet.balanceUSD.toFixed(2)),
      positionValueUSD: parseFloat(positionValueUSD.toFixed(2)),
      totalEquity: parseFloat(totalEquity.toFixed(2)),
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      totalPnLPercent: parseFloat(totalPnLPercent.toFixed(2)),
      initialDepositUSD: this.paperWallet.initialDepositUSD
    };
  }

  getState() {
    const tickers = getTickerCache();
    const currentPrice = tickers[this.symbol] ? tickers[this.symbol].price : 65000;

    return {
      status: this.status,
      symbol: this.symbol,
      pairLabel: this.pairLabel,
      activeStrategy: this.activeStrategy,
      executionMode: this.executionMode,
      exchangeConfig: this.exchangeConfig,
      config: this.config,
      paperWallet: this.getWalletSummary(currentPrice),
      positions: this.paperWallet.positions,
      tradeHistory: this.tradeHistory.slice(0, 50),
      logs: this.logs.slice(0, 50)
    };
  }
}

const botInstance = new BotManager();
module.exports = botInstance;
