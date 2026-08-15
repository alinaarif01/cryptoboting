import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';

export async function POST() {
  try {
    const wallet = dbStore.resetWallet();
    dbStore.addLog('WALLET', 'Paper trading wallet balance reset to $10,000.00 USD in Persistent Database');

    return NextResponse.json({
      success: true,
      message: 'Paper trading balance reset to $10,000.00 USD',
      data: wallet
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
