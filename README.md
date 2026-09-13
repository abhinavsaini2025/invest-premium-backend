# Investment & Wallet Management App — Backend

Node.js (Express) + MongoDB (Mongoose) backend for the investment/wallet React frontend.
Built for zero paid dependencies, and the payment gateway (recharge/withdraw) runs through a
mock abstraction layer until RupayEx credentials are available.

## Tech stack

- **Runtime:** Node.js 18+, Express 4
- **Database:** MongoDB via Mongoose (works with a free local `mongod` or MongoDB Atlas free tier)
- **Auth:** JWT access tokens (short-lived) + rotating refresh tokens (hashed at rest), bcrypt password hashing
- **Validation:** Zod schemas on every route
- **Docs:** Swagger UI at `/api-docs` + a full Postman collection in `/postman`
- **Scheduling:** `node-cron` for daily plan rewards

## Project structure

```
src/
  config/        env loading + MongoDB connection
  models/        Mongoose schemas (one file per collection)
  controllers/   request handlers - thin, delegate business logic to services/
  services/      business logic: wallet ledger, tokens, payment gateway, referrals
  middleware/    auth, validation, rate limiting, upload, centralized error handler
  validators/    Zod schemas per route group
  routes/        Express routers, one per resource, mounted in routes/index.js
  jobs/          the daily-rewards cron job
  docs/          hand-authored OpenAPI spec served at /api-docs
  app.js         Express app wiring (middleware, routes, error handler) - no listen()
  server.js      connects to Mongo, starts the HTTP server, schedules the cron job
scripts/
  seed.js        demo data: plans + a pre-verified demo user + sample wallet history
postman/         Postman collection + environment
```

The split between `app.js` (just builds the Express app) and `server.js` (actually starts
it) is what makes future automated tests possible without opening a real port.

## Getting started

```bash
npm install
cp .env.example .env      # then edit JWT secrets etc. (see below)
npm run seed               # creates demo plans + a demo user
npm run dev                # starts the API with nodemon
```

The API is now at `http://localhost:5000/api/v1`, Swagger UI at `http://localhost:5000/api-docs`,
and a health check at `http://localhost:5000/health`.

### Demo login (created by `npm run seed`)

```
Mobile:    9876543210
Password:  Demo@123
```

This user is ready to use, so you can call `POST /auth/login` directly for local testing. The
seed also creates a second "referred" user so the demo user's
referral summary and wallet ledger already have real data in them (an active Silver plan,
a recharge, a daily reward, and a referral bonus).

### `.env` variables

All variables are documented inline in `.env.example`. The ones you actually need to change
for local dev are `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (any long random string) and
`MONGO_URI` if you're not running MongoDB on the default local port.

Registration is instant and returns access/refresh tokens. Password recovery first returns the
account's security question from `POST /auth/forgot-password`; submit the answer and a new
password to `POST /auth/reset-password`.

## Testing with Postman

1. Import `postman/InvestmentWalletApp.postman_collection.json` and
   `postman/InvestmentWalletApp.postman_environment.json`, and select that environment.
2. Run `npm run seed` on the backend first.
3. Run **Auth → Login (demo user)** — its post-response script automatically saves
   `accessToken` / `refreshToken` into the environment. Every other request already
   references `{{accessToken}}`, so nothing needs to be copy-pasted.
4. To exercise signup, run **Auth → Register** with a new mobile number and security
question/answer. The request returns the access and refresh tokens.

## API overview

All routes are prefixed with `/api/v1`. Routes marked 🔒 require `Authorization: Bearer <accessToken>`.

| Group | Method & Path | Description |
|---|---|---|
| Auth | `POST /auth/register` | Create account and return tokens |
| Auth | `POST /auth/login` | Login, returns tokens |
| Auth | `POST /auth/forgot-password` | Return the account security question |
| Auth | `POST /auth/reset-password` | Reset password with security answer |
| Auth | `POST /auth/refresh-token` | Rotate refresh token for a new access token |
| Auth 🔒 | `POST /auth/change-password` | Change password |
| Auth 🔒 | `POST /auth/logout` | Revoke refresh token |
| Auth 🔒 | `GET /auth/me` | Current user |
| Profile 🔒 | `GET/PATCH /profile` | View/update profile |
| Profile 🔒 | `POST /profile/photo` | Upload profile photo (multipart `photo`) |
| Profile 🔒 | `GET /profile/bank`, `PUT /profile/bank` | View (masked) / update bank details |
| Profile 🔒 | `PATCH /profile/notification-settings` | Update notification toggles |
| Plans 🔒 | `GET /plans`, `GET /plans/:planId` | List / view plans |
| Plans 🔒 | `GET /plans/my/active` | My active + completed plan purchases |
| Plans 🔒 | `POST /plans/:planId/purchase` | Buy a plan (deducts wallet) |
| Wallet 🔒 | `GET /wallet/summary` | Balances |
| Wallet 🔒 | `GET /wallet/ledger` | Paginated transaction history (`page`, `limit`, `type`, `category`) |
| Recharge 🔒 | `POST /recharge`, `GET /recharge` | Add money / recharge history |
| Withdrawal 🔒 | `POST /withdraw`, `GET /withdraw` | Request withdrawal / history |
| Withdrawal 🔒 (admin) | `PATCH /withdraw/:id/status` | Approve/reject a pending withdrawal |
| Referral 🔒 | `GET /referral/summary`, `GET /referral/history` | Referral stats + list |
| Support 🔒 | `POST/GET /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets/:id/messages` | Ticket CRUD + thread |
| Notifications 🔒 | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | Notifications |

Full example request/response bodies for every one of these are in the Postman collection.

## Design notes (things worth knowing before you extend this)

- **Wallet ledger is the source of truth.** Every balance change writes one immutable
  `Transaction` row with a `previousBalance`/`updatedBalance` snapshot (`services/wallet.service.js`).
  Credits and debits each happen as a single atomic `findOneAndUpdate` — a debit's balance
  check (`availableBalance: { $gte: amount }`) and the decrement are the same database
  operation, so two concurrent withdrawal requests can never both succeed against a balance
  that only covers one of them, even without a multi-document transaction.
- **Transactions when available, safe fallback when not.** `services/txnRunner.js` wraps
  multi-write operations in a real MongoDB session/transaction when the connected server is
  a replica set (Atlas free tier included), and transparently falls back to sequential atomic
  writes on a bare local `mongod` (which doesn't support multi-document transactions). You
  don't need to think about which one you're running — it's detected automatically.
- **Payment gateway is fully abstracted** (`services/paymentGateway.js`). Every controller
  calls `initiateRecharge` / `initiatePayout` / `confirmPayout` — never a gateway SDK
  directly. Right now those functions run in mock mode and settle instantly. When RupayEx
  credentials exist, fill in the three `// TODO: RupayEx live call` blocks in that one file;
  no controller, route, or model changes are needed anywhere else.
- **Daily rewards are idempotent and self-healing.** The cron job (`jobs/dailyRewards.job.js`)
  runs hourly and looks for any active plan whose `nextRewardAt` has already passed, not just
  "due exactly now" — so a missed run (server restart, etc.) still pays out correctly on the
  next tick, just a little late, and one plan's failure never blocks the rest of the batch.
- **Referral bonuses fire off the purchase flow**, not signup — `referral.service.js`'s
  `handleFirstInvestment` is called from `plan.controller.js` right after a successful
  purchase, and only ever pays out once per referred user (it checks the `ReferralEvent` is
  still in `registered` status).
- **Sensitive data is masked at the response boundary**, not at the database layer
  (`utils/mask.js`) — bank account numbers and IFSC codes are stored in full (needed for
  actual payouts) but every API response returns them masked.
- **Errors never leak internals.** Every thrown error funnels through the single
  `middleware/errorHandler.js`, which is the only place in the codebase allowed to call
  `res.json()` on an error path. Stack traces only appear outside `NODE_ENV=production`.

## Known limitations / next steps

- This sandbox couldn't reach MongoDB's own servers to run a live end-to-end test (only a
  small allow-list of package registries is reachable here) — every file is syntax-checked
  and the app boots cleanly, but please run the seed + Postman collection locally as your
  first real smoke test.
- The payment gateway, referral reward, and minimum withdrawal are configured via `.env`
  rather than an admin-editable Settings collection — fine for a single-operator MVP, worth
  moving to the database once you have an admin panel.
- There's no admin panel/API for managing users, tickets, or plans beyond the one
  withdrawal-approval endpoint — everything else (creating plans, replying to tickets as
  "support") currently has to be done directly in MongoDB or added as you build the admin side.
#   i n v e s t - p r e m i u m - b a c k e n d  
 