// Grid Trading Strategy Module

function generateGridLevels(lowerPrice, upperPrice, gridCount) {
  const step = (upperPrice - lowerPrice) / gridCount;
  const levels = [];
  for (let i = 0; i <= gridCount; i++) {
    levels.push(parseFloat((lowerPrice + i * step).toFixed(2)));
  }
  return levels;
}

function evaluateGridStrategy(currentPrice, config = {}) {
  const lowerBound = config.gridLower || currentPrice * 0.90;
  const upperBound = config.gridUpper || currentPrice * 1.10;
  const gridCount = config.gridLevels || 5;

  const levels = generateGridLevels(lowerBound, upperBound, gridCount);

  let signal = 'HOLD';
  let closestGridIndex = -1;
  let minDiff = Infinity;

  levels.forEach((lvl, idx) => {
    const diff = Math.abs(currentPrice - lvl);
    if (diff < minDiff) {
      minDiff = diff;
      closestGridIndex = idx;
    }
  });

  const relativePos = closestGridIndex / gridCount;

  if (relativePos <= 0.3) {
    signal = 'BUY';
  } else if (relativePos >= 0.7) {
    signal = 'SELL';
  }

  return {
    signal,
    reason: `Price ($${currentPrice}) near grid line ${closestGridIndex + 1}/${gridCount + 1} ($${levels[closestGridIndex]})`,
    price: currentPrice,
    gridLevels: levels,
    activeGridIndex: closestGridIndex
  };
}

module.exports = {
  generateGridLevels,
  evaluateGridStrategy
};
