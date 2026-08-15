import { NextResponse } from 'next/server';
import botManager from '../../../../backend/src/engine/botManager';

export async function GET() {
  return NextResponse.json({ success: true, data: botManager.getState() });
}
