const mongoose = require('mongoose');
const { supportsTransactions } = require('../config/db');
const logger = require('../utils/logger');

// Runs `fn(session)` inside a real MongoDB session/transaction when the
// connected server is a replica set (Atlas free tier included). Falls back
// to running `fn(null)` without a session on a bare standalone MongoDB,
// which is the common local free setup. Either way the wallet balance
// update itself stays a single atomic document write (see wallet.service.js),
// so money is never lost - the transaction just also gives us all-or-nothing
// rollback across the wallet + ledger + side-effect writes when it's available.
async function runInTransaction(fn) {
  if (!supportsTransactions()) {
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    logger.warn('Transaction failed, this MongoDB deployment may not support transactions', err.message);
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { runInTransaction };
