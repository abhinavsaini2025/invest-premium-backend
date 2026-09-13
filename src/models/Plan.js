const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    planKey: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    investment: { type: Number, required: true, min: 1 },
    dailyIncome: { type: Number, required: true, min: 1 },
    durationDays: { type: Number, required: true, min: 1 },
    totalReturn: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
