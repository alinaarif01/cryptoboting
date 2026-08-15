import { NextResponse } from 'next/server';
import { dbStore } from '../../../lib/store';
import { fetchLiveTickers, fetchKlines } from '../../../lib/services/marketData';
import { evaluateAlpha85Strategy, evaluateRSIStrategy, evaluateGridStrategy, evaluateDCAStrategy } from '../../../lib/strategies';
import { evaluateCycle } from '../../../lib/botEngine';

export async function GET() {
  try {
    const botConfig = dbStore.getBotConfig();
    const wallet = dbStore.getWallet();
    const positions = dbStore.getPositions();
    const tradeHistory = dbStore.getTrades(50);
    const logs = dbStore.getLogs(30);

    // If bot is running, execute a bot evaluation tick in background
    if (botConfig.status === 'RUNNING') {
      evaluateCycle().catch(() => {});
    }

    const tickers = await fetchLiveTickers();

    // Compute live unrealized PnL and total equity
    let openPositionsValueUSD = 0;
    const mappedPositions = positions.map(pos => {
      const rawSym = pos.symbol.replace('/', '').toUpperCase();
      const liveTicker = tickers[rawSym] || tickers[pos.symbol];
      const currentPrice = liveTicker ? liveTicker.price : pos.entryPrice;
      const currentVal = pos.amount * currentPrice;
      openPositionsValueUSD += currentVal;

      const unrealizedPnLUSD = (currentPrice - pos.entryPrice) * pos.amount;
      const unrealizedPnLPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

      return {
        id: pos.positionId || pos.id,
        positionId: pos.positionId || pos.id,
        symbol: pos.symbol,
        side: pos.side || 'BUY',
        entryPrice: pos.entryPrice,
        amount: pos.amount,
        costUSD: pos.costUSD,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        currentPrice,
        unrealizedPnLUSD: parseFloat(unrealizedPnLUSD.toFixed(2)),
        unrealizedPnLPercent: parseFloat(unrealizedPnLPercent.toFixed(2))
      };
    });

    const totalEquity = wallet.balanceUSD + openPositionsValueUSD;
    const totalPnL = totalEquity - wallet.initialDepositUSD;
    const totalPnLPercent = (totalPnL / wallet.initialDepositUSD) * 100;

    // Calculate real live technical indicators for active pair
    let evalResult = null;
    const activeSym = (botConfig.symbol || 'BTCUSDT').replace('/', '').toUpperCase();
    try {
      const candles = await fetchKlines(activeSym, '15m', 60);
      if (candles && candles.length > 0) {
        if (botConfig.activeStrategy === 'AI_ALPHA_85') {
          evalResult = evaluateAlpha85Strategy(candles, botConfig.config);
        } else if (botConfig.activeStrategy === 'GRID') {
          evalResult = evaluateGridStrategy(candles, botConfig.config);
        } else if (botConfig.activeStrategy === 'DCA') {
          evalResult = evaluateDCAStrategy(candles, botConfig.config);
        } else {
          evalResult = evaluateRSIStrategy(candles, botConfig.config);
        }
      }
    } catch {
      // fallback
    }

    if (!evalResult) {
      const curP = tickers[activeSym] ? tickers[activeSym].price : 65000;
      evalResult = {
        signal: 'HOLD',
        rsi: 50.0,
        ema20: curP,
        ema50: curP,
        price: curP,
        reason: 'Scanning live Binance ticker feeds.'
      };
    }

    const data = {
      status: botConfig.status,
      symbol: botConfig.symbol,
      pairLabel: botConfig.symbol.includes('/') ? botConfig.symbol : `${botConfig.symbol.replace('USDT', '')}/USDT`,
      activeStrategy: botConfig.activeStrategy,
      executionMode: botConfig.executionMode,
      config: botConfig.config,
      exchangeConfig: botConfig.exchangeConfig,
      paperWallet: {
        balanceUSD: parseFloat(wallet.balanceUSD.toFixed(2)),
        initialDepositUSD: parseFloat(wallet.initialDepositUSD.toFixed(2)),
        totalEquity: parseFloat(totalEquity.toFixed(2)),
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        totalPnLPercent: parseFloat(totalPnLPercent.toFixed(2)),
        positions: mappedPositions
      },
      positions: mappedPositions,
      tradeHistory,
      logs: logs.map(l => ({
        id: l.id,
        tag: l.tag,
        message: l.message,
        time: l.time || new Date(l.timestamp).toLocaleTimeString()
      })),
      evalResult
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Status Route Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
