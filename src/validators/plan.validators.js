const { z } = require('zod');

const purchasePlanParamsSchema = z.object({
  planId: z.string().min(1),
});

module.exports = { purchasePlanParamsSchema };
