const RechargeRequest = require('../models/RechargeRequest');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const paymentGateway = require('../services/paymentGateway');
const walletService = require('../services/wallet.service');

// POST /recharge  - creates the request AND (mock gateway settles instantly) credits the wallet
const createRecharge = asyncHandler(async (req, res) => {
  const { amount, method } = req.body;

  const rechargeRequest = await RechargeRequest.create({ user: req.user.id, amount, method });

  const gatewayResult = await paymentGateway.initiateRecharge({ amount, method, userId: req.user.id });

  rechargeRequest.gatewayRef = gatewayResult.gatewayRef;
  rechargeRequest.gatewayResponse = gatewayResult.raw;

  if (gatewayResult.status === 'success') {
    const { transaction } = await walletService.credit({
      userId: req.user.id,
      amount,
      category: 'Recharge',
      description: `Wallet recharge via ${method.toUpperCase()}`,
      referencePrefix: 'RCH',
      relatedModel: 'RechargeRequest',
      relatedId: rechargeRequest._id,
    });

    rechargeRequest.status = 'success';
    rechargeRequest.transaction = transaction._id;
    await rechargeRequest.save();

    await Notification.create({
      user: req.user.id,
      type: 'recharge',
      title: 'Wallet recharged',
      message: `₹${amount} was added to your wallet via ${method.toUpperCase()}.`,
    });

    return new ApiResponse(201, { rechargeRequest, transaction }, 'Recharge successful').send(res);
  }

  rechargeRequest.status = 'failed';
  await rechargeRequest.save();
  throw ApiError.badRequest('Recharge failed at the payment gateway. Please try again.');
});

// GET /recharge
const listRecharges = asyncHandler(async (req, res) => {
  const rechargeRequests = await RechargeRequest.find({ user: req.user.id }).sort({ createdAt: -1 });
  return new ApiResponse(200, { rechargeRequests }).send(res);
});

module.exports = { createRecharge, listRecharges };
