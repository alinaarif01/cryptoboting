import { NextResponse } from 'next/server';
import { fetchKlines } from '../../../../backend/src/services/marketData';
import { runBacktest } from '../../../../backend/src/engine/backtester';

export async function POST(req) {
  try {
    const { symbol = 'BTCUSDT', interval = '1h', limit = 200, options = {} } = await req.json();
    const candles = await fetchKlines(symbol, interval, limit);

    if (!candles || candles.length === 0) {
      return NextResponse.json({ success: false, error: 'Could not fetch candle data for backtest' }, { status: 400 });
    }

    const report = runBacktest(candles, options);
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
