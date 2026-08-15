const https = require('https');

// Cache live tickers and candles
let tickerCache = {
  'BTCUSDT': { symbol: 'BTC/USDT', price: 65420.50, change24h: 2.45, high24h: 66100.00, low24h: 63800.00, volume: 18420.5 },
  'ETHUSDT': { symbol: 'ETH/USDT', price: 3480.20, change24h: -0.85, high24h: 3550.00, low24h: 3420.00, volume: 45210.1 },
  'SOLUSDT': { symbol: 'SOL/USDT', price: 145.75, change24h: 5.12, high24h: 148.50, low24h: 137.20, volume: 89400.0 },
  'BNBUSDT': { symbol: 'BNB/USDT', price: 575.40, change24h: 1.10, high24h: 582.00, low24h: 568.00, volume: 12100.0 }
};

// Helper for HTTP requests
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'CryptoBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', err => reject(err));
  });
}

// Fetch live tickers from Binance public API
async function fetchLiveTickers() {
  try {
    const data = await fetchJson('https://api.binance.com/api/v3/ticker/24hr');
    const targetPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    
    data.forEach(item => {
      if (targetPairs.includes(item.symbol)) {
        tickerCache[item.symbol] = {
          symbol: item.symbol.replace('USDT', '/USDT'),
          rawSymbol: item.symbol,
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent),
          high24h: parseFloat(item.highPrice),
          low24h: parseFloat(item.lowPrice),
          volume: parseFloat(item.volume)
        };
      }
    });
    return tickerCache;
  } catch (err) {
    // If Binance API is blocked or offline, add small jitter to simulation cache
    for (const key in tickerCache) {
      const jitter = (Math.random() - 0.49) * (tickerCache[key].price * 0.002);
      tickerCache[key].price = parseFloat((tickerCache[key].price + jitter).toFixed(2));
    }
    return tickerCache;
  }
}

// Fetch OHLCV Candlestick data for charting & backtesting
async function fetchKlines(symbol = 'BTCUSDT', interval = '1h', limit = 100) {
  try {
    const formattedSymbol = symbol.replace('/', '').toUpperCase();
    const url = `https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`;
    const rawData = await fetchJson(url);

    return rawData.map(c => ({
      timestamp: c[0],
      time: new Date(c[0]).toISOString(),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));
  } catch (err) {
    console.warn(`[MarketData] Binance API failed for ${symbol}, using generated candles fallback:`, err.message);
    return generateFallbackCandles(symbol, limit);
  }
}

// Fallback candle generator for robust offline execution & simulation
function generateFallbackCandles(symbol, count = 100) {
  let basePrice = symbol.includes('BTC') ? 65000 : symbol.includes('ETH') ? 3400 : 140;
  const now = Date.now();
  const hourMs = 3600 * 1000;
  const candles = [];

  for (let i = count; i >= 0; i--) {
    const timestamp = now - (i * hourMs);
    const change = (Math.random() - 0.48) * (basePrice * 0.015);
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * (basePrice * 0.008);
    const low = Math.min(open, close) - Math.random() * (basePrice * 0.008);
    const volume = Math.random() * 500 + 100;

    candles.push({
      timestamp,
      time: new Date(timestamp).toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });

    basePrice = close;
  }
  return candles;
}

module.exports = {
  fetchLiveTickers,
  fetchKlines,
  getTickerCache: () => tickerCache
};
