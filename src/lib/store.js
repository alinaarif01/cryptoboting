import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

const defaultState = {
  botConfig: {
    key: 'main_bot_config',
    status: 'STOPPED',
    symbol: 'BTCUSDT',
    activeStrategy: 'AI_ALPHA_85',
    executionMode: 'PAPER',
    config: {
      rsiOversold: 32,
      rsiOverbought: 68,
      rsiPeriod: 14,
      emaShort: 20,
      emaLong: 50,
      atrMultiplier: 1.8,
      gridLower: 60000,
      gridUpper: 70000,
      gridLevels: 5,
      stopLossPercent: 2.5,
      takeProfitPercent: 6.5,
      tradeAllocationUSD: 1000,
      minWinRateTarget: 85
    },
    exchangeConfig: {
      exchange: 'BINANCE',
      marketType: 'SPOT',
      apiKey: '',
      apiSecret: '',
      isTestnet: true,
      isConnected: false
    },
    updatedAt: new Date().toISOString()
  },
  wallet: {
    key: 'main_paper_wallet',
    balanceUSD: 10000.0,
    initialDepositUSD: 10000.0,
    updatedAt: new Date().toISOString()
  },
  positions: [],
  trades: [],
  logs: [
    {
      id: 'log-init',
      tag: 'SYSTEM',
      message: 'CypherBot Pro Next.js Trading Engine online and synced with persistent DB.',
      time: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString()
    }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultState, null, 2), 'utf-8');
      return defaultState;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('[Store Error] Failed to read database, using default state:', err.message);
    return defaultState;
  }
}

function writeDb(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store Error] Failed to write database:', err.message);
  }
}

export const dbStore = {
  // BOT CONFIG
  getBotConfig: () => {
    const db = readDb();
    if (!db.botConfig) {
      db.botConfig = { ...defaultState.botConfig };
      writeDb(db);
    }
    return db.botConfig;
  },
  updateBotConfig: (updater) => {
    const db = readDb();
    if (!db.botConfig) db.botConfig = { ...defaultState.botConfig };
    if (typeof updater === 'function') {
      db.botConfig = updater(db.botConfig);
    } else {
      db.botConfig = { ...db.botConfig, ...updater, updatedAt: new Date().toISOString() };
    }
    writeDb(db);
    return db.botConfig;
  },

  // WALLET
  getWallet: () => {
    const db = readDb();
    if (!db.wallet) {
      db.wallet = { ...defaultState.wallet };
      writeDb(db);
    }
    return db.wallet;
  },
  updateWallet: (updater) => {
    const db = readDb();
    if (!db.wallet) db.wallet = { ...defaultState.wallet };
    if (typeof updater === 'function') {
      db.wallet = updater(db.wallet);
    } else {
      db.wallet = { ...db.wallet, ...updater, updatedAt: new Date().toISOString() };
    }
    writeDb(db);
    return db.wallet;
  },
  resetWallet: () => {
    const db = readDb();
    db.wallet = {
      key: 'main_paper_wallet',
      balanceUSD: 10000.0,
      initialDepositUSD: 10000.0,
      updatedAt: new Date().toISOString()
    };
    db.positions = [];
    writeDb(db);
    return db.wallet;
  },

  // POSITIONS
  getPositions: () => {
    const db = readDb();
    return db.positions || [];
  },
  addPosition: (pos) => {
    const db = readDb();
    if (!db.positions) db.positions = [];
    db.positions.push(pos);
    writeDb(db);
    return pos;
  },
  removePosition: (positionId) => {
    const db = readDb();
    if (!db.positions) db.positions = [];
    const removed = db.positions.find(p => p.positionId === positionId || p.id === positionId);
    db.positions = db.positions.filter(p => p.positionId !== positionId && p.id !== positionId);
    writeDb(db);
    return removed;
  },
  clearPositions: () => {
    const db = readDb();
    const count = db.positions ? db.positions.length : 0;
    db.positions = [];
    writeDb(db);
    return count;
  },

  // TRADES
  getTrades: (limit = 100) => {
    const db = readDb();
    const trades = db.trades || [];
    return trades.slice(-limit).reverse();
  },
  addTrade: (trade) => {
    const db = readDb();
    if (!db.trades) db.trades = [];
    const tradeItem = {
      id: trade.id || `TR_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      symbol: trade.symbol,
      type: trade.type,
      price: trade.price,
      amount: trade.amount,
      pnlUSD: trade.pnlUSD || 0,
      pnlPercent: trade.pnlPercent || 0,
      reason: trade.reason || '',
      executionMode: trade.executionMode || 'PAPER',
      time: trade.time || new Date().toLocaleTimeString(),
      timestamp: trade.timestamp || new Date().toISOString()
    };
    db.trades.push(tradeItem);
    if (db.trades.length > 500) db.trades.shift();
    writeDb(db);
    return tradeItem;
  },
  clearTrades: () => {
    const db = readDb();
    db.trades = [];
    writeDb(db);
  },

  // LOGS
  getLogs: (limit = 50) => {
    const db = readDb();
    const logs = db.logs || [];
    return logs.slice(-limit).reverse();
  },
  addLog: (tag, message) => {
    const db = readDb();
    if (!db.logs) db.logs = [];
    const logItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tag: tag || 'SYSTEM',
      message,
      time: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };
    db.logs.push(logItem);
    if (db.logs.length > 300) db.logs.shift();
    writeDb(db);
    return logItem;
  }
};
