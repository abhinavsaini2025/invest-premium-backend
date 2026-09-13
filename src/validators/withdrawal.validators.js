const { z } = require('zod');

const createWithdrawalSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  method: z.enum(['bank', 'upi']),
});

const updateWithdrawalStatusSchema = z.object({
  status: z.enum(['success', 'rejected']),
  rejectionReason: z.string().trim().max(300).optional(),
});

module.exports = { createWithdrawalSchema, updateWithdrawalStatusSchema };
