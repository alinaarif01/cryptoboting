import { calculateRSI, calculateEMA, calculateATR } from './strategies';

export function runBacktest(candles, options = {}) {
  const initialBalance = Number(options.initialBalance) || 10000;
  const tradeAmount = Number(options.tradeAmount) || 1000;
  const feeRate = options.feePercent ? Number(options.feePercent) / 100 : 0.00075; // 0.075% standard Binance fee
  const strategyType = options.strategy || 'AI_ALPHA_85';

  const rsiOversold = Number(options.rsiOversold) || 32;
  const rsiOverbought = Number(options.rsiOverbought) || 68;
  const rsiPeriod = Number(options.rsiPeriod) || 14;
  const stopLossPercent = Number(options.stopLossPercent) || 2.5;
  const takeProfitPercent = Number(options.takeProfitPercent) || 6.5;

  let walletUSD = initialBalance;
  let assetPosition = 0;
  let entryPrice = 0;
  let trades = [];

  let peakBalance = initialBalance;
  let maxDrawdown = 0;

  if (!candles || candles.length < 30) {
    return {
      initialBalance,
      finalEquity: initialBalance,
      totalProfit: 0,
      roi: 0,
      totalTradesCount: 0,
      completedTradesCount: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      trades: []
    };
  }

  const closePrices = candles.map(c => c.close);
  const ema20Arr = calculateEMA(closePrices, 20);
  const ema50Arr = calculateEMA(closePrices, 50);

  for (let i = 30; i < candles.length; i++) {
    const candle = candles[i];
    const currentPrice = candle.close;
    const historicalSubSlice = closePrices.slice(0, i + 1);
    const rsi = calculateRSI(historicalSubSlice, rsiPeriod) || 50;
    const ema20 = ema20Arr[i];
    const ema50 = ema50Arr[i];

    // Check Take-Profit or Stop-Loss if holding position
    if (assetPosition > 0) {
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      let exitReason = null;

      if (pnlPct >= takeProfitPercent) {
        exitReason = `TAKE_PROFIT (+${pnlPct.toFixed(2)}%)`;
      } else if (pnlPct <= -stopLossPercent) {
        exitReason = `STOP_LOSS (${pnlPct.toFixed(2)}%)`;
      }

      if (exitReason) {
        const grossReturn = assetPosition * currentPrice;
        const fee = grossReturn * feeRate;
        const netReturn = grossReturn - fee;
        const pnl = netReturn - (assetPosition * entryPrice);

        walletUSD += netReturn;

        trades.push({
          id: `BT-TR-${trades.length + 1}`,
          type: 'SELL',
          price: currentPrice,
          amount: assetPosition,
          grossReturn,
          fee,
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercent: parseFloat(pnlPct.toFixed(2)),
          reason: exitReason,
          time: candle.time,
          timestamp: candle.timestamp,
          rsi: parseFloat(rsi.toFixed(2))
        });

        assetPosition = 0;
        entryPrice = 0;
        continue;
      }
    }

    // Check strategy entry / exit signals
    let signal = 'HOLD';

    if (strategyType === 'AI_ALPHA_85') {
      // 85% Confluence: Bullish EMA Trend (EMA20 > EMA50) + RSI Pullback (RSI <= 48) + Bullish confirmation
      const isBullishTrend = ema20 && ema50 ? ema20 >= ema50 * 0.998 : true;
      const isGreenCandle = candle.close >= candle.open;

      if (isBullishTrend && rsi <= 48 && isGreenCandle) {
        signal = 'BUY';
      } else if (rsi >= rsiOverbought || (ema20 && ema50 && ema20 < ema50 && rsi > 58)) {
        signal = 'SELL';
      }
    } else if (strategyType === 'RSI') {
      if (rsi <= rsiOversold) signal = 'BUY';
      else if (rsi >= rsiOverbought) signal = 'SELL';
    } else if (strategyType === 'GRID') {
      const prevClose = closePrices[i - 1];
      if (candle.close < prevClose * 0.988) signal = 'BUY';
      else if (candle.close > prevClose * 1.012) signal = 'SELL';
    } else if (strategyType === 'DCA') {
      if (i % 6 === 0) signal = 'BUY'; // Accumulate periodically
      else if (rsi >= 72) signal = 'SELL';
    }

    // Execute BUY
    if (signal === 'BUY' && assetPosition === 0 && walletUSD >= tradeAmount) {
      const fee = tradeAmount * feeRate;
      const netCapital = tradeAmount - fee;
      assetPosition = netCapital / currentPrice;
      walletUSD -= tradeAmount;
      entryPrice = currentPrice;

      trades.push({
        id: `BT-TR-${trades.length + 1}`,
        type: 'BUY',
        price: currentPrice,
        amount: assetPosition,
        cost: tradeAmount,
        fee,
        reason: `${strategyType}_ENTRY`,
        time: candle.time,
        timestamp: candle.timestamp,
        rsi: parseFloat(rsi.toFixed(2))
      });
    }
    // Execute Strategy SELL
    else if (signal === 'SELL' && assetPosition > 0) {
      const grossReturn = assetPosition * currentPrice;
      const fee = grossReturn * feeRate;
      const netReturn = grossReturn - fee;
      const pnl = netReturn - (assetPosition * entryPrice);
      const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

      walletUSD += netReturn;

      trades.push({
        id: `BT-TR-${trades.length + 1}`,
        type: 'SELL',
        price: currentPrice,
        amount: assetPosition,
        grossReturn,
        fee,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        reason: `${strategyType}_SIGNAL_EXIT`,
        time: candle.time,
        timestamp: candle.timestamp,
        rsi: parseFloat(rsi.toFixed(2))
      });

      assetPosition = 0;
      entryPrice = 0;
    }

    // Drawdown calculation
    const currentEquity = walletUSD + (assetPosition * currentPrice);
    if (currentEquity > peakBalance) {
      peakBalance = currentEquity;
    } else {
      const dd = ((peakBalance - currentEquity) / peakBalance) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  // Final evaluation
  const lastCandle = candles[candles.length - 1];
  const finalEquity = walletUSD + (assetPosition * (lastCandle ? lastCandle.close : 0));
  const totalProfit = finalEquity - initialBalance;
  const roi = (totalProfit / initialBalance) * 100;

  const completedTrades = trades.filter(t => t.type === 'SELL');
  const winTrades = completedTrades.filter(t => t.pnl > 0);
  const lossTrades = completedTrades.filter(t => t.pnl <= 0);

  const totalGains = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLosses === 0 ? (totalGains > 0 ? 99.9 : 0) : totalGains / totalLosses;
  const winRate = completedTrades.length > 0 ? (winTrades.length / completedTrades.length) * 100 : 0;

  return {
    strategy: strategyType,
    initialBalance,
    finalEquity: parseFloat(finalEquity.toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    roi: parseFloat(roi.toFixed(2)),
    totalTradesCount: trades.length,
    completedTradesCount: completedTrades.length,
    winningTradesCount: winTrades.length,
    losingTradesCount: lossTrades.length,
    winRate: parseFloat(winRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    trades: trades.reverse()
  };
}
