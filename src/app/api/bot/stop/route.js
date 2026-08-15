import { NextResponse } from 'next/server';
import botManager from '../../../../../../backend/src/engine/botManager';

export async function POST() {
  botManager.stopBot();
  return NextResponse.json({ success: true, message: 'Bot stopped successfully', data: botManager.getState() });
}
