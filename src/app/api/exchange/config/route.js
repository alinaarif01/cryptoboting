import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';
import exchangeService from '../../../../lib/services/exchangeService';

export async function POST(req) {
  try {
    const { exchange = 'BINANCE', marketType = 'SPOT', apiKey, apiSecret, isTestnet = true } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'API Key and Secret Key are required.' }, { status: 400 });
    }

    exchangeService.setCredentials({ exchange, marketType, apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), isTestnet });
    const testRes = await exchangeService.testConnection();

    const exchangeConfig = {
      exchange: exchange.toUpperCase(),
      marketType: marketType.toUpperCase(),
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      isTestnet: Boolean(isTestnet),
      isConnected: Boolean(testRes.success),
      message: testRes.message
    };

    const updatedConfig = dbStore.updateBotConfig(cfg => ({
      ...cfg,
      exchangeConfig,
      executionMode: testRes.success ? 'LIVE' : cfg.executionMode
    }));

    dbStore.addLog('EXCHANGE', testRes.message);

    return NextResponse.json({
      success: testRes.success,
      data: testRes,
      message: testRes.message,
      botState: {
        exchangeConfig,
        executionMode: updatedConfig.executionMode
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
