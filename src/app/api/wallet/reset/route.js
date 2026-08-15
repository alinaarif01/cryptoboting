import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import Wallet from '../../../../lib/models/Wallet';
import Position from '../../../../lib/models/Position';
import Trade from '../../../../lib/models/Trade';
import Log from '../../../../lib/models/Log';

export async function POST() {
  try {
    await connectDB();

    let wallet = await Wallet.findOne({ key: 'main_paper_wallet' });
    if (!wallet) {
      wallet = new Wallet({ key: 'main_paper_wallet' });
    }

    wallet.balanceUSD = 10000.00;
    wallet.initialDepositUSD = 10000.00;
    await wallet.save();

    await Position.deleteMany({});
    await Trade.deleteMany({});

    await Log.create({
      tag: 'WALLET',
      message: 'Paper trading wallet reset to $10,000 USD in Database',
      time: new Date().toLocaleTimeString()
    });

    return NextResponse.json({ success: true, message: 'Wallet reset to $10,000 USD' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
