const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/referral.controller');

router.use(requireAuth);

router.get('/summary', controller.getSummary);
router.get('/history', controller.getHistory);

module.exports = router;
