import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';

export async function POST(req) {
  try {
    const configParams = await req.json();
    const updated = dbStore.updateBotConfig(cfg => ({
      ...cfg,
      config: { ...cfg.config, ...configParams }
    }));

    dbStore.addLog('SYSTEM', 'Bot strategy and risk parameters updated in Persistent Database');

    return NextResponse.json({
      success: true,
      message: 'Bot configuration updated successfully',
      data: updated
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
