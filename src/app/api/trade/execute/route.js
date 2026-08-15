import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/db';
import BotConfig from '../../../../lib/models/BotConfig';
import Wallet from '../../../../lib/models/Wallet';
import Position from '../../../../lib/models/Position';
import Trade from '../../../../lib/models/Trade';
import Log from '../../../../lib/models/Log';
import exchangeService from '../../../../../backend/src/services/exchangeService';
import { fetchLiveTickers } from '../../../../../backend/src/services/marketData';

export async function POST(req) {
  try {
    await connectDB();
    const { symbol = 'BTCUSDT', side = 'BUY', amountUSD = 100 } = await req.json();

    let botConfig = await BotConfig.findOne({ key: 'main_bot_config' });
    if (!botConfig) {
      botConfig = await BotConfig.create({ key: 'main_bot_config' });
    }

    let wallet = await Wallet.findOne({ key: 'main_paper_wallet' });
    if (!wallet) {
      wallet = await Wallet.create({ key: 'main_paper_wallet' });
    }

    const tickers = await fetchLiveTickers();
    const rawSym = symbol.replace('/', '').toUpperCase();
    const liveTicker = tickers[rawSym];
    const currentPrice = liveTicker ? liveTicker.price : 65000;
    const amountCrypto = amountUSD / currentPrice;

    const apiKey = botConfig.exchangeConfig?.apiKey || process.env.BINANCE_API_KEY;
    const apiSecret = botConfig.exchangeConfig?.apiSecret || process.env.BINANCE_API_SECRET;
    const isTestnet = botConfig.exchangeConfig?.isTestnet !== false;
    const marketType = botConfig.exchangeConfig?.marketType || 'SPOT';

    const isLive = botConfig.executionMode === 'LIVE' || (apiKey && apiSecret);
    let exchangeOrderResult = null;

    if (apiKey && apiSecret) {
      // Initialize exchangeService with saved or env keys
      exchangeService.setCredentials({
        exchange: 'BINANCE',
        marketType,
        apiKey,
        apiSecret,
        isTestnet
      });

      const endpoint = marketType === 'FUTURES' ? '/fapi/v1/order' : '/api/v3/order';
      const fullUrl = `${exchangeService.baseUrl}${endpoint}`;

      await Log.create({
        tag: 'API_HIT',
        message: `[BINANCE API HIT] POST ${fullUrl} | Symbol: ${rawSym} | Side: ${side.toUpperCase()} | Qty: ${amountCrypto.toFixed(5)}`,
        time: new Date().toLocaleTimeString()
      });

      // Execute Real Spot / Futures Order on Binance
      exchangeOrderResult = await exchangeService.placeSpotOrder({
        symbol: rawSym,
        side: side.toUpperCase(),
        type: 'MARKET',
        quantity: amountCrypto
      });

      await Log.create({
        tag: 'API_RESPONSE',
        message: `[BINANCE API RESPONSE 200 OK] OrderID: ${exchangeOrderResult.orderId} | Status: ${exchangeOrderResult.status} | ExecutedQty: ${exchangeOrderResult.executedQty} | Response JSON: ${JSON.stringify(exchangeOrderResult.raw)}`,
        time: new Date().toLocaleTimeString()
      });
    }

    if (side.toUpperCase() === 'BUY') {
      wallet.balanceUSD -= amountUSD;
      await wallet.save();

      const positionId = `POS_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      await Position.create({
        positionId,
        symbol: symbol.replace('USDT', '/USDT'),
        side: 'BUY',
        entryPrice: currentPrice,
        amount: amountCrypto,
        costUSD: amountUSD,
        stopLoss: currentPrice * (1 - (botConfig.config.stopLossPercent || 3) / 100),
        takeProfit: currentPrice * (1 + (botConfig.config.takeProfitPercent || 6) / 100),
        executionMode: botConfig.executionMode
      });

      await Trade.create({
        tradeId: `TR_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        symbol: symbol.replace('USDT', '/USDT'),
        type: 'BUY',
        price: currentPrice,
        amount: amountCrypto,
        pnlUSD: 0,
        pnlPercent: 0,
        reason: `MANUAL_${isLive ? 'LIVE' : 'PAPER'}_BUY`,
        executionMode: botConfig.executionMode
      });

      await Log.create({
        tag: 'TRADE',
        message: `[${botConfig.executionMode}] BUY Executed: ${amountCrypto.toFixed(5)} ${symbol} @ $${currentPrice.toFixed(2)}`,
        time: new Date().toLocaleTimeString()
      });
    } else {
      // SELL Signal / Action
      const openPos = await Position.findOne({ symbol: symbol.replace('USDT', '/USDT') });
      if (openPos) {
        const pnlUSD = (currentPrice - openPos.entryPrice) * openPos.amount;
        const pnlPercent = ((currentPrice - openPos.entryPrice) / openPos.entryPrice) * 100;
        wallet.balanceUSD += (openPos.costUSD + pnlUSD);
        await wallet.save();

        await Trade.create({
          tradeId: `TR_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          symbol: openPos.symbol,
          type: 'SELL',
          price: currentPrice,
          amount: openPos.amount,
          pnlUSD,
          pnlPercent,
          reason: `MANUAL_${isLive ? 'LIVE' : 'PAPER'}_SELL`,
          executionMode: botConfig.executionMode
        });

        await Position.deleteOne({ positionId: openPos.positionId });

        await Log.create({
          tag: 'TRADE',
          message: `[${botConfig.executionMode}] SELL Executed: ${openPos.amount.toFixed(5)} ${symbol} @ $${currentPrice.toFixed(2)} | PnL: $${pnlUSD.toFixed(2)}`,
          time: new Date().toLocaleTimeString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `[${botConfig.executionMode}] ${side.toUpperCase()} Order executed successfully!`,
      exchangeOrder: exchangeOrderResult
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
