import { NextResponse } from 'next/server';
import { dbStore } from '../../../../lib/store';
import exchangeService from '../../../../lib/services/exchangeService';
import { fetchLiveTickers } from '../../../../lib/services/marketData';

export async function POST(req) {
  try {
    const { symbol = 'BTCUSDT', side = 'BUY', amountUSD = 100 } = await req.json();

    const botConfig = dbStore.getBotConfig();
    const wallet = dbStore.getWallet();
    const parsedAmountUSD = Number(amountUSD) || 100;

    const tickers = await fetchLiveTickers();
    const rawSym = symbol.replace('/', '').toUpperCase();
    const liveTicker = tickers[rawSym] || tickers[symbol];
    const currentPrice = liveTicker ? liveTicker.price : 65000;
    const amountCrypto = parsedAmountUSD / currentPrice;

    const apiKey = botConfig.exchangeConfig?.apiKey || process.env.BINANCE_API_KEY;
    const apiSecret = botConfig.exchangeConfig?.apiSecret || process.env.BINANCE_API_SECRET;
    const isTestnet = botConfig.exchangeConfig?.isTestnet !== false;
    const marketType = botConfig.exchangeConfig?.marketType || 'SPOT';

    const isLive = botConfig.executionMode === 'LIVE' && apiKey && apiSecret;
    let exchangeOrderResult = null;

    if (isLive) {
      exchangeService.setCredentials({
        exchange: 'BINANCE',
        marketType,
        apiKey,
        apiSecret,
        isTestnet
      });

      const endpoint = marketType === 'FUTURES' ? '/fapi/v1/order' : '/api/v3/order';
      dbStore.addLog('API_HIT', `[BINANCE API HIT] POST ${exchangeService.baseUrl}${endpoint} | ${rawSym} ${side.toUpperCase()} Qty: ${amountCrypto.toFixed(5)}`);

      try {
        exchangeOrderResult = await exchangeService.placeSpotOrder({
          symbol: rawSym,
          side: side.toUpperCase(),
          type: 'MARKET',
          quantity: amountCrypto
        });

        dbStore.addLog('API_RESPONSE', `[BINANCE 200 OK] Order ID: ${exchangeOrderResult.orderId} | Status: ${exchangeOrderResult.status}`);
      } catch (exErr) {
        dbStore.addLog('EXCHANGE_ERR', `Binance order execution failed: ${exErr.message}`);
      }
    }

    const pairLabel = symbol.includes('/') ? symbol : `${symbol.replace('USDT', '')}/USDT`;

    if (side.toUpperCase() === 'BUY') {
      if (wallet.balanceUSD < parsedAmountUSD) {
        return NextResponse.json({ success: false, error: 'Insufficient wallet balance for this order' }, { status: 400 });
      }

      dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD - parsedAmountUSD }));

      const posId = `POS_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      dbStore.addPosition({
        positionId: posId,
        id: posId,
        symbol: pairLabel,
        side: 'BUY',
        entryPrice: currentPrice,
        amount: amountCrypto,
        costUSD: parsedAmountUSD,
        stopLoss: currentPrice * (1 - (Number(botConfig.config?.stopLossPercent) || 2.5) / 100),
        takeProfit: currentPrice * (1 + (Number(botConfig.config?.takeProfitPercent) || 6.5) / 100),
        executionMode: botConfig.executionMode,
        timestamp: new Date().toISOString()
      });

      dbStore.addTrade({
        symbol: pairLabel,
        type: 'BUY',
        price: currentPrice,
        amount: amountCrypto,
        pnlUSD: 0,
        pnlPercent: 0,
        reason: `MANUAL_${botConfig.executionMode}_BUY`,
        executionMode: botConfig.executionMode
      });

      dbStore.addLog(
        'TRADE',
        `[${botConfig.executionMode}] BUY Executed: ${amountCrypto.toFixed(5)} ${pairLabel} @ $${currentPrice.toFixed(2)} ($${parsedAmountUSD} USD)`
      );
    } else {
      // SELL Action
      const positions = dbStore.getPositions();
      const openPos = positions.find(p => p.symbol.replace('/', '') === rawSym || p.symbol === pairLabel);

      if (openPos) {
        const pnlUSD = (currentPrice - openPos.entryPrice) * openPos.amount;
        const pnlPercent = ((currentPrice - openPos.entryPrice) / openPos.entryPrice) * 100;
        const returnUSD = openPos.costUSD + pnlUSD;

        dbStore.updateWallet(w => ({ ...w, balanceUSD: w.balanceUSD + returnUSD }));
        dbStore.removePosition(openPos.positionId || openPos.id);

        dbStore.addTrade({
          symbol: openPos.symbol,
          type: 'SELL',
          price: currentPrice,
          amount: openPos.amount,
          pnlUSD,
          pnlPercent,
          reason: `MANUAL_${botConfig.executionMode}_SELL`,
          executionMode: botConfig.executionMode
        });

        dbStore.addLog(
          'TRADE',
          `[${botConfig.executionMode}] SELL Executed: ${openPos.amount.toFixed(5)} ${openPos.symbol} @ $${currentPrice.toFixed(2)} | PnL: $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
        );
      } else {
        // Direct Market Sell
        dbStore.addTrade({
          symbol: pairLabel,
          type: 'SELL',
          price: currentPrice,
          amount: amountCrypto,
          pnlUSD: 0,
          pnlPercent: 0,
          reason: `MANUAL_${botConfig.executionMode}_MARKET_SELL`,
          executionMode: botConfig.executionMode
        });

        dbStore.addLog(
          'TRADE',
          `[${botConfig.executionMode}] Direct Market SELL: ${amountCrypto.toFixed(5)} ${pairLabel} @ $${currentPrice.toFixed(2)}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `[${botConfig.executionMode}] ${side.toUpperCase()} Order for $${parsedAmountUSD} USD executed successfully!`,
      exchangeOrder: exchangeOrderResult
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
