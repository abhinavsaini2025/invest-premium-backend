const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const tokenService = require('../services/token.service');
const referralService = require('../services/referral.service');
const { generateReferralCode } = require('../utils/idGenerators');

const SALT_ROUNDS = 12;

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const {
    fullName, mobile, password, securityQuestion, securityAnswer, referralCode,
  } = req.body;

  const existing = await User.findOne({ mobile });
  if (existing) throw ApiError.conflict('An account with this mobile number already exists');

  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (!referrer) throw ApiError.badRequest('Invalid referral code');
    referredBy = referrer._id;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), SALT_ROUNDS);

  let code = generateReferralCode(fullName);
  // Extremely unlikely, but guard against a random collision anyway.
  while (await User.findOne({ referralCode: code })) {
    code = generateReferralCode(fullName);
  }

  const user = await User.create({
    fullName,
    mobile,
    passwordHash,
    securityQuestion,
    securityAnswerHash,
    referralCode: code,
    referredBy,
    isVerified: true,
  });

  await Wallet.create({ user: user._id });

  if (referredBy) {
    await referralService.recordReferralSignup(referredBy, user._id);
  }

  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await tokenService.issueTokenPair(user, req.headers['user-agent']);

  return new ApiResponse(
    201,
    { user: sanitizeUser(user), ...tokens },
    'Registration successful'
  ).send(res);
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;

  const user = await User.findOne({ mobile }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid mobile number or password');

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) throw ApiError.unauthorized('Invalid mobile number or password');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await tokenService.issueTokenPair(user, req.headers['user-agent']);

  return new ApiResponse(200, { user: sanitizeUser(user), ...tokens }, 'Login successful').send(res);
});

// POST /auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  const user = await User.findOne({ mobile });
  if (!user) {
    return new ApiResponse(200, { securityQuestion: null }, 'If that mobile number is registered, a security question is available.').send(res);
  }

  return new ApiResponse(
    200,
    { securityQuestion: user.securityQuestion },
    'Security question retrieved'
  ).send(res);
});

// POST /auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { mobile, securityAnswer, newPassword } = req.body;
  const user = await User.findOne({ mobile }).select('+securityAnswerHash');
  if (!user) throw ApiError.notFound('User not found');

  const answerOk = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.securityAnswerHash);
  if (!answerOk) throw ApiError.badRequest('Incorrect security answer');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  return new ApiResponse(200, null, 'Password has been reset. Please log in with your new password.').send(res);
});

// POST /auth/change-password (protected)
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+passwordHash');
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('Old password is incorrect');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  return new ApiResponse(200, null, 'Password changed successfully').send(res);
});

// POST /auth/refresh-token
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: rawToken } = req.body;

  try {
    const result = await tokenService.rotateRefreshToken(rawToken, req.headers['user-agent']);
    return new ApiResponse(200, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Token refreshed').send(res);
  } catch (err) {
    throw ApiError.unauthorized(err.message);
  }
});

// POST /auth/logout (protected)
const logout = asyncHandler(async (req, res) => {
  const { refreshToken: rawToken } = req.body;
  if (rawToken) await tokenService.revokeRefreshToken(rawToken);
  return new ApiResponse(200, null, 'Logged out').send(res);
});

// GET /auth/me (protected) - handy for Postman sanity checks
const me = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { user: sanitizeUser(req.user) }).send(res);
});

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  me,
};
