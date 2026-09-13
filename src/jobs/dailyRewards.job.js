const cron = require('node-cron');
const ActivePlan = require('../models/ActivePlan');
const Notification = require('../models/Notification');
const walletService = require('../services/wallet.service');
const logger = require('../utils/logger');

/**
 * Pays out one day's reward for every active plan whose nextRewardAt has
 * passed. Runs hourly (cheap query when nothing is due) and finds anything
 * that fell due since the last run - so a missed/late run never skips a
 * payout, it just pays it a little late. Exported as a plain function so
 * the seed script / tests can also trigger it manually instead of waiting
 * for the schedule.
 */
async function runDailyRewards() {
  const dueePlans = await ActivePlan.find({ status: 'active', nextRewardAt: { $lte: new Date() } });

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
        activePlan.nextRewardAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
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

/** Registers the hourly cron schedule. Call once at server startup. */
function scheduleDailyRewards() {
  // Every hour, on the hour. Change to '0 0 * * *' for exactly-once-per-day at midnight.
  cron.schedule('0 * * * *', () => {
    runDailyRewards().catch((err) => logger.error('Daily rewards job crashed', err));
  });
  logger.info('Daily rewards cron job scheduled (hourly sweep for due plans)');
}

module.exports = { runDailyRewards, scheduleDailyRewards };
