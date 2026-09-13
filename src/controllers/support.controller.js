const Ticket = require('../models/Ticket');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateTicketId } = require('../utils/idGenerators');

// POST /support/tickets
const createTicket = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;

  let ticketId = generateTicketId();
  while (await Ticket.findOne({ ticketId })) ticketId = generateTicketId();

  const ticket = await Ticket.create({
    ticketId,
    user: req.user.id,
    subject,
    messages: [{ sender: 'user', text: message }],
  });

  return new ApiResponse(201, { ticket }, 'Support ticket created').send(res);
});

// GET /support/tickets
const listTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user.id }).sort({ updatedAt: -1 });
  return new ApiResponse(200, { tickets }).send(res);
});

// GET /support/tickets/:id
const getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  return new ApiResponse(200, { ticket }).send(res);
});

// POST /support/tickets/:id/messages
const addMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user.id });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  ticket.messages.push({ sender: 'user', text });
  if (ticket.status === 'Resolved') ticket.status = 'In Progress'; // reopen on new user message
  await ticket.save();

  return new ApiResponse(201, { ticket }, 'Message added').send(res);
});

module.exports = { createTicket, listTickets, getTicket, addMessage };
