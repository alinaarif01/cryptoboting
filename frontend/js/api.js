// Frontend API Client & WebSocket Connection Manager
const API_BASE = 'http://localhost:5000/api';
const WS_URL = 'ws://localhost:5000';

class BotApiClient {
  constructor() {
    this.ws = null;
    this.listeners = [];
    this.reconnectTimer = null;
  }

  // REST HELPER
  async request(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (data) options.body = JSON.stringify(data);

      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const json = await res.json();
      return json;
    } catch (err) {
      console.error(`[API Error] ${method} ${endpoint}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // REST API ENDPOINTS
  getStatus() { return this.request('/status'); }
  startBot(symbol, strategy, config) { return this.request('/bot/start', 'POST', { symbol, strategy, config }); }
  stopBot() { return this.request('/bot/stop', 'POST'); }
  emergencyStop() { return this.request('/bot/emergency-stop', 'POST'); }
  closePosition(positionId) { return this.request('/bot/close-position', 'POST', { positionId }); }
  updateConfig(config) { return this.request('/bot/config', 'POST', config); }
  resetWallet() { return this.request('/wallet/reset', 'POST'); }
  saveExchangeConfig(config) { return this.request('/exchange/config', 'POST', config); }
  setExecutionMode(mode) { return this.request('/exchange/mode', 'POST', { mode }); }
  getExchangeBalance() { return this.request('/exchange/balance'); }
  getTickers() { return this.request('/tickers'); }
  getKlines(symbol, interval = '1h', limit = 100) {
    return this.request(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  }
  runBacktest(symbol, interval, limit, options) {
    return this.request('/backtest', 'POST', { symbol, interval, limit, options });
  }

  // WEBSOCKET LIFECYCLE
  connectWebSocket(onMessage, onStatusChange) {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[WS] Connected to backend server');
        if (onStatusChange) onStatusChange(true);
        if (this.reconnectTimer) clearInterval(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (onMessage) onMessage(payload);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('[WS] Disconnected, scheduling reconnect...');
        if (onStatusChange) onStatusChange(false);
        this.scheduleReconnect(onMessage, onStatusChange);
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        this.ws.close();
      };
    } catch (e) {
      this.scheduleReconnect(onMessage, onStatusChange);
    }
  }

  scheduleReconnect(onMessage, onStatusChange) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      console.log('[WS] Retrying connection...');
      this.connectWebSocket(onMessage, onStatusChange);
    }, 4000);
  }
}

const api = new BotApiClient();
