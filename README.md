# TweetMob Notifications Backend

Backend for ingesting X (Twitter) notification payloads and fanning out webhook
events to subscribers. It supports both a public REST API and a Telegram bot
for managing subscriptions.

## What this service does

- Receives notification payloads from a separate client that listens to X.
- Extracts the impacted accounts, fetches recent tweets, and dedupes bursts.
- Delivers webhook callbacks for every active subscription.
- Tracks webhook receipts for billing/analytics and auto-activates pending subs.
- Provides a Telegram bot and a public API for subscription management.

## Architecture at a glance

- Firebase Functions (v2) with two entrypoints:
  - `externalAPI`: Express app with REST endpoints and docs.
  - `notificationBot`: Telegram bot webhook handler.
- Firestore for users, API keys, subscriptions, KOLs, tweets, and receipts.
- RapidAPI for fetching recent tweets.

## Public API

Base URL (prod): `https://externalapi-qzvlzsqjjq-uc.a.run.app/v1`

Endpoints:

- `POST /subscriptions` - create a subscription
- `GET /subscriptions` - list subscriptions (cursor-based pagination)
- `GET /subscriptions/:id` - get a subscription
- `PATCH /subscriptions/:id` - edit a subscription
- `DELETE /subscriptions/:id` - unsubscribe

Authentication:

- Include your API key in the `x-api-key` header.
- Get an API key from the Telegram bot: `@TweetMobNotifications_bot`.

Docs:

- `GET /docs` serves the OpenAPI UI.
- The OpenAPI source lives in `src/externalAPI/spec.yaml`.

## Internal notification ingest

The client that listens to X should POST here:

- `POST /internal/v1/notification`
- Requires the private API key in `x-api-key`.

The payload must match the shape expected by
`src/notifications/utils.ts:extractUsersFromPayload`.

## Telegram bot

Bot commands:

- `/start` - register your account
- `/generate_api_key` - create an API key
- `/sub <x_handle> <webhook_url>` - subscribe
- `/edit <x_handle>` - edit a subscription
- `/list` - list subscriptions
- `/list_all` - list all subscriptions
- `/docs` - API documentation link

Webhook is configured via `notificationBot` and uses the secret token for
Telegram verification.

## Webhook payloads

Delivered to each subscriber's webhook URL:

```json
{
  "tweet": {
    "data": {
      "userId": "123",
      "tweetId": "456",
      "text": "Hello world",
      "createdAt": "2025-02-01T07:07:17.000Z",
      "lang": "en"
    },
    "raw": {}
  },
  "user": {
    "id": "KOL_ID",
    "xHandle": "elonmusk",
    "xUserID": "44196397",
    "xScreenName": "elonmusk",
    "xName": "Elon Musk"
  }
}
```

Exact schema lives in `src/lib/types.ts:WebhookPayload`.

## Firestore collections

The service uses these collections (see `src/lib/types.ts:DBCollections`):

- Users
- APIKeys
- Subscriptions
- KOLs
- Tweets
- Receipts

## Secrets and configuration

Secrets are defined in `src/lib/secrets.ts` and stored in Firebase Secret
Manager. Set them with `firebase functions:secrets:set`:

- `tg_bot_api_key`
- `private_api_key`
- `rapid_api_key`
- `tg_webhook_secret_token`

## Local development

Prereqs:

- Node.js 20
- Firebase CLI (`npm i -g firebase-tools`)

Commands:

```bash
npm install
npm run build
npm run serve
```

The build step compiles TypeScript and copies the OpenAPI spec to `lib/`.

## Deploy

```bash
npm run deploy
```

Optional:

- `npm run deploy:indexes`

