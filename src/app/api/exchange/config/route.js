import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import BotConfig from '../../../../lib/models/BotConfig';
import Log from '../../../../lib/models/Log';
import exchangeService from '../../../../../backend/src/services/exchangeService';

export async function POST(req) {
  try {
    await connectDB();
    const { exchange = 'BINANCE', apiKey, apiSecret, isTestnet = true } = await req.json();

    exchangeService.setCredentials({ exchange, apiKey, apiSecret, isTestnet });
    const testRes = await exchangeService.testConnection();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = new BotConfig({ key: 'main_bot_config' });
    }

    botConfig.exchangeConfig = {
      exchange,
      apiKey: apiKey ? '***ENCRYPTED***' : '',
      isTestnet,
      isConnected: testRes.success,
      message: testRes.message
    };
    await botConfig.save();

    await Log.create({
      tag: 'EXCHANGE',
      message: testRes.message,
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({ success: testRes.success, data: testRes, message: testRes.message });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
