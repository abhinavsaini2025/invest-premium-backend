const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/profile', require('./profile.routes'));
router.use('/plans', require('./plan.routes'));
router.use('/wallet', require('./wallet.routes'));
router.use('/recharge', require('./recharge.routes'));
router.use('/withdraw', require('./withdrawal.routes'));
router.use('/referral', require('./referral.routes'));
router.use('/support', require('./support.routes'));
router.use('/notifications', require('./notification.routes'));

module.exports = router;
