/**
 * Payment gateway abstraction layer.
 *
 * Every other file in this project (recharge/withdrawal controllers) talks
 * ONLY to the functions exported here - never to a gateway SDK directly.
 * Today RUPAYEX_API_KEY is unset, so every function below runs in mock mode
 * and simulates a realistic async gateway response. Once RupayEx credentials
 * are available, fill in the three `// TODO: RupayEx live call` blocks with
 * the real HTTP calls - no other file in the project needs to change.
 */
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

const isLive = Boolean(config.rupayEx.apiKey && config.rupayEx.apiBaseUrl);

function mockGatewayRef(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Called when a user submits a recharge (add-money) request.
 * Returns { gatewayRef, status, raw } describing the created payment order.
 */
async function initiateRecharge({ amount, method, userId }) {
  if (isLive) {
    // TODO: RupayEx live call - create a payment order via RupayEx's API
    // const res = await fetch(`${config.rupayEx.apiBaseUrl}/orders`, { ... });
  }

  logger.info(`[paymentGateway:mock] initiateRecharge amount=${amount} method=${method} user=${userId}`);
  return {
    gatewayRef: mockGatewayRef('RCH'),
    status: 'success', // mock gateways settle instantly; real ones you'd poll/webhook
    raw: { mock: true, amount, method },
  };
}

/**
 * Called when a user submits a withdrawal request. In mock mode this only
 * validates shape and returns a "pending" payout reference - real payout
 * confirmation still goes through the manual admin approval flow.
 */
async function initiatePayout({ amount, method, destination, userId }) {
  if (isLive) {
    // TODO: RupayEx live call - create a payout/transfer via RupayEx's API
    // const res = await fetch(`${config.rupayEx.apiBaseUrl}/payouts`, { ... });
  }

  logger.info(`[paymentGateway:mock] initiatePayout amount=${amount} method=${method} user=${userId}`);
  return {
    gatewayRef: mockGatewayRef('WD'),
    status: 'pending',
    raw: { mock: true, amount, method, destination },
  };
}

/**
 * Called by an admin action (or, on RupayEx, a webhook) to confirm a payout
 * actually landed in the user's account.
 */
async function confirmPayout({ gatewayRef }) {
  if (isLive) {
    // TODO: RupayEx live call - check payout status via RupayEx's API
  }

  logger.info(`[paymentGateway:mock] confirmPayout ref=${gatewayRef}`);
  return { gatewayRef, status: 'success', raw: { mock: true } };
}

module.exports = { isLive, initiateRecharge, initiatePayout, confirmPayout };
