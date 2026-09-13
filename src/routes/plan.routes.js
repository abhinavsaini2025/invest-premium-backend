const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/plan.controller');

router.use(requireAuth);

router.get('/', controller.listPlans);
router.get('/my/active', controller.myActivePlans);
router.get('/:planId', controller.getPlan);
router.post('/:planId/purchase', controller.purchasePlan);

module.exports = router;
