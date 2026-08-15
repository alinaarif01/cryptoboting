const https = require('https');

// Ticker cache holding real live Binance data
let tickerCache = {};

// Helper for HTTPS requests
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

// Fetch 100% real live tickers directly from Binance public API
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
    console.error('[MarketData Error] Live Binance tickers API failed:', err.message);
    return tickerCache;
  }
}

// Fetch 100% real OHLCV Candlestick data directly from Binance public API
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
    console.error(`[MarketData Error] Live Binance klines API failed for ${symbol}:`, err.message);
    return [];
  }
}

module.exports = {
  fetchLiveTickers,
  fetchKlines,
  getTickerCache: () => tickerCache
};
