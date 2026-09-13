const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/wallet.controller');
const { paginationSchema } = require('../validators/wallet.validators');

router.use(requireAuth);

router.get('/summary', controller.getSummary);
router.get('/ledger', validate({ query: paginationSchema }), controller.getLedger);

module.exports = router;
