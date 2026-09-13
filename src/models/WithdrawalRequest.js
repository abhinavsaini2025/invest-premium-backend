const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['bank', 'upi'], required: true },
    destinationSnapshot: { type: mongoose.Schema.Types.Mixed, default: null }, // bank/UPI details at request time
    status: { type: String, enum: ['pending', 'success', 'rejected'], default: 'pending', index: true },
    rejectionReason: { type: String, default: null },
    gatewayRef: { type: String, default: null },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    processedAt: { type: Date, default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
