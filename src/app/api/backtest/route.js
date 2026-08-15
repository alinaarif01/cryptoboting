import { NextResponse } from 'next/server';
import { fetchKlines } from '../../../../backend/src/services/marketData';
import { runBacktest } from '../../../lib/backtester';

export async function POST(req) {
  try {
    const { symbol = 'BTCUSDT', interval = '1h', limit = 300, options = {} } = await req.json();
    const formattedSymbol = symbol.replace('/', '').toUpperCase();
    const candles = await fetchKlines(formattedSymbol, interval, limit);

    if (!candles || candles.length === 0) {
      return NextResponse.json({ success: false, error: 'Could not fetch candle data for backtest simulation' }, { status: 400 });
    }

    const report = runBacktest(candles, {
      ...options,
      symbol: formattedSymbol,
      interval
    });

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
