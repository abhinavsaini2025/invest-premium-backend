const ReferralEvent = require('../models/ReferralEvent');
const Notification = require('../models/Notification');
const walletService = require('./wallet.service');
const config = require('../config/env');
const logger = require('../utils/logger');

/** Called right after a new user is created with a valid referredBy. */
async function recordReferralSignup(referrerId, newUserId) {
  await ReferralEvent.create({ referrer: referrerId, referredUser: newUserId, status: 'registered' });
}

/**
 * Called whenever a user completes a plan purchase. If this is that user's
 * FIRST purchase and they were referred by someone, credits the referrer's
 * wallet and flips the referral event to "invested". Safe to call on every
 * purchase - it no-ops once the event is already marked invested.
 */
async function handleFirstInvestment(newUserId) {
  const event = await ReferralEvent.findOne({ referredUser: newUserId, status: 'registered' });
  if (!event) return;

  const rewardAmount = config.business.referralRewardAmount;

  const { transaction } = await walletService.credit({
    userId: event.referrer,
    amount: rewardAmount,
    category: 'Referral Bonus',
    description: 'Referral reward — your referral made their first investment',
    referencePrefix: 'REF',
    extraWalletInc: { totalEarnings: rewardAmount },
    relatedModel: 'ReferralEvent',
    relatedId: event._id,
  });

  event.status = 'invested';
  event.rewardAmount = rewardAmount;
  event.rewardCreditedAt = new Date();
  await event.save();

  await Notification.create({
    user: event.referrer,
    type: 'referral',
    title: 'Referral reward earned',
    message: `You earned ₹${rewardAmount} because someone you referred made their first investment.`,
  });

  logger.info(`Referral bonus credited: referrer=${event.referrer} amount=${rewardAmount} txn=${transaction.referenceId}`);
}

module.exports = { recordReferralSignup, handleFirstInvestment };
