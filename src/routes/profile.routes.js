const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { uploadProfilePhoto } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/profile.controller');
const { updateProfileSchema, updateBankSchema, notificationSettingsSchema } = require('../validators/profile.validators');

router.use(requireAuth);

router.get('/', controller.getProfile);
router.patch('/', validate({ body: updateProfileSchema }), controller.updateProfile);

router.post('/photo', (req, res, next) => uploadProfilePhoto(req, res, (err) => (err ? next(err) : next())), controller.uploadPhoto);

router.get('/bank', controller.getBank);
router.put('/bank', validate({ body: updateBankSchema }), controller.updateBank);

router.patch('/notification-settings', validate({ body: notificationSettingsSchema }), controller.updateNotificationSettings);

module.exports = router;
