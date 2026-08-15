import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import BotConfig from '../../../../lib/models/BotConfig';
import Log from '../../../../lib/models/Log';
import exchangeService from '../../../../../backend/src/services/exchangeService';

export async function POST(req) {
  try {
    await connectDB();
    const { exchange = 'BINANCE', marketType = 'SPOT', apiKey, apiSecret, isTestnet = true } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'API Key and Secret Key are required.' }, { status: 400 });
    }

    exchangeService.setCredentials({ exchange, marketType, apiKey, apiSecret, isTestnet });
    const testRes = await exchangeService.testConnection();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = new BotConfig({ key: 'main_bot_config' });
    }

    botConfig.exchangeConfig = {
      exchange: exchange.toUpperCase(),
      marketType: marketType.toUpperCase(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      isTestnet: Boolean(isTestnet),
      isConnected: Boolean(testRes.success),
      message: testRes.message
    };

    if (testRes.success) {
      botConfig.executionMode = 'LIVE';
    }

    await botConfig.save();

    await Log.create({
      tag: 'EXCHANGE',
      message: testRes.message,
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({
      success: testRes.success,
      data: testRes,
      message: testRes.message,
      executionMode: botConfig.executionMode
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
