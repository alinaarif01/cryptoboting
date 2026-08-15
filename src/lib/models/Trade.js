import mongoose from 'mongoose';

const TradeSchema = new mongoose.Schema({
  tradeId: { type: String, required: true, unique: true },
  symbol: { type: String, required: true },
  type: { type: String, required: true }, // 'BUY' or 'SELL'
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  pnlUSD: { type: Number, default: 0 },
  pnlPercent: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  executionMode: { type: String, default: 'PAPER' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Trade || mongoose.model('Trade', TradeSchema);
