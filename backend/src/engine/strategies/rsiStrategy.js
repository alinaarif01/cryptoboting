// RSI + EMA Technical Strategy Calculator

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices, period = 50) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function evaluateRSIStrategy(candles, config = {}) {
  const oversold = config.rsiOversold || 30;
  const overbought = config.rsiOverbought || 70;
  const rsiPeriod = config.rsiPeriod || 14;

  const closePrices = candles.map(c => c.close);
  const currentRsi = calculateRSI(closePrices, rsiPeriod);
  const ema50 = calculateEMA(closePrices, 50);

  const lastPrice = closePrices[closePrices.length - 1];

  let signal = 'HOLD';
  let reason = `RSI: ${currentRsi ? currentRsi.toFixed(2) : 'N/A'}`;

  if (currentRsi !== null) {
    if (currentRsi <= oversold) {
      signal = 'BUY';
      reason = `RSI is oversold (${currentRsi.toFixed(2)} <= ${oversold})`;
    } else if (currentRsi >= overbought) {
      signal = 'SELL';
      reason = `RSI is overbought (${currentRsi.toFixed(2)} >= ${overbought})`;
    }
  }

  return {
    signal,
    reason,
    price: lastPrice,
    rsi: currentRsi ? parseFloat(currentRsi.toFixed(2)) : null,
    ema50: ema50 ? parseFloat(ema50.toFixed(2)) : null
  };
}

module.exports = {
  calculateRSI,
  calculateEMA,
  evaluateRSIStrategy
};
