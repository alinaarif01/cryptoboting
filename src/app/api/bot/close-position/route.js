import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';
import { fetchLiveTickers } from '../../../../lib/services/marketData';

export async function POST(req) {
  try {
    const { positionId } = await req.json();
    const positions = dbStore.getPositions();
    const pos = positions.find(p => p.positionId === positionId || p.id === positionId);

    if (!pos) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    const tickers = await fetchLiveTickers();
    const rawSym = pos.symbol.replace('/', '').toUpperCase();
    const liveTicker = tickers[rawSym] || tickers[pos.symbol];
    const currentPrice = liveTicker ? liveTicker.price : pos.entryPrice;

    const pnlUSD = (currentPrice - pos.entryPrice) * pos.amount;
    const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const returnUSD = pos.costUSD + pnlUSD;

    dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD + returnUSD }));
    dbStore.removePosition(pos.positionId || pos.id);

    dbStore.addTrade({
      symbol: pos.symbol,
      type: 'SELL',
      price: currentPrice,
      amount: pos.amount,
      pnlUSD,
      pnlPercent,
      reason: 'MANUAL_CLOSE',
      executionMode: pos.executionMode || 'PAPER'
    });

    dbStore.addLog(
      'TRADE',
      `Manual Position Closed: ${pos.symbol} @ $${currentPrice.toFixed(2)} | Realized PnL: $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
    );

    return NextResponse.json({
      success: true,
      message: `Position ${pos.symbol} closed successfully for $${returnUSD.toFixed(2)} USD`
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
