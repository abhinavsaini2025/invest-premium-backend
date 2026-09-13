const mongoose = require('mongoose');

// The wallet ledger. Every balance change - reward, purchase, recharge,
// withdrawal, referral bonus - gets one immutable row here with a
// before/after snapshot, so the balance is always independently auditable.
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
      type: String,
      enum: ['Recharge', 'Withdrawal', 'Plan Purchase', 'Daily Reward', 'Referral Bonus'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    previousBalance: { type: Number, required: true },
    updatedBalance: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Success', 'Rejected', 'Failed'], default: 'Success' },
    description: { type: String, default: '' },
    referenceId: { type: String, required: true, unique: true },

    // Optional pointer to the source document (ActivePlan, RechargeRequest, WithdrawalRequest...)
    relatedModel: { type: String, default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
