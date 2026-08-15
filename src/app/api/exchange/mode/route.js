import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import BotConfig from '../../../../lib/models/BotConfig';
import Log from '../../../../lib/models/Log';

export async function POST(req) {
  try {
    await connectDB();
    const { mode } = await req.json();
    if (!['PAPER', 'LIVE'].includes(mode)) {
      return NextResponse.json({ success: false, error: 'Invalid mode. Must be PAPER or LIVE.' }, { status: 400 });
    }

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = new BotConfig({ key: 'main_bot_config' });
    }

    if (mode === 'LIVE' && !botConfig.exchangeConfig?.isConnected) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot switch to LIVE mode without a valid connected Exchange API Key.' 
      }, { status: 400 });
    }

    botConfig.executionMode = mode;
    await botConfig.save();

    await Log.create({
      tag: 'SYSTEM',
      message: `Bot Execution Mode switched to >>> ${mode} <<<`,
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({ success: true, mode: botConfig.executionMode });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
