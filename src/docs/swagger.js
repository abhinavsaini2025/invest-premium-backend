const config = require('../config/env');

// Hand-authored OpenAPI document. Deliberately kept to route shape + auth
// requirements rather than exhaustive per-field schemas - the Postman
// collection (see /postman) is the source of truth for full example
// request/response bodies; this is here so /api-docs gives a fast overview
// and lets you try a request straight from the browser.
const bearer = [{ bearerAuth: [] }];
const okResponse = (desc = 'Success') => ({ 200: { description: desc } });

function op(summary, { auth = true, tags, responses } = {}) {
  return {
    summary,
    tags,
    security: auth ? bearer : [],
    responses: responses || okResponse(),
  };
}

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Investment & Wallet Management App API',
    version: '1.0.0',
    description:
      'Backend API for the investment/wallet app. Every route except the ones under ' +
      '"Auth (public)" requires a Bearer access token obtained from /auth/login or /auth/register.\n\n' +
      'Full request/response examples for every route are in the Postman collection under /postman.',
  },
  servers: [{ url: `http://localhost:${config.port}${config.apiBasePath}` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  tags: [
    { name: 'Auth' }, { name: 'Profile' }, { name: 'Plans' }, { name: 'Wallet' },
    { name: 'Recharge' }, { name: 'Withdrawal' }, { name: 'Referral' }, { name: 'Support' }, { name: 'Notifications' },
  ],
  paths: {
    '/auth/register': { post: op('Register a new user and receive tokens', { auth: false, tags: ['Auth'] }) },
    '/auth/login': { post: op('Login with mobile + password', { auth: false, tags: ['Auth'] }) },
    '/auth/forgot-password': { post: op('Get the security question for password reset', { auth: false, tags: ['Auth'] }) },
    '/auth/reset-password': { post: op('Reset password using the security answer', { auth: false, tags: ['Auth'] }) },
    '/auth/refresh-token': { post: op('Exchange a refresh token for a new access token', { auth: false, tags: ['Auth'] }) },
    '/auth/change-password': { post: op('Change password (logged in)', { tags: ['Auth'] }) },
    '/auth/logout': { post: op('Revoke the current refresh token', { tags: ['Auth'] }) },
    '/auth/me': { get: op('Get the current authenticated user', { tags: ['Auth'] }) },

    '/profile': {
      get: op('Get my profile', { tags: ['Profile'] }),
      patch: op('Update my profile (name/email)', { tags: ['Profile'] }),
    },
    '/profile/photo': { post: op('Upload profile photo (multipart field "photo")', { tags: ['Profile'] }) },
    '/profile/bank': {
      get: op('Get my bank details (masked)', { tags: ['Profile'] }),
      put: op('Update my bank details', { tags: ['Profile'] }),
    },
    '/profile/notification-settings': { patch: op('Update notification preferences', { tags: ['Profile'] }) },

    '/plans': { get: op('List all active investment plans', { tags: ['Plans'] }) },
    '/plans/my/active': { get: op('List my active/completed plan purchases', { tags: ['Plans'] }) },
    '/plans/{planId}': {
      get: op('Get a single plan by id or planKey (e.g. "gold")', { tags: ['Plans'] }),
      parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
    },
    '/plans/{planId}/purchase': {
      post: op('Purchase a plan (deducts wallet balance)', { tags: ['Plans'] }),
      parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
    },

    '/wallet/summary': { get: op('Get wallet balances', { tags: ['Wallet'] }) },
    '/wallet/ledger': { get: op('Paginated transaction ledger (filters: page, limit, type, category)', { tags: ['Wallet'] }) },

    '/recharge': {
      post: op('Create a recharge (add money) request', { tags: ['Recharge'] }),
      get: op('List my recharge history', { tags: ['Recharge'] }),
    },

    '/withdraw': {
      post: op('Request a withdrawal (min-limit + balance enforced server-side)', { tags: ['Withdrawal'] }),
      get: op('List my withdrawal history', { tags: ['Withdrawal'] }),
    },
    '/withdraw/{id}/status': {
      patch: op('Admin: approve or reject a pending withdrawal', { tags: ['Withdrawal'] }),
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    },

    '/referral/summary': { get: op('My referral code + stats', { tags: ['Referral'] }) },
    '/referral/history': { get: op('List of people I referred and their status', { tags: ['Referral'] }) },

    '/support/tickets': {
      post: op('Create a support ticket', { tags: ['Support'] }),
      get: op('List my support tickets', { tags: ['Support'] }),
    },
    '/support/tickets/{id}': {
      get: op('Get one ticket with its message thread', { tags: ['Support'] }),
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    },
    '/support/tickets/{id}/messages': {
      post: op('Add a message to a ticket', { tags: ['Support'] }),
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    },

    '/notifications': { get: op('List my notifications', { tags: ['Notifications'] }) },
    '/notifications/{id}/read': {
      patch: op('Mark one notification as read', { tags: ['Notifications'] }),
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    },
    '/notifications/read-all': { patch: op('Mark all notifications as read', { tags: ['Notifications'] }) },
  },
};

module.exports = spec;
