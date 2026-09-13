const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

// Keyed by mobile number when present (falls back to IP) so the limit tracks
// the account being attacked/spammed, not just the caller's network address.
const keyByMobileOrIp = (req) => req.body?.mobile || req.ip;

const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: config.rateLimits.loginMax,
  keyGenerator: keyByMobileOrIp,
});

const authActionLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: config.rateLimits.authActionMax,
  keyGenerator: keyByMobileOrIp,
});

const withdrawLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  max: config.rateLimits.withdrawMax,
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = { loginLimiter, authActionLimiter, withdrawLimiter };
