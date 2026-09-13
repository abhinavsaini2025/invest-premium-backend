const { z } = require('zod');

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

const updateBankSchema = z.object({
  accountHolder: z.string().trim().min(2).max(100).optional(),
  accountNumber: z.string().trim().regex(/^[0-9]{9,18}$/, 'Account number must be 9-18 digits').optional(),
  ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional(),
  upiId: z.string().trim().regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, 'Invalid UPI ID').optional(),
});

const notificationSettingsSchema = z.object({
  rewards: z.boolean().optional(),
  withdrawals: z.boolean().optional(),
  referrals: z.boolean().optional(),
  promotions: z.boolean().optional(),
});

module.exports = { updateProfileSchema, updateBankSchema, notificationSettingsSchema };
