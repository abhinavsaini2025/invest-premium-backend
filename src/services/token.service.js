const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseExpiryToMs(expiresIn) {
  // Supports jsonwebtoken-style strings like "30d", "15m", "12h".
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[match[2]];
  return value * unitMs;
}

/** Issues a new refresh token, storing only its hash (see RefreshToken model). */
async function issueRefreshToken(user, userAgent) {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + parseExpiryToMs(config.jwt.refreshExpiresIn));

  await RefreshToken.create({ user: user._id, tokenHash: hashToken(raw), expiresAt, userAgent: userAgent || null });
  return raw;
}

async function issueTokenPair(user, userAgent) {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user, userAgent);
  return { accessToken, refreshToken };
}

/** Verifies a refresh token against the DB, rotates it, and returns a fresh pair. */
async function rotateRefreshToken(rawToken, userAgent) {
  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash }).populate('user');

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  existing.revokedAt = new Date();

  const newRaw = crypto.randomBytes(48).toString('hex');
  const newExpiresAt = new Date(Date.now() + parseExpiryToMs(config.jwt.refreshExpiresIn));
  existing.replacedByHash = hashToken(newRaw);
  await existing.save();

  await RefreshToken.create({ user: existing.user._id, tokenHash: hashToken(newRaw), expiresAt: newExpiresAt, userAgent: userAgent || null });

  const accessToken = signAccessToken(existing.user);
  return { accessToken, refreshToken: newRaw, user: existing.user };
}

async function revokeRefreshToken(rawToken) {
  await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { $set: { revokedAt: new Date() } });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

module.exports = { issueTokenPair, rotateRefreshToken, revokeRefreshToken, verifyAccessToken };
