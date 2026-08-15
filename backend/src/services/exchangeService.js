const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

class ExchangeService {
  constructor() {
    this.exchange = 'BINANCE'; // 'BINANCE' or 'BYBIT'
    this.marketType = 'SPOT'; // 'SPOT' or 'FUTURES'
    this.apiKey = '';
    this.apiSecret = '';
    this.isTestnet = true;
    
    // Base URLs
    this.binanceLive = 'https://api.binance.com';
    this.binanceTestnet = 'https://testnet.binance.vision';
    this.binanceFuturesLive = 'https://fapi.binance.com';
    this.binanceFuturesTestnet = 'https://testnet.binancefuture.com';
    this.bybitLive = 'https://api.bybit.com';
    this.bybitTestnet = 'https://api-testnet.bybit.com';

    // Auto-load .env file if available
    this.loadEnv();
  }

  loadEnv() {
    try {
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, val] = line.split('=');
          if (key && val) {
            process.env[key.trim()] = val.trim();
          }
        });

        if (process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET) {
          this.setCredentials({
            exchange: process.env.BINANCE_EXCHANGE || 'BINANCE',
            marketType: process.env.BINANCE_MARKET_TYPE || 'SPOT',
            apiKey: process.env.BINANCE_API_KEY,
            apiSecret: process.env.BINANCE_API_SECRET,
            isTestnet: process.env.BINANCE_IS_TESTNET !== 'false'
          });
        }
      }
    } catch (e) {
      console.warn('[ExchangeService] Could not auto-load .env file:', e.message);
    }
  }

  setCredentials({ exchange = 'BINANCE', marketType = 'SPOT', apiKey, apiSecret, isTestnet = true }) {
    this.exchange = exchange.toUpperCase();
    this.marketType = marketType.toUpperCase();
    this.apiKey = apiKey ? apiKey.trim() : '';
    this.apiSecret = apiSecret ? apiSecret.trim() : '';
    this.isTestnet = Boolean(isTestnet);
  }

  get baseUrl() {
    if (this.exchange === 'BYBIT') {
      return this.isTestnet ? this.bybitTestnet : this.bybitLive;
    }
    // Binance Spot vs Futures
    if (this.marketType === 'FUTURES') {
      return this.isTestnet ? this.binanceFuturesTestnet : this.binanceFuturesLive;
    }
    return this.isTestnet ? this.binanceTestnet : this.binanceLive;
  }

  // Generate HMAC SHA256 Signature
  createSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  // Generic Signed HTTPS Request
  signedRequest(method, endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.apiKey || !this.apiSecret) {
        return reject(new Error('Exchange API Key and API Secret are required.'));
      }

      const timestamp = Date.now();
      let fullParams = { ...params, timestamp };
      const queryString = Object.keys(fullParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(fullParams[key])}`)
        .join('&');

      const signature = this.createSignature(queryString);
      const requestUrl = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

      const options = {
        method,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CryptoBot/1.0'
        }
      };

      const req = https.request(requestUrl, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.msg || parsed.message || `HTTP ${res.statusCode}: ${data}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', err => reject(err));
      req.end();
    });
  }

  // Test API Key permissions & account connectivity
  async testConnection() {
    if (!this.apiKey || !this.apiSecret) {
      return { success: false, message: 'API Key and Secret must be provided.' };
    }

    try {
      // Binance Account Info endpoint
      const accountInfo = await this.signedRequest('GET', '/api/v3/account');
      return {
        success: true,
        message: `Successfully connected to ${this.exchange} ${this.isTestnet ? 'Testnet' : 'Mainnet'}!`,
        canTrade: accountInfo.canTrade,
        balances: accountInfo.balances ? accountInfo.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0) : []
      };
    } catch (err) {
      return {
        success: false,
        message: `Exchange Connection Failed: ${err.message}`
      };
    }
  }

  // Fetch Exchange Account Balances
  async getAccountBalances() {
    try {
      const accountInfo = await this.signedRequest('GET', '/api/v3/account');
      const activeBalances = (accountInfo.balances || []).filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
      
      const usdt = activeBalances.find(b => b.asset === 'USDT') || { free: '0', locked: '0' };
      const btc = activeBalances.find(b => b.asset === 'BTC') || { free: '0', locked: '0' };
      
      return {
        success: true,
        usdtFree: parseFloat(usdt.free),
        usdtLocked: parseFloat(usdt.locked),
        btcFree: parseFloat(btc.free),
        allBalances: activeBalances
      };
    } catch (err) {
      throw new Error(`Failed to fetch balances: ${err.message}`);
    }
  }

  // Execute Real Spot Order on Exchange
  async placeSpotOrder({ symbol = 'BTCUSDT', side = 'BUY', type = 'MARKET', quantity, price }) {
    try {
      const formattedSymbol = symbol.replace('/', '').toUpperCase();
      const params = {
        symbol: formattedSymbol,
        side: side.toUpperCase(),
        type: type.toUpperCase()
      };

      if (type.toUpperCase() === 'MARKET') {
        params.quantity = parseFloat(quantity).toFixed(5);
      } else if (type.toUpperCase() === 'LIMIT') {
        params.quantity = parseFloat(quantity).toFixed(5);
        params.price = parseFloat(price).toFixed(2);
        params.timeInForce = 'GTC';
      }

      const orderResult = await this.signedRequest('POST', '/api/v3/order', params);
      return {
        success: true,
        orderId: orderResult.orderId,
        symbol: orderResult.symbol,
        status: orderResult.status,
        executedQty: orderResult.executedQty,
        cummulativeQuoteQty: orderResult.cummulativeQuoteQty,
        raw: orderResult
      };
    } catch (err) {
      throw new Error(`Live Order Placement Failed: ${err.message}`);
    }
  }
}

const exchangeInstance = new ExchangeService();
module.exports = exchangeInstance;
