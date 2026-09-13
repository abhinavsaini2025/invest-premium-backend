const ApiError = require('../utils/ApiError');

/**
 * Validates req.body / req.query / req.params against a Zod schema map,
 * e.g. validate({ body: registerSchema }). Replaces the field with the
 * parsed (and type-coerced/defaulted) value on success.
 */
const validate = (schemas) => (req, res, next) => {
  try {
    for (const key of ['body', 'query', 'params']) {
      if (schemas[key]) {
        req[key] = schemas[key].parse(req[key]);
      }
    }
    next();
  } catch (err) {
    const details = err.errors?.map((e) => ({ path: e.path.join('.'), message: e.message })) || err.message;
    next(ApiError.badRequest('Validation failed', details));
  }
};

module.exports = validate;
