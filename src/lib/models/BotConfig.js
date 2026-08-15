import mongoose from 'mongoose';

const BotConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'main_bot_config', unique: true },
  status: { type: String, default: 'STOPPED' },
  symbol: { type: String, default: 'BTCUSDT' },
  activeStrategy: { type: String, default: 'RSI' },
  executionMode: { type: String, default: 'PAPER' },
  config: {
    rsiOversold: { type: Number, default: 30 },
    rsiOverbought: { type: Number, default: 70 },
    rsiPeriod: { type: Number, default: 14 },
    gridLower: { type: Number, default: 60000 },
    gridUpper: { type: Number, default: 70000 },
    gridLevels: { type: Number, default: 5 },
    stopLossPercent: { type: Number, default: 3.0 },
    takeProfitPercent: { type: Number, default: 6.0 },
    tradeAllocationUSD: { type: Number, default: 1000 }
  },
  exchangeConfig: {
    exchange: { type: String, default: 'BINANCE' },
    marketType: { type: String, default: 'SPOT' },
    apiKey: { type: String, default: '' },
    apiSecret: { type: String, default: '' },
    isTestnet: { type: Boolean, default: true },
    isConnected: { type: Boolean, default: false }
  }
}, { timestamps: true });

export default mongoose.models.BotConfig || mongoose.model('BotConfig', BotConfigSchema);
