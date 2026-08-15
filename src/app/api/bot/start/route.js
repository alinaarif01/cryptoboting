import { NextResponse } from 'next/server';
import botManager from '../../../../../../backend/src/engine/botManager';

export async function POST(req) {
  try {
    const body = await req.json();
    const { symbol, strategy, config } = body || {};
    botManager.startBot(symbol, strategy, config);
    return NextResponse.json({ success: true, message: 'Bot started successfully', data: botManager.getState() });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
