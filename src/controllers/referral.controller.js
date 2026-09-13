const ReferralEvent = require('../models/ReferralEvent');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const config = require('../config/env');

// GET /referral/summary
const getSummary = asyncHandler(async (req, res) => {
  const [totalInvited, registered, invested, earningsAgg] = await Promise.all([
    ReferralEvent.countDocuments({ referrer: req.user.id }),
    ReferralEvent.countDocuments({ referrer: req.user.id, status: 'registered' }),
    ReferralEvent.countDocuments({ referrer: req.user.id, status: 'invested' }),
    ReferralEvent.aggregate([
      { $match: { referrer: req.user._id, status: 'invested' } },
      { $group: { _id: null, total: { $sum: '$rewardAmount' } } },
    ]),
  ]);

  return new ApiResponse(200, {
    code: req.user.referralCode,
    rewardPerReferral: config.business.referralRewardAmount,
    totalInvited,
    registered,
    firstInvestmentMade: invested,
    totalEarnings: earningsAgg[0]?.total || 0,
  }).send(res);
});

// GET /referral/history
const getHistory = asyncHandler(async (req, res) => {
  const events = await ReferralEvent.find({ referrer: req.user.id })
    .sort({ createdAt: -1 })
    .populate('referredUser', 'fullName createdAt');

  const history = events.map((e) => ({
    id: e._id,
    name: e.referredUser?.fullName || 'Unknown user',
    status: e.status === 'invested' ? 'Invested' : 'Registered',
    reward: e.rewardAmount,
    date: e.createdAt,
  }));

  return new ApiResponse(200, { history }).send(res);
});

module.exports = { getSummary, getHistory };
