import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import BotConfig from '../../../../lib/models/BotConfig';
import Log from '../../../../lib/models/Log';

export async function POST(req) {
  try {
    await connectDB();
    const configParams = await req.json();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = new BotConfig({ key: 'main_bot_config' });
    }

    botConfig.config = { ...botConfig.config, ...configParams };
    await botConfig.save();

    await Log.create({
      tag: 'SYSTEM',
      message: 'Bot strategy parameters updated and saved to Database',
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({ success: true, message: 'Bot configuration updated successfully' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
