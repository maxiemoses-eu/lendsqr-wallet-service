# Lendsqr Wallet Service

A REST API for user accounts, NGN wallets, and wallet-to-wallet transfers, built with NestJS, TypeScript, PostgreSQL, and Knex.

**Live API:** https://lendsqr-wallet-service-7b9c.onrender.com  
**Repository:** https://github.com/maxiemoses-eu/lendsqr-wallet-service

## Features

- Create a user and an associated NGN wallet.
- Retrieve user and wallet details.
- Block and unblock user accounts.
- Transfer funds between wallets.
- Validate wallet status, account status, currency, and available balance.
- Prevent negative balances using database constraints and transactional balance updates.
- Handle concurrent transfers using database transactions and row-level wallet locks.
- Protect against duplicate transfer requests with idempotency keys.
- Reject reuse of an idempotency key with different transfer details.
- Store monetary values as integer kobo to avoid floating-point arithmetic errors.

## Technology stack

- Node.js and TypeScript
- NestJS
- PostgreSQL
- Knex.js
- Jest
- Render for application hosting
- Neon for managed PostgreSQL

## Architecture

The application is organized into modules:

- **Users:** user creation, user lookup, and account status management.
- **Wallets:** wallet lookup and wallet status information.
- **Transfers:** validation, idempotency, balance checks, and transactional transfers.
- **Database:** PostgreSQL connection configuration and schema migrations.

A transfer locks the participating wallets in a consistent order, validates the transaction, updates both balances, and records the completed transfer within a database transaction. If a validation or database operation fails, the transaction is rolled back.

## Prerequisites

- Node.js and npm
- PostgreSQL, either locally or through a managed provider

## Local setup

Clone the repository:

```bash
git clone https://github.com/maxiemoses-eu/lendsqr-wallet-service.git
cd lendsqr-wallet-service
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Configure the database settings in `.env`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=lendsqr_wallet

DATABASE_URL=
DATABASE_SSL=false

ADJUTOR_API_KEY=
ADJUTOR_BASE_URL=
```

Use either the local PostgreSQL settings or a managed database connection URL, as supported by the database configuration. Do not commit `.env` or expose database credentials.

Run the database migrations:

```bash
npm run migrate
```

Build and start the application:

```bash
npm run build
npm run start:prod
```

The application listens on port `3000` by default and uses the `PORT` environment variable when provided by the hosting platform.

For development:

```bash
npm run start:dev
```

## API reference

Base URL:

```text
https://lendsqr-wallet-service-7b9c.onrender.com
```

### 1. Create a user

`POST /users`

Request body:

```json
{
  "name": "Example User",
  "email": "example@example.com"
}
```

The service creates the user and an associated NGN wallet. Email addresses must be unique.

### 2. Retrieve a user

`GET /users/:id`

Returns the user, account status, and associated wallet details.

### 3. Block an account

`PATCH /users/:id/block`

Sets the user's blocked status. Transfers involving a blocked user are rejected.

### 4. Unblock an account

`PATCH /users/:id/unblock`

Clears the user's blocked status.

### 5. Retrieve a wallet

`GET /wallets/:id`

Returns wallet details, including the owner, currency, balance, and relevant account status.

Balances are returned in kobo. Divide by 100 to obtain the equivalent amount in naira.

### 6. Transfer funds

`POST /transfers`

Required header:

```text
Idempotency-Key: a-unique-request-key
```

Request body:

```json
{
  "fromWalletId": "SOURCE-WALLET-UUID",
  "toWalletId": "DESTINATION-WALLET-UUID",
  "amountKobo": 10000
}
```

`amountKobo` is a positive integer. For example, `10000` represents ₦100.

The transfer endpoint checks that:

- Both wallets exist and are active.
- The source and destination wallets are different.
- Both wallets use the same currency.
- Neither account is blocked or marked as blacklisted.
- The source wallet has sufficient funds.
- The idempotency key has not been used for a different request.

A successful transfer returns the transfer record and its status.

## Idempotency and concurrency

Every transfer request must include an idempotency key.

- Repeating a request with the same key and the same transfer details returns the existing transfer instead of executing it again.
- Reusing a key with different transfer details returns a conflict response.
- Wallet rows are locked during the transfer transaction to help prevent concurrent requests from spending the same available funds.
- A database constraint prevents negative wallet balances.
- A unique database constraint protects transfer idempotency keys.

These controls are designed to preserve balance consistency and prevent duplicate transfers.

## Error handling

The API uses HTTP status codes to communicate request outcomes. Examples verified against the deployed service include:

| Scenario | Status |
|---|---:|
| Successful transfer | 201 |
| Duplicate key with different transfer details | 409 |
| Insufficient wallet balance | 400 |
| Transfer from a blocked account | 403 |
| Transfer from a blacklisted account | 403 |

Validation and other errors may return additional status codes depending on the request.

## Testing

Run the test suite:

```bash
npm test -- --runInBand
```

Run the build:

```bash
npm run build
```

The current automated unit tests cover basic transfer validation, including invalid wallet identifiers, identical source and destination wallets, invalid amounts, and missing idempotency keys.

Additional manual tests against the deployed API verified successful transfers, duplicate-request handling, insufficient funds, blocked-account rejection, and blacklisted-account rejection. Wallet balances were also checked directly in PostgreSQL.

## Deployment

The service is hosted on Render and uses Neon PostgreSQL.

Live URL:

https://lendsqr-wallet-service-7b9c.onrender.com

The application uses environment variables for database configuration and the hosting platform's assigned port. Database schema changes are managed through Knex migrations.

## Known limitations and security considerations

- **Adjutor/Karma integration:** The current implementation uses a database blacklist flag to enforce transfer restrictions. A live request to the Adjutor/Karma API has not been verified. A production integration requires an authorized API key, documented provider behaviour, appropriate error handling, and a clearly defined policy for unavailable provider responses.
- **Account-management authorization:** The block and unblock endpoints currently do not enforce authentication or authorization. They must be protected with appropriate access controls before use in a real financial environment.
- **Production hardening:** Further work is required around authentication, authorization, audit logging, rate limiting, monitoring, and security review before this service can be considered ready for real financial transactions.

## License

This project was created as a technical assessment. No separate project license has been specified.
