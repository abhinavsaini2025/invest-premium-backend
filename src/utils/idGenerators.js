const crypto = require('crypto');

// Short, human-readable reference IDs for ledger entries, e.g. RCH-9F3A2B1C.
function generateReference(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Referral codes derived from the user's name + a random suffix, e.g. ADITI4821.
function generateReferralCode(fullName) {
  const base = (fullName || 'USER')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'USER';
  const suffix = crypto.randomInt(1000, 9999);
  return `${base}${suffix}`;
}

function generateTicketId() {
  return `TCK-${crypto.randomInt(1000, 9999)}`;
}

module.exports = { generateReference, generateReferralCode, generateTicketId };