const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/recharge.controller');
const { createRechargeSchema } = require('../validators/recharge.validators');

router.use(requireAuth);

router.post('/', validate({ body: createRechargeSchema }), controller.createRecharge);
router.get('/', controller.listRecharges);

module.exports = router;
