const mongoose = require('mongoose');

const rechargeRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['upi', 'card', 'netbanking'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    gatewayRef: { type: String, default: null }, // id returned by services/paymentGateway.js
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RechargeRequest', rechargeRequestSchema);
