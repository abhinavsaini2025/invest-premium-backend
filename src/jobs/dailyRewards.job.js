const cron = require('node-cron');
const ActivePlan = require('../models/ActivePlan');
const Notification = require('../models/Notification');
const walletService = require('../services/wallet.service');
const config = require('../config/env');
const logger = require('../utils/logger');

function getNextMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.business.rewardsTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const midnightUtc = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZone: config.business.rewardsTimezone,
    timeZoneName: 'longOffset',
  }).formatToParts(midnightUtc).find((part) => part.type === 'timeZoneName');
  const match = (offsetPart?.value || 'GMT').match(/GMT([+-])(\d{2}):?(\d{2})?/);
  const offsetMinutes = match
    ? (Number(match[2]) * 60 + Number(match[3] || 0)) * (match[1] === '-' ? -1 : 1)
    : 0;
  const nextMidnight = new Date(midnightUtc.getTime() - offsetMinutes * 60 * 1000);

  return nextMidnight > now
    ? nextMidnight
    : new Date(nextMidnight.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Pays out one day's reward for every active plan whose nextRewardAt has
 * passed. Runs at midnight in the configured timezone and finds anything
 * that fell due since the last run - so a missed/late run never skips a
 * payout, it just pays it a little late. Exported as a plain function so
 * the seed script / tests can also trigger it manually instead of waiting
 * for the schedule.
 */
async function runDailyRewards({ creditAllActive = false } = {}) {
  const dueePlans = await ActivePlan.find(
    creditAllActive
      ? { status: 'active' }
      : { status: 'active', nextRewardAt: { $lte: new Date() } },
  );

  if (dueePlans.length === 0) {
    logger.debug('Daily rewards job: nothing due');
    return { processed: 0 };
  }

  let processed = 0;

  for (const activePlan of dueePlans) {
    try {
      const { dailyIncome, durationDays, name } = activePlan.planSnapshot;

      await walletService.credit({
        userId: activePlan.user,
        amount: dailyIncome,
        category: 'Daily Reward',
        description: `${name} plan — day ${activePlan.daysCompleted + 1} reward`,
        referencePrefix: 'RWD',
        relatedModel: 'ActivePlan',
        relatedId: activePlan._id,
        extraWalletInc: { totalEarnings: dailyIncome },
      });

      activePlan.daysCompleted += 1;
      activePlan.totalCredited += dailyIncome;
      activePlan.lastRewardAt = new Date();

      if (activePlan.daysCompleted >= durationDays) {
        activePlan.status = 'completed';
        activePlan.completedAt = new Date();
      } else {
        activePlan.nextRewardAt = getNextMidnight();
      }

      await activePlan.save();

      await Notification.create({
        user: activePlan.user,
        type: 'reward',
        title: 'Daily reward credited',
        message: `You received ₹${dailyIncome} from your ${name} plan.`,
      });

      processed += 1;
    } catch (err) {
      // One plan's failure (e.g. a transient DB blip) should never stop the
      // rest of the batch from being paid.
      logger.error(`Daily rewards job failed for ActivePlan ${activePlan._id}`, err);
    }
  }

  logger.info(`Daily rewards job: credited ${processed}/${dueePlans.length} active plans`);
  return { processed };
}

/** Registers the daily rewards schedule at midnight in the configured timezone. */
function scheduleDailyRewards() {
  cron.schedule('0 0 * * *', () => {
    runDailyRewards({ creditAllActive: true }).catch((err) => logger.error('Daily rewards job crashed', err));
  }, { timezone: config.business.rewardsTimezone });
  logger.info(`Daily rewards cron job scheduled at midnight (${config.business.rewardsTimezone})`);
}

module.exports = { runDailyRewards, scheduleDailyRewards, getNextMidnight };
