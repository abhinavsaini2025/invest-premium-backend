/**
 * Seeds demo data so you can start testing immediately after `npm install`:
 *   npm run seed
 *
 * Creates:
 *  - The 5 investment plans (Starter -> Diamond)
 *  - A demo user  (mobile 9876543210 / password Demo@123, pre-verified)
 *  - A referred demo user (mobile 9876500000 / password Demo@123) who already
 *    invested, so the main demo user has a real referral bonus in their ledger
 *  - A wallet with a starting balance, a couple of transactions, one active
 *    plan, a support ticket and a few notifications
 *
 * Safe to re-run: it wipes and recreates its own demo documents each time.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');
const { connectDB } = require('../src/config/db');

const User = require('../src/models/User');
const Wallet = require('../src/models/Wallet');
const Transaction = require('../src/models/Transaction');
const Plan = require('../src/models/Plan');
const ActivePlan = require('../src/models/ActivePlan');
const ReferralEvent = require('../src/models/ReferralEvent');
const Ticket = require('../src/models/Ticket');
const Notification = require('../src/models/Notification');

const PLANS = [
  { planKey: 'starter', name: 'Starter', investment: 400, dailyIncome: 60, durationDays: 10, totalReturn: 600 },
  { planKey: 'silver', name: 'Silver', investment: 1200, dailyIncome: 100, durationDays: 18, totalReturn: 1800 },
  { planKey: 'gold', name: 'Gold', investment: 2800, dailyIncome: 150, durationDays: 30, totalReturn: 4500 },
  { planKey: 'platinum', name: 'Platinum', investment: 5600, dailyIncome: 320, durationDays: 25, totalReturn: 8000 },
  { planKey: 'diamond', name: 'Diamond', investment: 12000, dailyIncome: 700, durationDays: 24, totalReturn: 16800 },
];

const DEMO_MOBILE = '9876543210';
const REFERRED_MOBILE = '9876500000';
const DEMO_PASSWORD = 'Demo@123';

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');

  // ---- Plans (upsert so re-running doesn't duplicate) ----
  for (const p of PLANS) {
    await Plan.findOneAndUpdate({ planKey: p.planKey }, p, { upsert: true, new: true });
  }
  console.log(`Seeded ${PLANS.length} plans`);

  // ---- Clean slate for demo users only ----
  const existingDemoUsers = await User.find({ mobile: { $in: [DEMO_MOBILE, REFERRED_MOBILE] } });
  const demoUserIds = existingDemoUsers.map((u) => u._id);
  await Promise.all([
    User.deleteMany({ _id: { $in: demoUserIds } }),
    Wallet.deleteMany({ user: { $in: demoUserIds } }),
    Transaction.deleteMany({ user: { $in: demoUserIds } }),
    ActivePlan.deleteMany({ user: { $in: demoUserIds } }),
    ReferralEvent.deleteMany({ $or: [{ referrer: { $in: demoUserIds } }, { referredUser: { $in: demoUserIds } }] }),
    Ticket.deleteMany({ user: { $in: demoUserIds } }),
    Notification.deleteMany({ user: { $in: demoUserIds } }),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const securityAnswerHash = await bcrypt.hash('mumbai', 12); // answer is lowercased+trimmed before hashing, see auth.controller.js

  // ---- Main demo user ----
  const demoUser = await User.create({
    fullName: 'Aditi Sharma',
    mobile: DEMO_MOBILE,
    passwordHash,
    securityQuestion: 'What city were you born in?',
    securityAnswerHash,
    referralCode: 'ADITI482',
    isVerified: true,
    bank: { accountHolder: 'Aditi Sharma', accountNumber: '', ifsc: '', upiId: 'aditi@okhdfc' },
  });
  const demoWallet = await Wallet.create({
    user: demoUser._id,
    availableBalance: 2140,
    totalEarnings: 3260,
    totalInvestment: 4000,
    totalWithdrawn: 1000,
    pendingWithdrawal: 0,
  });

  const silverPlan = await Plan.findOne({ planKey: 'silver' });
  const starterPlan = await Plan.findOne({ planKey: 'starter' });

  await ActivePlan.create({
    user: demoUser._id,
    plan: silverPlan._id,
    planSnapshot: silverPlan.toObject(),
    purchasedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    daysCompleted: 12,
    totalCredited: 12 * silverPlan.dailyIncome,
    nextRewardAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    status: 'active',
  });

  await Transaction.insertMany([
    { user: demoUser._id, type: 'debit', category: 'Plan Purchase', amount: silverPlan.investment, previousBalance: 2480 + silverPlan.investment, updatedBalance: 2480, status: 'Success', description: 'Purchased Silver plan', referenceId: 'PLN-SEED01' },
    { user: demoUser._id, type: 'credit', category: 'Recharge', amount: 2000, previousBalance: 1280, updatedBalance: 3280, status: 'Success', description: 'Wallet recharge via UPI', referenceId: 'RCH-SEED01' },
    { user: demoUser._id, type: 'credit', category: 'Daily Reward', amount: 100, previousBalance: 2040, updatedBalance: 2140, status: 'Success', description: 'Silver plan — day 12 reward', referenceId: 'RWD-SEED01' },
  ]);

  await Ticket.create({
    ticketId: 'TCK-2210',
    user: demoUser._id,
    subject: 'Withdrawal is still pending',
    status: 'In Progress',
    messages: [
      { sender: 'user', text: 'I requested a withdrawal of ₹1000 three days ago and it still shows pending.' },
      { sender: 'support', text: 'Thanks for reaching out — withdrawals are manually reviewed and can take up to 48 hours.' },
    ],
  });

  await Notification.insertMany([
    { user: demoUser._id, type: 'reward', title: 'Daily reward credited', message: 'You received ₹100 from your Silver plan.', read: false },
    { user: demoUser._id, type: 'promo', title: 'Diamond plan is live', message: 'Invest ₹12,000 and earn ₹700 a day for 24 days.', read: true },
  ]);

  // ---- Referred demo user (already invested, so demoUser has a referral bonus to see) ----
  const referredUser = await User.create({
    fullName: 'Rohit Kumar',
    mobile: REFERRED_MOBILE,
    passwordHash,
    securityQuestion: 'What was the name of your first pet?',
    securityAnswerHash: await bcrypt.hash('tommy', 12),
    referralCode: 'ROHIT991',
    referredBy: demoUser._id,
    isVerified: true,
  });
  await Wallet.create({ user: referredUser._id, availableBalance: 0, totalInvestment: starterPlan.investment });

  await ReferralEvent.create({
    referrer: demoUser._id,
    referredUser: referredUser._id,
    status: 'invested',
    rewardAmount: config.business.referralRewardAmount,
    rewardCreditedAt: new Date(),
  });

  await Wallet.updateOne({ user: demoUser._id }, { $inc: { availableBalance: config.business.referralRewardAmount, totalEarnings: config.business.referralRewardAmount } });
  await Transaction.create({
    user: demoUser._id,
    type: 'credit',
    category: 'Referral Bonus',
    amount: config.business.referralRewardAmount,
    previousBalance: 2140,
    updatedBalance: 2140 + config.business.referralRewardAmount,
    status: 'Success',
    description: 'Referral reward — Rohit K. invested',
    referenceId: 'REF-SEED01',
  });

  console.log('\nSeed complete. Demo login credentials:');
  console.log(`  Mobile:   ${DEMO_MOBILE}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Security question: "What city were you born in?" -> answer: mumbai\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
