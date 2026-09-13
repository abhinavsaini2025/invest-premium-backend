const mongoose = require('mongoose');

// One row per plan purchase. The daily-rewards cron job (jobs/dailyRewards.job.js)
// scans for status 'active' rows whose nextRewardAt has passed.
const activePlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },

    // Snapshot of the plan's terms at purchase time, so a later admin edit to
    // the Plan document never changes what an already-purchased plan pays out.
    planSnapshot: {
      planKey: String,
      name: String,
      investment: Number,
      dailyIncome: Number,
      durationDays: Number,
      totalReturn: Number,
    },

    purchasedAt: { type: Date, default: Date.now },
    daysCompleted: { type: Number, default: 0 },
    totalCredited: { type: Number, default: 0 },
    lastRewardAt: { type: Date, default: null },
    nextRewardAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivePlan', activePlanSchema);
