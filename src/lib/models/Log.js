import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  tag: { type: String, default: 'SYSTEM' },
  message: { type: String, required: true },
  time: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Log || mongoose.model('Log', LogSchema);
