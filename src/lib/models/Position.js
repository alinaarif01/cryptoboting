import mongoose from 'mongoose';

const PositionSchema = new mongoose.Schema({
  positionId: { type: String, required: true, unique: true },
  symbol: { type: String, required: true },
  side: { type: String, default: 'BUY' },
  entryPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  costUSD: { type: Number, required: true },
  stopLoss: { type: Number },
  takeProfit: { type: Number },
  executionMode: { type: String, default: 'PAPER' }
}, { timestamps: true });

export default mongoose.models.Position || mongoose.model('Position', PositionSchema);
