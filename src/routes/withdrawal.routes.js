const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { withdrawLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/withdrawal.controller');
const { createWithdrawalSchema, updateWithdrawalStatusSchema } = require('../validators/withdrawal.validators');

router.use(requireAuth);

router.post('/', withdrawLimiter, validate({ body: createWithdrawalSchema }), controller.createWithdrawal);
router.get('/', controller.listWithdrawals);

// Admin-only: approve/reject a pending withdrawal (manual review, as flagged in the app's own support copy)
router.patch('/:id/status', requireRole('admin'), validate({ body: updateWithdrawalStatusSchema }), controller.updateWithdrawalStatus);

module.exports = router;
