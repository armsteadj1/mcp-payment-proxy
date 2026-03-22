# MPP Payment Proxy — BT Card Integration

## What is MPP?

[Machine Payments Protocol (MPP)](https://mpp.dev) is an HTTP-native payment scheme built on the `Payment` HTTP Authentication standard. It lets any API gate access behind a micropayment: the server issues a `402 Payment Required` challenge, the client fulfills it with a cryptographic credential, and the server verifies the payment before returning the protected resource. No subscriptions, no API keys — just pay-per-request.

## What Basis Theory does in this flow

**Basis Theory acts as both the Enabler and the Decryptor** for card payments:

- **Enabler** — The client requests an encryption public key from the BT proxy URL included in the 402 challenge. It uses that key to encrypt the card data into a JWE (JSON Web Encryption) token, so raw card data never leaves the client unencrypted.
- **Decryptor** — When the server receives the JWE credential, it forwards it directly to the BT proxy (`BT-PROXY-KEY` authenticated). BT decrypts the JWE server-side, tokenizes the card, and charges it — returning only an authorization reference. The Vercel server never sees the raw card number.

## Why this matters

> **BT isn't a Stripe Projects provider yet — this shows exactly what that integration would look like.**

Stripe Projects lets you provision infrastructure (Neon, PostHog, etc.) alongside your Stripe app. Basis Theory would be a natural fit as a PCI-safe card vault + proxy provider. This repo demonstrates the full MPP + BT integration pattern so that wiring it up as a Stripe Projects provider would be straightforward.

## Stack

- **Next.js 15** App Router + TypeScript (Vercel)
- **`mppx`** — TypeScript SDK for Machine Payments Protocol
- **`@neondatabase/serverless`** — Neon Postgres for payment records
- **`posthog-node`** — PostHog analytics events
- **`@basis-theory/node-sdk`** — Basis Theory operations

## Payment Flow

```
1. Client          →  GET /api/pay
2. Server          →  402 + WWW-Authenticate: Payment bt/charge amount=0.01 enabler=<BT_PROXY_URL>
3. Client          →  GET <BT_PROXY_URL>/encryption-key  (fetch BT public key)
4. Client          →  Encrypt card data → JWE token
5. Client          →  GET /api/pay  Authorization: Payment { jwe: "<encrypted-token>" }
6. Server          →  POST <BT_PROXY_URL>  BT-PROXY-KEY: <key>  body: { jwe }
   BT Proxy        →  Decrypt JWE → charge card → return { authorization_ref, token }
7. Server          →  INSERT INTO payments ... ; PostHog.capture("payment_succeeded")
8. Server          →  200 + Payment-Receipt + { message: "paid access granted" }
```

## Provisioning

### Stripe Projects (Neon + PostHog)

```bash
stripe projects add neon/postgres        # → DATABASE_URL
stripe projects add posthog/analytics   # → POSTHOG_PROJECT_API_KEY
```

### Basis Theory (manual)

1. Create an account at [basistheory.com](https://basistheory.com)
2. Create a Proxy configuration to handle card decryption + charge
3. Copy your Proxy URL and API key

### Environment Variables

```bash
cp .env.example .env.local
# Fill in: DATABASE_URL, POSTHOG_PROJECT_API_KEY, BT_PROXY_KEY, BT_PROXY_URL, MPP_SECRET_KEY
# Generate MPP secret: openssl rand -hex 32
```

### Initialize the database

```bash
npm run db:setup
```

## Testing

```bash
# Install the mppx CLI globally
npm install -g mppx

# Create a test account (auto-funded on testnet)
mppx account create

# Make a paid request
mppx https://your-deployment.vercel.app/api/pay
```

## Routes

| Route | Description |
|-------|-------------|
| `GET /api/pay` | MPP payment-gated resource (card via BT proxy) |
| `POST /api/mcp` | MCP server (Streamable HTTP) with payment tools |
| `GET /` | Status page with payment stats |

## Deploy

```bash
vercel deploy
```
