const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema(
  {
    accountHolder: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' }, // stored plain, masked at the response layer (utils/mask.js)
    ifsc: { type: String, trim: true, uppercase: true, default: '' },
    upiId: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const notificationSettingsSchema = new mongoose.Schema(
  {
    rewards: { type: Boolean, default: true },
    withdrawals: { type: Boolean, default: true },
    referrals: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits'],
    },
    email: { type: String, trim: true, lowercase: true, default: null },
    passwordHash: { type: String, required: true, select: false },

    // Used for the security-question password recovery flow: the question is shown back
    // to the user; the answer is hashed with bcrypt exactly like the
    // password and is never stored or returned in plain text.
    securityQuestion: { type: String, required: true },
    securityAnswerHash: { type: String, required: true, select: false },

    referralCode: { type: String, required: true, unique: true, uppercase: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    profilePhoto: { type: String, default: null }, // relative /uploads path

    bank: { type: bankSchema, default: () => ({}) },
    notificationSettings: { type: notificationSettingsSchema, default: () => ({}) },

    // Kept for future admin/KYC-style verification flows.
    isVerified: { type: Boolean, default: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// `unique: true` on the fields above already creates these indexes -
// no separate schema.index() calls needed (and duplicating them just
// triggers noisy Mongoose warnings at startup).

module.exports = mongoose.model('User', userSchema);