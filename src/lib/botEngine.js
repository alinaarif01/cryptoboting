import { dbStore } from './store';
import { fetchKlines, fetchLiveTickers } from './services/marketData';
import exchangeService from './services/exchangeService';
import { evaluateAlpha85Strategy, evaluateRSIStrategy, evaluateGridStrategy, evaluateDCAStrategy } from './strategies';

let botTimer = null;
let isEvaluating = false;

export function getBotEngine() {
  return {
    isRunning: () => dbStore.getBotConfig().status === 'RUNNING',
    start: (symbol = 'BTCUSDT', strategy = 'AI_ALPHA_85', customConfig = {}) => {
      dbStore.updateBotConfig(cfg => ({
        ...cfg,
        status: 'RUNNING',
        symbol,
        activeStrategy: strategy,
        config: { ...cfg.config, ...customConfig }
      }));
      dbStore.addLog('SYSTEM', `Trading Bot Started: Auto-Trading Active on ${symbol} using [${strategy}] Strategy`);
      startBotLoop();
      return dbStore.getBotConfig();
    },
    stop: () => {
      dbStore.updateBotConfig(cfg => ({ ...cfg, status: 'STOPPED' }));
      dbStore.addLog('SYSTEM', 'Trading Bot Stopped by user');
      stopBotLoop();
      return dbStore.getBotConfig();
    },
    tick: evaluateCycle
  };
}

function startBotLoop() {
  if (botTimer) clearInterval(botTimer);
  evaluateCycle();
  botTimer = setInterval(evaluateCycle, 4000);
}

function stopBotLoop() {
  if (botTimer) {
    clearInterval(botTimer);
    botTimer = null;
  }
}

export async function evaluateCycle() {
  if (isEvaluating) return;
  isEvaluating = true;

  try {
    const botConfig = dbStore.getBotConfig();
    if (botConfig.status !== 'RUNNING') {
      stopBotLoop();
      isEvaluating = false;
      return;
    }

    const symbol = botConfig.symbol || 'BTCUSDT';
    const rawSym = symbol.replace('/', '').toUpperCase();
    const strategy = botConfig.activeStrategy || 'AI_ALPHA_85';
    const config = botConfig.config || {};

    const candles = await fetchKlines(rawSym, '15m', 60);
    if (!candles || candles.length < 20) {
      isEvaluating = false;
      return;
    }

    const currentPrice = candles[candles.length - 1].close;

    // Check existing positions for Stop-Loss or Take-Profit
    const positions = dbStore.getPositions();
    const openPos = positions.find(p => p.symbol.replace('/', '') === rawSym);

    if (openPos) {
      const pnlPct = ((currentPrice - openPos.entryPrice) / openPos.entryPrice) * 100;
      const sl = openPos.stopLoss;
      const tp = openPos.takeProfit;

      let shouldClose = false;
      let closeReason = '';

      if (sl && currentPrice <= sl) {
        shouldClose = true;
        closeReason = `STOP_LOSS_TRIGGERED (${pnlPct.toFixed(2)}%)`;
      } else if (tp && currentPrice >= tp) {
        shouldClose = true;
        closeReason = `TAKE_PROFIT_TRIGGERED (+${pnlPct.toFixed(2)}%)`;
      }

      if (shouldClose) {
        const pnlUSD = (currentPrice - openPos.entryPrice) * openPos.amount;
        const returnUSD = openPos.costUSD + pnlUSD;

        dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD + returnUSD }));
        dbStore.removePosition(openPos.positionId || openPos.id);

        dbStore.addTrade({
          symbol: openPos.symbol,
          type: 'SELL',
          price: currentPrice,
          amount: openPos.amount,
          pnlUSD,
          pnlPercent: pnlPct,
          reason: closeReason,
          executionMode: botConfig.executionMode
        });

        dbStore.addLog('TRADE', `[AUTO] Closed position ${openPos.symbol} @ $${currentPrice.toFixed(2)} | PnL: $${pnlUSD.toFixed(2)} (${closeReason})`);
        isEvaluating = false;
        return;
      }
    }

    // Evaluate Strategy Signal
    let evalResult = null;
    if (strategy === 'AI_ALPHA_85') {
      evalResult = evaluateAlpha85Strategy(candles, config);
    } else if (strategy === 'GRID') {
      evalResult = evaluateGridStrategy(candles, config);
    } else if (strategy === 'DCA') {
      evalResult = evaluateDCAStrategy(candles, config);
    } else {
      evalResult = evaluateRSIStrategy(candles, config);
    }

    if (!evalResult) {
      isEvaluating = false;
      return;
    }

    const tradeAllocationUSD = Number(config.tradeAllocationUSD) || 1000;
    const wallet = dbStore.getWallet();

    // AUTO BUY
    if (evalResult.signal === 'BUY' && !openPos && wallet.balanceUSD >= tradeAllocationUSD) {
      const amountCrypto = tradeAllocationUSD / currentPrice;
      const stopLossPercent = Number(config.stopLossPercent) || 2.5;
      const takeProfitPercent = Number(config.takeProfitPercent) || 6.5;

      dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD - tradeAllocationUSD }));

      const posId = `POS_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      dbStore.addPosition({
        positionId: posId,
        id: posId,
        symbol: symbol.includes('/') ? symbol : `${symbol.slice(0, -4)}/${symbol.slice(-4)}`,
        side: 'BUY',
        entryPrice: currentPrice,
        amount: amountCrypto,
        costUSD: tradeAllocationUSD,
        stopLoss: currentPrice * (1 - stopLossPercent / 100),
        takeProfit: currentPrice * (1 + takeProfitPercent / 100),
        executionMode: botConfig.executionMode,
        timestamp: new Date().toISOString()
      });

      dbStore.addTrade({
        symbol: symbol.includes('/') ? symbol : `${symbol.slice(0, -4)}/${symbol.slice(-4)}`,
        type: 'BUY',
        price: currentPrice,
        amount: amountCrypto,
        pnlUSD: 0,
        pnlPercent: 0,
        reason: `AUTO_${strategy}_SIGNAL`,
        executionMode: botConfig.executionMode
      });

      dbStore.addLog('TRADE', `[AUTO ${botConfig.executionMode}] BUY Order Executed: ${amountCrypto.toFixed(4)} ${symbol} @ $${currentPrice.toFixed(2)} (${evalResult.reason})`);
    }
    // AUTO SELL
    else if (evalResult.signal === 'SELL' && openPos) {
      const pnlUSD = (currentPrice - openPos.entryPrice) * openPos.amount;
      const pnlPct = ((currentPrice - openPos.entryPrice) / openPos.entryPrice) * 100;
      const returnUSD = openPos.costUSD + pnlUSD;

      dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD + returnUSD }));
      dbStore.removePosition(openPos.positionId || openPos.id);

      dbStore.addTrade({
        symbol: openPos.symbol,
        type: 'SELL',
        price: currentPrice,
        amount: openPos.amount,
        pnlUSD,
        pnlPercent: pnlPct,
        reason: `AUTO_${strategy}_SELL_SIGNAL`,
        executionMode: botConfig.executionMode
      });

      dbStore.addLog('TRADE', `[AUTO ${botConfig.executionMode}] SELL Order Executed: ${openPos.amount.toFixed(4)} ${openPos.symbol} @ $${currentPrice.toFixed(2)} | PnL: $${pnlUSD.toFixed(2)}`);
    }
  } catch (err) {
    console.error('[BotEngine Cycle Error]:', err.message);
  } finally {
    isEvaluating = false;
  }
}
