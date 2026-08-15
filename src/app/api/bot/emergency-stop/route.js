import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';
import { getBotEngine } from '../../../../lib/botEngine';
import { fetchLiveTickers } from '../../../../../backend/src/services/marketData';

export async function POST() {
  try {
    const engine = getBotEngine();
    engine.stop();

    const positions = dbStore.getPositions();
    const tickers = await fetchLiveTickers();

    let totalRecoveredUSD = 0;

    for (const pos of positions) {
      const rawSym = pos.symbol.replace('/', '').toUpperCase();
      const liveTicker = tickers[rawSym] || tickers[pos.symbol];
      const closePrice = liveTicker ? liveTicker.price : pos.entryPrice;
      const pnlUSD = (closePrice - pos.entryPrice) * pos.amount;
      const pnlPercent = ((closePrice - pos.entryPrice) / pos.entryPrice) * 100;
      const returnUSD = pos.costUSD + pnlUSD;

      totalRecoveredUSD += returnUSD;

      dbStore.addTrade({
        symbol: pos.symbol,
        type: 'SELL',
        price: closePrice,
        amount: pos.amount,
        pnlUSD,
        pnlPercent,
        reason: 'EMERGENCY_KILL_SWITCH_CLOSE',
        executionMode: pos.executionMode || 'PAPER'
      });
    }

    if (totalRecoveredUSD > 0) {
      dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD + totalRecoveredUSD }));
    }

    dbStore.clearPositions();

    dbStore.addLog(
      'RISK',
      `🚨 EMERGENCY KILL-SWITCH: Closed ${positions.length} active positions, recovered $${totalRecoveredUSD.toFixed(2)} USD to wallet, Bot halted.`
    );

    return NextResponse.json({
      success: true,
      message: '🚨 EMERGENCY PANIC KILL-SWITCH ACTIVATED! All open positions closed at market prices.'
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
