import { NextResponse } from 'next/server';
import botManager from '../../../../../../backend/src/engine/botManager';

export async function POST() {
  try {
    await botManager.emergencyStop();
    return NextResponse.json({ success: true, message: '🚨 EMERGENCY KILL-SWITCH ACTIVATED! All positions closed.', data: botManager.getState() });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
