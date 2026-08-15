import crypto from 'crypto';

class ExchangeService {
  constructor() {
    this.exchange = 'BINANCE';
    this.marketType = 'SPOT';
    this.apiKey = process.env.BINANCE_API_KEY || '';
    this.apiSecret = process.env.BINANCE_API_SECRET || '';
    this.isTestnet = process.env.BINANCE_IS_TESTNET !== 'false';

    this.binanceLive = 'https://api.binance.com';
    this.binanceTestnet = 'https://testnet.binance.vision';
    this.binanceFuturesLive = 'https://fapi.binance.com';
    this.binanceFuturesTestnet = 'https://testnet.binancefuture.com';
    this.bybitLive = 'https://api.bybit.com';
    this.bybitTestnet = 'https://api-testnet.bybit.com';
  }

  setCredentials({ exchange = 'BINANCE', marketType = 'SPOT', apiKey, apiSecret, isTestnet = true }) {
    this.exchange = exchange.toUpperCase();
    this.marketType = marketType.toUpperCase();
    this.apiKey = apiKey ? apiKey.trim() : this.apiKey;
    this.apiSecret = apiSecret ? apiSecret.trim() : this.apiSecret;
    this.isTestnet = Boolean(isTestnet);
  }

  get baseUrl() {
    if (this.exchange === 'BYBIT') {
      return this.isTestnet ? this.bybitTestnet : this.bybitLive;
    }
    if (this.marketType === 'FUTURES') {
      return this.isTestnet ? this.binanceFuturesTestnet : this.binanceFuturesLive;
    }
    return this.isTestnet ? this.binanceTestnet : this.binanceLive;
  }

  createSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  async signedRequest(method, endpoint, params = {}) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Exchange API Key and API Secret are required.');
    }

    const timestamp = Date.now();
    const fullParams = { ...params, timestamp };
    const queryString = Object.keys(fullParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(fullParams[key])}`)
      .join('&');

    const signature = this.createSignature(queryString);
    const requestUrl = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const res = await fetch(requestUrl, {
      method,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.msg || data.message || `Exchange Error HTTP ${res.status}`);
    }
    return data;
  }

  async testConnection() {
    try {
      if (!this.apiKey || !this.apiSecret) {
        return { success: false, message: 'API Key & Secret Key cannot be empty.' };
      }
      const endpoint = this.marketType === 'FUTURES' ? '/fapi/v1/account' : '/api/v3/account';
      const data = await this.signedRequest('GET', endpoint);

      if (data && (data.balances || data.assets || data.canTrade !== undefined)) {
        return {
          success: true,
          message: `Connected to ${this.exchange} (${this.marketType} ${this.isTestnet ? 'Testnet' : 'Live'}) successfully!`,
          accountType: data.accountType || this.marketType
        };
      }
      return { success: true, message: `Connected to ${this.exchange} successfully!` };
    } catch (err) {
      return { success: false, message: `${this.exchange} Verification Error: ${err.message}` };
    }
  }

  async placeSpotOrder({ symbol = 'BTCUSDT', side = 'BUY', type = 'MARKET', quantity, price }) {
    const rawSym = symbol.replace('/', '').toUpperCase();
    const endpoint = this.marketType === 'FUTURES' ? '/fapi/v1/order' : '/api/v3/order';
    const params = {
      symbol: rawSym,
      side: side.toUpperCase(),
      type: type.toUpperCase()
    };

    if (quantity) params.quantity = parseFloat(Number(quantity).toFixed(5));
    if (type.toUpperCase() === 'LIMIT' && price) {
      params.price = parseFloat(Number(price).toFixed(2));
      params.timeInForce = 'GTC';
    }

    const data = await this.signedRequest('POST', endpoint, params);
    return {
      orderId: data.orderId || data.clientOrderId,
      symbol: data.symbol,
      status: data.status,
      side: data.side,
      executedQty: data.executedQty,
      cummulativeQuoteQty: data.cummulativeQuoteQty,
      raw: data
    };
  }
}

const exchangeService = new ExchangeService();
export default exchangeService;
