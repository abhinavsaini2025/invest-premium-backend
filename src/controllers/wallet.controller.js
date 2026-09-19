const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const walletService = require('../services/wallet.service');

// GET /wallet/summary
const getSummary = asyncHandler(async (req, res) => {
  const wallet = await walletService.getOrCreateWallet(req.user.id);
  const walletObject = wallet.toObject ? wallet.toObject() : wallet;
  walletObject.withdrawableBalance = walletService.getWithdrawableBalance(walletObject);

  return new ApiResponse(200, { wallet: walletObject }).send(res);
});

// GET /wallet/ledger
const getLedger = asyncHandler(async (req, res) => {
  const { page, limit, type, category } = req.query;
  const filter = { user: req.user.id, ...(type && { type }), ...(category && { category }) };

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return new ApiResponse(200, { transactions: items }, 'Success', {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }).send(res);
});

module.exports = { getSummary, getLedger };
