const { z } = require('zod');

const createRechargeSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero').max(1000000),
  method: z.enum(['upi', 'card', 'netbanking']),
});

module.exports = { createRechargeSchema };
