const mongoose = require('mongoose');

// One row per person a user has referred. Created with status "registered"
// the moment the referred person signs up; flipped to "invested" (and the
// reward transaction fired) the moment that person buys their first plan.
const referralEventSchema = new mongoose.Schema(
  {
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['registered', 'invested'], default: 'registered' },
    rewardAmount: { type: Number, default: 0 },
    rewardCreditedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralEvent', referralEventSchema);
