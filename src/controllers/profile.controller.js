const path = require('path');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { maskAccountNumber, maskIfsc } = require('../utils/mask');

function presentUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
}

function presentBank(bank) {
  if (!bank) return bank;
  return {
    accountHolder: bank.accountHolder,
    accountNumber: maskAccountNumber(bank.accountNumber),
    ifsc: maskIfsc(bank.ifsc),
    upiId: bank.upiId,
  };
}

// GET /profile
const getProfile = asyncHandler(async (req, res) => {
  const user = presentUser(req.user);
  user.bank = presentBank(user.bank);
  return new ApiResponse(200, { user }).send(res);
});

// PATCH /profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, { $set: req.body }, { new: true, runValidators: true });
  const out = presentUser(user);
  out.bank = presentBank(out.bank);
  return new ApiResponse(200, { user: out }, 'Profile updated').send(res);
});

// POST /profile/photo
const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No photo file uploaded (field name must be "photo")');

  const relativePath = path.posix.join('/uploads/profile-photos', req.file.filename);
  const user = await User.findByIdAndUpdate(req.user.id, { profilePhoto: relativePath }, { new: true });

  return new ApiResponse(200, { profilePhoto: user.profilePhoto }, 'Profile photo updated').send(res);
});

// GET /profile/bank
const getBank = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { bank: presentBank(req.user.bank) }).send(res);
});

// PUT /profile/bank
const updateBank = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: Object.fromEntries(Object.entries(req.body).map(([k, v]) => [`bank.${k}`, v])) },
    { new: true, runValidators: true }
  );
  return new ApiResponse(200, { bank: presentBank(user.bank) }, 'Bank details updated').send(res);
});

// PATCH /profile/notification-settings
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: Object.fromEntries(Object.entries(req.body).map(([k, v]) => [`notificationSettings.${k}`, v])) },
    { new: true, runValidators: true }
  );
  return new ApiResponse(200, { notificationSettings: user.notificationSettings }, 'Notification settings updated').send(res);
});

module.exports = { getProfile, updateProfile, uploadPhoto, getBank, updateBank, updateNotificationSettings };
