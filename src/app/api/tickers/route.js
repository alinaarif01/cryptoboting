import { NextResponse } from 'next/server';
import { fetchLiveTickers } from '../../../lib/services/marketData';

export async function GET() {
  try {
    const tickers = await fetchLiveTickers();
    return NextResponse.json({ success: true, data: tickers });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
