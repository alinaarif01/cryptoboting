import { NextResponse } from 'next/server';
import { getBotEngine } from '../../../../lib/botEngine';

export async function POST() {
  try {
    const engine = getBotEngine();
    const updatedConfig = engine.stop();

    return NextResponse.json({
      success: true,
      message: 'Trading Bot Stopped successfully',
      data: updatedConfig
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
