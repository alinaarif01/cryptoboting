import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';

export async function POST(req) {
  try {
    const { mode } = await req.json();
    if (!['PAPER', 'LIVE'].includes(mode)) {
      return NextResponse.json({ success: false, error: 'Invalid mode. Must be PAPER or LIVE.' }, { status: 400 });
    }

    const currentConfig = dbStore.getBotConfig();
    if (mode === 'LIVE' && !currentConfig.exchangeConfig?.isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Cannot switch to LIVE mode without a valid connected Exchange API Key.'
      }, { status: 400 });
    }

    const updated = dbStore.updateBotConfig(cfg => ({ ...cfg, executionMode: mode }));
    dbStore.addLog('SYSTEM', `Bot Execution Mode switched to >>> ${mode} <<<`);

    return NextResponse.json({ success: true, mode: updated.executionMode });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
