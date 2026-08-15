import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import BotConfig from '../../../../lib/models/BotConfig';
import Wallet from '../../../../lib/models/Wallet';
import Position from '../../../../lib/models/Position';
import Trade from '../../../../lib/models/Trade';
import Log from '../../../../lib/models/Log';
import { fetchLiveTickers } from '../../../../../backend/src/services/marketData';

export async function POST() {
  try {
    await connectDB();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (botConfig) {
      botConfig.status = 'STOPPED';
      await botConfig.save();
    }

    let wallet = await Wallet.findOne({ key: 'main_paper_wallet' });
    if (!wallet) {
      wallet = await Wallet.create({ key: 'main_paper_wallet' });
    }

    const positions = await Position.find({});
    const tickers = await fetchLiveTickers();

    for (const pos of positions) {
      const rawSym = pos.symbol.replace('/', '').toUpperCase();
      const liveTicker = tickers[rawSym];
      const closePrice = liveTicker ? liveTicker.price : pos.entryPrice;
      const pnlUSD = (closePrice - pos.entryPrice) * pos.amount;
      const pnlPercent = ((closePrice - pos.entryPrice) / pos.entryPrice) * 100;
      const returnUSD = pos.costUSD + pnlUSD;

      wallet.balanceUSD += returnUSD;

      await Trade.create({
        tradeId: `EMG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        symbol: pos.symbol,
        type: 'SELL',
        price: closePrice,
        amount: pos.amount,
        pnlUSD,
        pnlPercent,
        reason: 'EMERGENCY_PANIC_CLOSE',
        executionMode: pos.executionMode || 'PAPER'
      });
    }

    await wallet.save();
    await Position.deleteMany({});

    await Log.create({
      tag: 'RISK',
      message: '🚨 EMERGENCY PANIC KILL-SWITCH ACTIVATED! Closed all open positions.',
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({ success: true, message: '🚨 EMERGENCY KILL-SWITCH ACTIVATED! All positions closed.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
