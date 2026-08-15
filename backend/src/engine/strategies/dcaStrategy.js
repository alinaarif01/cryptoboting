// Dollar-Cost Averaging (DCA) Strategy Module

function evaluateDCAStrategy(currentPrice, lastBuyPrice, config = {}) {
  const dcaIntervalCount = config.dcaIntervalCount || 10;
  const safetyOrderDip = config.safetyDipPercent || 2.5; // Trigger safety buy if price drops X%

  let signal = 'HOLD';
  let reason = 'Waiting for scheduled DCA interval or safety pullback dip';

  if (!lastBuyPrice) {
    signal = 'BUY';
    reason = 'Initial DCA entry position placed';
  } else {
    const priceChange = ((currentPrice - lastBuyPrice) / lastBuyPrice) * 100;
    if (priceChange <= -safetyOrderDip) {
      signal = 'BUY';
      reason = `Safety Order triggered: Price dipped ${priceChange.toFixed(2)}% below last entry ($${lastBuyPrice})`;
    } else if (priceChange >= (config.takeProfitPercent || 5.0)) {
      signal = 'SELL';
      reason = `DCA Target Take-Profit reached: +${priceChange.toFixed(2)}% profit`;
    }
  }

  return {
    signal,
    reason,
    price: currentPrice,
    lastBuyPrice: lastBuyPrice || currentPrice
  };
}

module.exports = {
  evaluateDCAStrategy
};
