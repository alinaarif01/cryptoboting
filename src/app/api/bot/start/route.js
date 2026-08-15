import { NextResponse } from 'next/server';
import { getBotEngine } from '../../../../lib/botEngine';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { symbol = 'BTCUSDT', strategy = 'AI_ALPHA_85', config } = body || {};

    const engine = getBotEngine();
    const updatedConfig = engine.start(symbol, strategy, config);

    return NextResponse.json({
      success: true,
      message: `Trading Bot Started for ${symbol} with ${strategy} strategy`,
      data: updatedConfig
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
