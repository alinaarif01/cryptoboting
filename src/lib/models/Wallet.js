import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
  key: { type: String, default: 'main_paper_wallet', unique: true },
  balanceUSD: { type: Number, default: 10000.00 },
  initialDepositUSD: { type: Number, default: 10000.00 }
}, { timestamps: true });

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
