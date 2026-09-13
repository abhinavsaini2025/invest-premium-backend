const dns = require('dns').promises;
const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

async function resolveSrvFallback(uri) {
  const parsed = new URL(uri);
  const resolver = new dns.Resolver();

  resolver.setServers(['1.1.1.1', '8.8.8.8']);

  const [records, txtRecords] = await Promise.all([
    resolver.resolveSrv(`_mongodb._tcp.${parsed.hostname}`),
    resolver.resolveTxt(parsed.hostname),
  ]);

  if (!records.length) {
    throw new Error(`No MongoDB SRV records found for ${parsed.hostname}`);
  }

  const options = new URLSearchParams(parsed.search);
  const txtOptions = txtRecords.flat().join('&');
  for (const [key, value] of new URLSearchParams(txtOptions)) {
    if (!options.has(key)) {
      options.set(key, value);
    }
  }
  options.set('tls', 'true');

  const credentials = parsed.username
    ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`
    : '';
  const hosts = records.map(({ name, port }) => `${name}:${port}`).join(',');
  const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '/investment_wallet';

  return `mongodb://${credentials}${hosts}${pathname}?${options.toString()}`;
}

async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.mongoUri);
  } catch (error) {
    if (error.code !== 'ECONNREFUSED' || !config.mongoUri.startsWith('mongodb+srv://')) {
      throw error;
    }

    logger.warn('MongoDB SRV lookup failed; retrying with a public DNS resolver');
    const fallbackUri = await resolveSrvFallback(config.mongoUri);
    await mongoose.connect(fallbackUri);
  }

  logger.info(`MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });
}

// Lets the rest of the app know whether this deployment's MongoDB is a
// replica set (Atlas always is) or a lone standalone instance, so wallet
// writes can use a real multi-document transaction when available and a
// safe sequential fallback when it isn't (see services/txnRunner.js).
function supportsTransactions() {
  const topology = mongoose.connection?.client?.topology;
  return Boolean(topology && topology.description && topology.description.type !== 'Single');
}

module.exports = { connectDB, supportsTransactions };
