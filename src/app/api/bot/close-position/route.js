import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import Wallet from '../../../../lib/models/Wallet';
import Position from '../../../../lib/models/Position';
import Trade from '../../../../lib/models/Trade';
import Log from '../../../../lib/models/Log';
import { fetchLiveTickers } from '../../../../../backend/src/services/marketData';

export async function POST(req) {
  try {
    await connectDB();
    const { positionId } = await req.json();

    const pos = await Position.findOne({ positionId });
    if (!pos) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    const tickers = await fetchLiveTickers();
    const rawSym = pos.symbol.replace('/', '').toUpperCase();
    const liveTicker = tickers[rawSym];
    const currentPrice = liveTicker ? liveTicker.price : pos.entryPrice;

    const pnlUSD = (currentPrice - pos.entryPrice) * pos.amount;
    const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const returnUSD = pos.costUSD + pnlUSD;

    let wallet = await Wallet.findOne({ key: 'main_paper_wallet' });
    if (wallet) {
      wallet.balanceUSD += returnUSD;
      await wallet.save();
    }

    await Trade.create({
      tradeId: `MAN_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      symbol: pos.symbol,
      type: 'SELL',
      price: currentPrice,
      amount: pos.amount,
      pnlUSD,
      pnlPercent,
      reason: 'MANUAL_CLOSE',
      executionMode: pos.executionMode || 'PAPER'
    });

    await Position.deleteOne({ positionId });

    await Log.create({
      tag: 'TRADE',
      message: `Manual Close Executed for ${pos.symbol} @ $${currentPrice.toFixed(2)} | PnL: $${pnlUSD.toFixed(2)}`,
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({ success: true, message: `Position ${positionId} closed successfully` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
