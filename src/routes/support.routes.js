const router = require('express').Router();
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/support.controller');
const { createTicketSchema, addMessageSchema } = require('../validators/support.validators');

router.use(requireAuth);

router.post('/tickets', validate({ body: createTicketSchema }), controller.createTicket);
router.get('/tickets', controller.listTickets);
router.get('/tickets/:id', controller.getTicket);
router.post('/tickets/:id/messages', validate({ body: addMessageSchema }), controller.addMessage);

module.exports = router;
