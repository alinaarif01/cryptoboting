import { NextResponse } from 'next/server';
import { fetchKlines } from '../../../lib/services/marketData';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const klines = await fetchKlines(symbol, interval, limit);
    return NextResponse.json({ success: true, data: klines });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
