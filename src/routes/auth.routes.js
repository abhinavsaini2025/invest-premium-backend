const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, authActionLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/auth.controller');
const {
  registerSchema, loginSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, refreshTokenSchema,
} = require('../validators/auth.validators');

router.post('/register', authActionLimiter, validate({ body: registerSchema }), controller.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
router.post('/forgot-password', authActionLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post('/reset-password', authActionLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post('/refresh-token', validate({ body: refreshTokenSchema }), controller.refreshToken);

router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), controller.changePassword);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
