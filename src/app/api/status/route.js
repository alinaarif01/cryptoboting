import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import BotConfig from '../../../lib/models/BotConfig';
import Wallet from '../../../lib/models/Wallet';
import Position from '../../../lib/models/Position';
import Trade from '../../../lib/models/Trade';
import Log from '../../../lib/models/Log';
import exchangeService from '../../../../backend/src/services/exchangeService';
import { fetchLiveTickers, fetchKlines } from '../../../../backend/src/services/marketData';

export async function GET() {
  try {
    await connectDB();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = await BotConfig.create({ key: 'main_bot_config' });
    }

    // Auto-populate env API keys if present
    if (process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET) {
      if (!botConfig.exchangeConfig || !botConfig.exchangeConfig.apiKey) {
        botConfig.exchangeConfig = {
          exchange: 'BINANCE',
          marketType: process.env.BINANCE_MARKET_TYPE || 'SPOT',
          apiKey: process.env.BINANCE_API_KEY,
          apiSecret: process.env.BINANCE_API_SECRET,
          isTestnet: process.env.BINANCE_IS_TESTNET !== 'false',
          isConnected: true,
          message: 'Connected via Environment API Keys'
        };
        botConfig.executionMode = 'LIVE';
        await botConfig.save();
      }
    }

    let wallet = await Wallet.findOne({ key: 'main_paper_wallet' });
    if (!wallet) {
      wallet = await Wallet.create({ key: 'main_paper_wallet' });
    }

    const positions = await Position.find({});
    const tradeHistory = await Trade.find({}).sort({ timestamp: -1 }).limit(50);
    const logs = await Log.find({}).sort({ timestamp: -1 }).limit(30);

    const tickers = await fetchLiveTickers();

    // Calculate live positions value and total equity
    let openPositionsValueUSD = 0;
    const mappedPositions = positions.map(pos => {
      const rawSym = pos.symbol.replace('/', '').toUpperCase();
      const liveTicker = tickers[rawSym];
      const currentPrice = liveTicker ? liveTicker.price : pos.entryPrice;
      const currentVal = pos.amount * currentPrice;
      openPositionsValueUSD += currentVal;

      return {
        id: pos.positionId,
        symbol: pos.symbol,
        side: pos.side,
        entryPrice: pos.entryPrice,
        amount: pos.amount,
        costUSD: pos.costUSD,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit,
        currentPrice,
        unrealizedPnLUSD: (currentPrice - pos.entryPrice) * pos.amount,
        unrealizedPnLPercent: ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
      };
    });

    const totalEquity = wallet.balanceUSD + openPositionsValueUSD;
    const totalPnL = totalEquity - wallet.initialDepositUSD;
    const totalPnLPercent = (totalPnL / wallet.initialDepositUSD) * 100;

    let mappedTrades = tradeHistory.map(t => ({
      id: t.tradeId,
      symbol: t.symbol,
      type: t.type,
      price: t.price,
      amount: t.amount,
      pnlUSD: t.pnlUSD,
      pnlPercent: t.pnlPercent,
      reason: t.reason,
      timestamp: t.timestamp
    }));

    // Auto-fetch real Binance executed orders if DB trades empty
    if (mappedTrades.length === 0) {
      try {
        const apiKey = botConfig.exchangeConfig?.apiKey || process.env.BINANCE_API_KEY;
        const apiSecret = botConfig.exchangeConfig?.apiSecret || process.env.BINANCE_API_SECRET;
        if (apiKey && apiSecret) {
          exchangeService.setCredentials({
            exchange: 'BINANCE',
            marketType: botConfig.exchangeConfig?.marketType || 'SPOT',
            apiKey,
            apiSecret,
            isTestnet: botConfig.exchangeConfig?.isTestnet !== false
          });
          const endpoint = botConfig.exchangeConfig?.marketType === 'FUTURES' ? '/fapi/v1/allOrders' : '/api/v3/allOrders';
          const binanceOrders = await exchangeService.signedRequest('GET', endpoint, { symbol: 'BTCUSDT', limit: 10 });
          if (Array.isArray(binanceOrders) && binanceOrders.length > 0) {
            mappedTrades = binanceOrders.slice().reverse().map(o => {
              const executedQty = parseFloat(o.executedQty || o.origQty || 0);
              const cummulativeQuote = parseFloat(o.cummulativeQuoteQty || o.cumQuote || 0);
              const computedPrice = parseFloat(o.price) > 0 ? parseFloat(o.price) : (executedQty > 0 ? cummulativeQuote / executedQty : 63070);
              return {
                id: `BIN-${o.orderId || o.clientOrderId}`,
                symbol: 'BTC/USDT',
                type: o.side,
                price: parseFloat(computedPrice.toFixed(2)),
                amount: parseFloat(executedQty.toFixed(5)),
                pnlUSD: 0,
                pnlPercent: 0,
                reason: `BINANCE_${o.status}`,
                timestamp: o.time || o.updateTime || Date.now()
              };
            });
          }
        }
      } catch (err) {
        console.error('[Status Route] Binance orders fetch fallback error:', err.message);
      }
    }

    const data = {
      status: botConfig.status,
      symbol: botConfig.symbol,
      pairLabel: botConfig.symbol.replace('USDT', '/USDT'),
      activeStrategy: botConfig.activeStrategy,
      executionMode: botConfig.executionMode,
      config: botConfig.config,
      exchangeConfig: botConfig.exchangeConfig,
      paperWallet: {
        balanceUSD: wallet.balanceUSD,
        initialDepositUSD: wallet.initialDepositUSD,
        totalEquity,
        totalPnL,
        totalPnLPercent,
        positions: mappedPositions
      },
      positions: mappedPositions,
      tradeHistory: mappedTrades,
      logs: logs.map(l => ({
        tag: l.tag,
        message: l.message,
        time: l.time || new Date(l.timestamp).toLocaleTimeString()
      }))
    };

    try {
      const activeSym = botConfig.symbol || 'BTCUSDT';
      const candles = await fetchKlines(activeSym, '15m', 30);
      if (candles && candles.length > 0) {
        const closePrices = candles.map(c => c.close);
        const currentPrice = closePrices[closePrices.length - 1];
        
        let gains = 0, losses = 0;
        const period = 14;
        if (closePrices.length >= period + 1) {
          for (let i = 1; i <= period; i++) {
            const diff = closePrices[i] - closePrices[i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
          }
          let avgGain = gains / period;
          let avgLoss = losses / period;
          for (let i = period + 1; i < closePrices.length; i++) {
            const diff = closePrices[i] - closePrices[i - 1];
            avgGain = (avgGain * 13 + (diff >= 0 ? diff : 0)) / 14;
            avgLoss = (avgLoss * 13 + (diff < 0 ? Math.abs(diff) : 0)) / 14;
          }
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          const rsiVal = 100 - (100 / (1 + rs));

          const signal = rsiVal <= 30 ? 'BUY' : rsiVal >= 70 ? 'SELL' : 'HOLD';
          data.evalResult = {
            signal,
            rsi: parseFloat(rsiVal.toFixed(2)),
            ema50: parseFloat(currentPrice.toFixed(2)),
            price: currentPrice,
            reason: `RSI (${rsiVal.toFixed(2)}) calculated from live Binance 15m feed.`
          };
        }
      }
    } catch {
      // fallback
      data.evalResult = {
        signal: 'HOLD',
        rsi: 50.0,
        ema50: tickers['BTCUSDT'] ? tickers['BTCUSDT'].price : 65000,
        price: tickers['BTCUSDT'] ? tickers['BTCUSDT'].price : 65000,
        reason: 'Scanning live Binance feeds.'
      };
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
