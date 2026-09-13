const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Centralized error handler - the ONLY place that turns an error into an
// HTTP response. No controller/service should call res.json() on an error
// path directly; they throw (or next()) an ApiError and let this render it.
// This guarantees raw stack traces / driver errors never leak to a client.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    if (err.name === 'ValidationError') {
      apiError = ApiError.badRequest('Validation failed', err.errors);
    } else if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      apiError = ApiError.conflict(`${field} already in use`);
    } else if (err.name === 'CastError') {
      apiError = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
    } else {
      apiError = ApiError.internal(config.env === 'production' ? 'Something went wrong' : err.message);
    }
  }

  if (apiError.statusCode >= 500) {
    logger.error(err);
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(apiError.details ? { errors: apiError.details } : {}),
    ...(config.env !== 'production' && apiError.statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
