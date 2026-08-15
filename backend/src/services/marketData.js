const https = require('https');

// Ticker cache holding real live Binance data
let tickerCache = {};

// Helper for HTTPS requests using modern native fetch
async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[fetchJson Error] ${url}:`, err.message);
    return null;
  }
}

// Fetch 100% real live tickers directly from Binance public API (Targeted symbols for ultra-fast response)
async function fetchLiveTickers() {
  try {
    const symbolsParam = encodeURIComponent(JSON.stringify(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']));
    const data = await fetchJson(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`);
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        const entry = {
          symbol: item.symbol.replace('USDT', '/USDT'),
          rawSymbol: item.symbol,
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent),
          high24h: parseFloat(item.highPrice),
          low24h: parseFloat(item.lowPrice),
          volume: parseFloat(item.volume)
        };
        tickerCache[item.symbol] = entry;
        tickerCache[item.symbol.replace('USDT', '/USDT')] = entry;
      });
    }
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

    if (!Array.isArray(rawData)) return [];

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
