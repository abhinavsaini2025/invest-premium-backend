const { z } = require('zod');

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(1).max(2000),
});

const addMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

module.exports = { createTicketSchema, addMessageSchema };
