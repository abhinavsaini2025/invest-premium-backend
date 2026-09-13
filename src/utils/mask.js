// Sensitive-field masking helpers used before data ever leaves the API.
function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  const str = String(accountNumber);
  if (str.length <= 4) return '*'.repeat(str.length);
  return '*'.repeat(str.length - 4) + str.slice(-4);
}

function maskIfsc(ifsc) {
  if (!ifsc) return '';
  const str = String(ifsc);
  if (str.length <= 4) return str;
  return str.slice(0, 4) + '*'.repeat(str.length - 4);
}

function maskUpi(upiId) {
  if (!upiId || !upiId.includes('@')) return upiId || '';
  const [name, handle] = upiId.split('@');
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 1))}@${handle}`;
}

function maskMobile(mobile) {
  if (!mobile) return '';
  const str = String(mobile);
  if (str.length <= 4) return str;
  return '*'.repeat(str.length - 4) + str.slice(-4);
}

module.exports = { maskAccountNumber, maskIfsc, maskUpi, maskMobile };
