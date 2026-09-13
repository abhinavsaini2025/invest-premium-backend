const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/notification.controller');

router.use(requireAuth);

router.get('/', controller.listNotifications);
router.patch('/:id/read', controller.markOneRead);
router.patch('/read-all', controller.markAllRead);

module.exports = router;
