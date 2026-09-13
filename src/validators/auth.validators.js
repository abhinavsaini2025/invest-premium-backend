const { z } = require('zod');

const mobile = z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits');
const password = z.string().min(6, 'Password must be at least 6 characters');

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is too short').max(100),
  mobile,
  password,
  securityQuestion: z.string().trim().min(5, 'Security question is too short').max(200),
  securityAnswer: z.string().trim().min(2, 'Security answer is too short').max(200),
  referralCode: z.string().trim().toUpperCase().optional(),
});

const loginSchema = z.object({
  mobile,
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({ mobile });

const resetPasswordSchema = z.object({
  mobile,
  securityAnswer: z.string().trim().min(1, 'Security answer is required').max(200),
  newPassword: password,
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: password,
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
};
