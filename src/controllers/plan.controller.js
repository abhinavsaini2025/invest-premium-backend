const Plan = require('../models/Plan');
const ActivePlan = require('../models/ActivePlan');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const walletService = require('../services/wallet.service');
const referralService = require('../services/referral.service');
const Notification = require('../models/Notification');
const { getNextMidnight } = require('../jobs/dailyRewards.job');

const DEFAULT_PLANS = [
  { planKey: 'starter', name: 'Starter', investment: 400, dailyIncome: 60, durationDays: 10, totalReturn: 600 },
  { planKey: 'silver', name: 'Silver', investment: 1200, dailyIncome: 100, durationDays: 18, totalReturn: 1800 },
  { planKey: 'gold', name: 'Gold', investment: 2800, dailyIncome: 150, durationDays: 30, totalReturn: 4500 },
  { planKey: 'platinum', name: 'Platinum', investment: 5600, dailyIncome: 320, durationDays: 25, totalReturn: 8000 },
  { planKey: 'diamond', name: 'Diamond', investment: 12000, dailyIncome: 700, durationDays: 24, totalReturn: 16800 },
];

// GET /plans
const listPlans = asyncHandler(async (req, res) => {
  let plans = await Plan.find({ isActive: true }).sort({ investment: 1 });
  if (plans.length === 0) {
    await Plan.bulkWrite(DEFAULT_PLANS.map((plan) => ({
      updateOne: {
        filter: { planKey: plan.planKey },
        update: { $setOnInsert: plan },
        upsert: true,
      },
    })));
    plans = await Plan.find({ isActive: true }).sort({ investment: 1 });
  }
  return new ApiResponse(200, { plans }).send(res);
});

// GET /plans/:planId  (planId = Mongo _id OR the human-readable planKey, e.g. "gold")
const getPlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const plan = await Plan.findOne(
    planId.match(/^[0-9a-fA-F]{24}$/) ? { _id: planId } : { planKey: planId.toLowerCase() }
  );
  if (!plan) throw ApiError.notFound('Plan not found');
  return new ApiResponse(200, { plan }).send(res);
});

// GET /plans/my/active
const myActivePlans = asyncHandler(async (req, res) => {
  const activePlans = await ActivePlan.find({ user: req.user.id }).sort({ createdAt: -1 }).populate('plan', 'name planKey');
  return new ApiResponse(200, { activePlans }).send(res);
});

// POST /plans/:planId/purchase
const purchasePlan = asyncHandler(async (req, res) => {
  const { planId } = req.params;
  const plan = await Plan.findOne(
    planId.match(/^[0-9a-fA-F]{24}$/) ? { _id: planId, isActive: true } : { planKey: planId.toLowerCase(), isActive: true }
  );
  if (!plan) throw ApiError.notFound('Plan not found or not currently available');

  const { transaction } = await walletService.debit({
    userId: req.user.id,
    amount: plan.investment,
    category: 'Plan Purchase',
    description: `Purchased ${plan.name} plan`,
    referencePrefix: 'PLN',
    extraWalletInc: { totalInvestment: plan.investment },
  });

  const nextRewardAt = getNextMidnight();

  const activePlan = await ActivePlan.create({
    user: req.user.id,
    plan: plan._id,
    planSnapshot: {
      planKey: plan.planKey,
      name: plan.name,
      investment: plan.investment,
      dailyIncome: plan.dailyIncome,
      durationDays: plan.durationDays,
      totalReturn: plan.totalReturn,
    },
    nextRewardAt,
  });

  transaction.relatedModel = 'ActivePlan';
  transaction.relatedId = activePlan._id;
  await transaction.save();

  await Notification.create({
    user: req.user.id,
    type: 'reward',
    title: `${plan.name} plan activated`,
    message: `You invested ₹${plan.investment} in the ${plan.name} plan. Daily rewards start within 24 hours.`,
  });

  // Fire-and-forget-safe: only credits the referrer on this user's first ever purchase.
  await referralService.handleFirstInvestment(req.user.id);

  return new ApiResponse(201, { activePlan, transaction }, `${plan.name} plan activated`).send(res);
});

module.exports = { listPlans, getPlan, myActivePlans, purchasePlan };
