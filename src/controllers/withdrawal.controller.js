const WithdrawalRequest = require('../models/WithdrawalRequest');
const Wallet = require('../models/Wallet');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const config = require('../config/env');
const paymentGateway = require('../services/paymentGateway');
const walletService = require('../services/wallet.service');

// POST /withdraw
const createWithdrawal = asyncHandler(async (req, res) => {
  const { amount, method } = req.body;

  if (amount < config.business.minWithdrawalAmount) {
    throw ApiError.badRequest(`Minimum withdrawal amount is ₹${config.business.minWithdrawalAmount}`);
  }

  const destinationSnapshot = method === 'bank'
    ? { accountHolder: req.user.bank.accountHolder, accountNumber: req.user.bank.accountNumber, ifsc: req.user.bank.ifsc }
    : { upiId: req.user.bank.upiId };

  if (method === 'bank' && !destinationSnapshot.accountNumber) {
    throw ApiError.badRequest('Add your bank account details before requesting a bank withdrawal');
  }
  if (method === 'upi' && !destinationSnapshot.upiId) {
    throw ApiError.badRequest('Add your UPI ID before requesting a UPI withdrawal');
  }

  // Debit happens immediately (server-side validated amount) and the ledger
  // entry is written as "Pending" - money leaves the available balance right
  // away but only becomes a confirmed payout once an admin/gateway confirms it.
  const { transaction } = await walletService.debit({
    userId: req.user.id,
    amount,
    category: 'Withdrawal',
    description: `Withdrawal request via ${method.toUpperCase()}`,
    referencePrefix: 'WD',
    status: 'Pending',
    extraWalletInc: { pendingWithdrawal: amount },
  });

  const gatewayResult = await paymentGateway.initiatePayout({ amount, method, destination: destinationSnapshot, userId: req.user.id });

  const withdrawalRequest = await WithdrawalRequest.create({
    user: req.user.id,
    amount,
    method,
    destinationSnapshot,
    gatewayRef: gatewayResult.gatewayRef,
    transaction: transaction._id,
  });

  transaction.relatedModel = 'WithdrawalRequest';
  transaction.relatedId = withdrawalRequest._id;
  await transaction.save();

  await Notification.create({
    user: req.user.id,
    type: 'withdrawal',
    title: 'Withdrawal requested',
    message: `Your withdrawal of ₹${amount} is pending review and typically clears within 48 hours.`,
  });

  return new ApiResponse(201, { withdrawalRequest, transaction }, 'Withdrawal requested — pending review').send(res);
});

// GET /withdraw
const listWithdrawals = asyncHandler(async (req, res) => {
  const withdrawalRequests = await WithdrawalRequest.find({ user: req.user.id }).sort({ createdAt: -1 });
  return new ApiResponse(200, { withdrawalRequests }).send(res);
});

// PATCH /withdraw/:id/status  (admin only) - approve or reject a pending withdrawal
const updateWithdrawalStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  const withdrawalRequest = await WithdrawalRequest.findById(id);
  if (!withdrawalRequest) throw ApiError.notFound('Withdrawal request not found');
  if (withdrawalRequest.status !== 'pending') throw ApiError.badRequest('This withdrawal has already been processed');

  const Transaction = require('../models/Transaction');
  const transaction = await Transaction.findById(withdrawalRequest.transaction);

  if (status === 'success') {
    await paymentGateway.confirmPayout({ gatewayRef: withdrawalRequest.gatewayRef });

    await Wallet.updateOne(
      { user: withdrawalRequest.user },
      { $inc: { pendingWithdrawal: -withdrawalRequest.amount, totalWithdrawn: withdrawalRequest.amount } }
    );
    if (transaction) {
      transaction.status = 'Success';
      await transaction.save();
    }
  } else {
    // Rejected -> refund the amount back into the available balance.
    await walletService.credit({
      userId: withdrawalRequest.user,
      amount: withdrawalRequest.amount,
      category: 'Withdrawal',
      description: `Withdrawal ${withdrawalRequest._id} rejected — amount refunded`,
      referencePrefix: 'RFD',
      extraWalletInc: { pendingWithdrawal: -withdrawalRequest.amount },
    });
    if (transaction) {
      transaction.status = 'Rejected';
      await transaction.save();
    }
  }

  withdrawalRequest.status = status;
  withdrawalRequest.rejectionReason = status === 'rejected' ? rejectionReason || 'Not specified' : null;
  withdrawalRequest.processedAt = new Date();
  withdrawalRequest.processedBy = req.user.id;
  await withdrawalRequest.save();

  await Notification.create({
    user: withdrawalRequest.user,
    type: 'withdrawal',
    title: status === 'success' ? 'Withdrawal successful' : 'Withdrawal rejected',
    message: status === 'success'
      ? `₹${withdrawalRequest.amount} has been sent to your ${withdrawalRequest.method === 'bank' ? 'bank account' : 'UPI'}.`
      : `Your withdrawal of ₹${withdrawalRequest.amount} was rejected and refunded to your wallet.`,
  });

  return new ApiResponse(200, { withdrawalRequest }, `Withdrawal marked as ${status}`).send(res);
});

module.exports = { createWithdrawal, listWithdrawals, updateWithdrawalStatus };
