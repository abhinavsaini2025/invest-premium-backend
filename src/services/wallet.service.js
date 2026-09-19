const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');
const { generateReference } = require('../utils/idGenerators');
const { runInTransaction } = require('./txnRunner');

/**
 * Credits a wallet and writes the matching ledger row atomically.
 * `extra` can carry totalEarnings / totalInvestment increments, and
 * relatedModel/relatedId to point the ledger row at its source document.
 */
async function credit({ userId, amount, category, description, referencePrefix, relatedModel, relatedId, extraWalletInc = {} }) {
  if (amount <= 0) throw ApiError.badRequest('Credit amount must be greater than zero');

  return runInTransaction(async (session) => {
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      { $inc: { availableBalance: amount, ...extraWalletInc } },
      { new: true, session }
    );
    if (!wallet) throw ApiError.notFound('Wallet not found for user');

    const previousBalance = wallet.availableBalance - amount;

    const [transaction] = await Transaction.create(
      [
        {
          user: userId,
          type: 'credit',
          category,
          amount,
          previousBalance,
          updatedBalance: wallet.availableBalance,
          status: 'Success',
          description,
          referenceId: generateReference(referencePrefix),
          relatedModel: relatedModel || null,
          relatedId: relatedId || null,
        },
      ],
      { session }
    );

    return { wallet, transaction };
  });
}

/**
 * Debits a wallet only if sufficient balance is available. The balance check
 * and the decrement happen in one atomic findOneAndUpdate (availableBalance
 * >= amount in the query filter), so two concurrent requests can never both
 * succeed against a balance that only covers one of them.
 */
async function debit({ userId, amount, category, description, referencePrefix, status = 'Success', relatedModel, relatedId, extraWalletInc = {} }) {
  if (amount <= 0) throw ApiError.badRequest('Debit amount must be greater than zero');

  return runInTransaction(async (session) => {
    const wallet = await Wallet.findOneAndUpdate(
      { user: userId, availableBalance: { $gte: amount } },
      { $inc: { availableBalance: -amount, ...extraWalletInc } },
      { new: true, session }
    );
    if (!wallet) throw ApiError.badRequest('Insufficient wallet balance');

    const previousBalance = wallet.availableBalance + amount;

    const [transaction] = await Transaction.create(
      [
        {
          user: userId,
          type: 'debit',
          category,
          amount,
          previousBalance,
          updatedBalance: wallet.availableBalance,
          status,
          description,
          referenceId: generateReference(referencePrefix),
          relatedModel: relatedModel || null,
          relatedId: relatedId || null,
        },
      ],
      { session }
    );

    return { wallet, transaction };
  });
}

function getWithdrawableBalance(wallet = {}) {
  const totalEarnings = Number(wallet.totalEarnings || 0);
  const totalWithdrawn = Number(wallet.totalWithdrawn || 0);

  return Math.max(totalEarnings - totalWithdrawn, 0);
}

function getRequestableWithdrawalBalance(wallet = {}) {
  const pendingWithdrawal = Number(wallet.pendingWithdrawal || 0);

  return Math.max(getWithdrawableBalance(wallet) - pendingWithdrawal, 0);
}

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

module.exports = {
  credit,
  debit,
  getOrCreateWallet,
  getWithdrawableBalance,
  getRequestableWithdrawalBalance,
};
