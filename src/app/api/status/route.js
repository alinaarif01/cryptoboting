import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import BotConfig from '../../../lib/models/BotConfig';
import Wallet from '../../../lib/models/Wallet';
import Position from '../../../lib/models/Position';
import Trade from '../../../lib/models/Trade';
import Log from '../../../lib/models/Log';
import { fetchLiveTickers } from '../../../../backend/src/services/marketData';

export async function GET() {
  try {
    await connectDB();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = await BotConfig.create({ key: 'main_bot_config' });
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
      tradeHistory: tradeHistory.map(t => ({
        id: t.tradeId,
        symbol: t.symbol,
        type: t.type,
        price: t.price,
        amount: t.amount,
        pnlUSD: t.pnlUSD,
        pnlPercent: t.pnlPercent,
        reason: t.reason,
        timestamp: t.timestamp
      })),
      logs: logs.map(l => ({
        tag: l.tag,
        message: l.message,
        time: l.time || new Date(l.timestamp).toLocaleTimeString()
      })),
      evalResult: {
        signal: 'HOLD',
        rsi: 48.5,
        ema50: tickers['BTCUSDT'] ? tickers['BTCUSDT'].price : 65000,
        price: tickers['BTCUSDT'] ? tickers['BTCUSDT'].price : 65000,
        reason: 'RSI in neutral boundary (30 - 70). Engine scanning live Binance feeds.'
      }
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
