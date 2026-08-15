const { calculateRSI } = require('./strategies/rsiStrategy');

function runBacktest(candles, options = {}) {
  const initialBalance = options.initialBalance || 10000;
  const tradeAmount = options.tradeAmount || 1000;
  const feeRate = options.feePercent ? options.feePercent / 100 : 0.001; // 0.1% fee
  const strategyType = options.strategy || 'RSI';
  const rsiOversold = options.rsiOversold || 30;
  const rsiOverbought = options.rsiOverbought || 70;
  const rsiPeriod = options.rsiPeriod || 14;

  let walletUSD = initialBalance;
  let assetPosition = 0;
  let entryPrice = 0;
  let trades = [];

  let peakBalance = initialBalance;
  let maxDrawdown = 0;

  const closePrices = candles.map(c => c.close);

  for (let i = rsiPeriod + 1; i < candles.length; i++) {
    const candle = candles[i];
    const historicalSubSlice = closePrices.slice(0, i + 1);
    const rsi = calculateRSI(historicalSubSlice, rsiPeriod);

    if (rsi === null) continue;

    // Check strategy signals
    let signal = 'HOLD';
    if (strategyType === 'RSI') {
      if (rsi <= rsiOversold) signal = 'BUY';
      else if (rsi >= rsiOverbought) signal = 'SELL';
    } else if (strategyType === 'GRID') {
      const prevClose = closePrices[i - 1];
      if (candle.close < prevClose * 0.985) signal = 'BUY';
      else if (candle.close > prevClose * 1.015) signal = 'SELL';
    } else if (strategyType === 'SMA_CROSS') {
      const smaShort = closePrices.slice(i - 10, i).reduce((a, b) => a + b, 0) / 10;
      const smaLong = closePrices.slice(i - 30, i).reduce((a, b) => a + b, 0) / 30;
      if (smaShort > smaLong) signal = 'BUY';
      else if (smaShort < smaLong) signal = 'SELL';
    }

    // Execute BUY
    if (signal === 'BUY' && assetPosition === 0 && walletUSD >= tradeAmount) {
      const buyPrice = candle.close;
      const fee = tradeAmount * feeRate;
      const netCapital = tradeAmount - fee;
      assetPosition = netCapital / buyPrice;
      walletUSD -= tradeAmount;
      entryPrice = buyPrice;

      trades.push({
        id: `T-${trades.length + 1}`,
        type: 'BUY',
        price: buyPrice,
        amount: assetPosition,
        cost: tradeAmount,
        fee,
        time: candle.time,
        timestamp: candle.timestamp,
        rsi: parseFloat(rsi.toFixed(2))
      });
    }
    // Execute SELL
    else if (signal === 'SELL' && assetPosition > 0) {
      const sellPrice = candle.close;
      const grossReturn = assetPosition * sellPrice;
      const fee = grossReturn * feeRate;
      const netReturn = grossReturn - fee;
      const pnl = netReturn - (assetPosition * entryPrice);
      const pnlPercent = ((sellPrice - entryPrice) / entryPrice) * 100;

      walletUSD += netReturn;

      trades.push({
        id: `T-${trades.length + 1}`,
        type: 'SELL',
        price: sellPrice,
        amount: assetPosition,
        grossReturn,
        fee,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        time: candle.time,
        timestamp: candle.timestamp,
        rsi: parseFloat(rsi.toFixed(2))
      });

      assetPosition = 0;
      entryPrice = 0;
    }

    // Track peak balance & Max Drawdown
    const currentEquity = walletUSD + (assetPosition * candle.close);
    if (currentEquity > peakBalance) {
      peakBalance = currentEquity;
    } else {
      const dd = ((peakBalance - currentEquity) / peakBalance) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  // Final evaluation if asset still held at end
  const lastCandle = candles[candles.length - 1];
  const finalEquity = walletUSD + (assetPosition * (lastCandle ? lastCandle.close : 0));
  const totalProfit = finalEquity - initialBalance;
  const roi = (totalProfit / initialBalance) * 100;

  const completedTrades = trades.filter(t => t.type === 'SELL');
  const winTrades = completedTrades.filter(t => t.pnl > 0);
  const lossTrades = completedTrades.filter(t => t.pnl <= 0);

  const totalGains = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(lossTrades.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLosses === 0 ? totalGains : totalGains / totalLosses;

  return {
    initialBalance,
    finalEquity: parseFloat(finalEquity.toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    roi: parseFloat(roi.toFixed(2)),
    totalTradesCount: trades.length,
    completedTradesCount: completedTrades.length,
    winRate: completedTrades.length > 0 ? parseFloat(((winTrades.length / completedTrades.length) * 100).toFixed(2)) : 0,
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    trades
  };
}

module.exports = {
  runBacktest
};
