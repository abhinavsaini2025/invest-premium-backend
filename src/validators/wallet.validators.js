const { z } = require('zod');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['credit', 'debit']).optional(),
  category: z.enum(['Recharge', 'Withdrawal', 'Plan Purchase', 'Daily Reward', 'Referral Bonus']).optional(),
});

module.exports = { paginationSchema };
