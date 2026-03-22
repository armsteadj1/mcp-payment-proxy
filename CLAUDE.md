# MPP Payment Wrapper with Basis Theory

Build an **MPP (Machine Payments Protocol) server** that wraps any API and charges per request, using Basis Theory proxy as the card payment Enabler/Decryptor. Hosted on Vercel, Neon for records, PostHog for analytics.

## Architecture

MPP card payment flow:
1. Client requests protected resource
2. Server returns 402 + Challenge (amount, BT encryption key, networks)
3. Client gets encrypted network token (JWE) from BT as Enabler
4. Client retries with GET + Credential (encrypted JWE token)
5. **Server sends encrypted JWE to BT proxy → BT decrypts + charges card → returns auth ref**
6. Server stores payment record in Neon, fires PostHog event, returns 200 + Receipt

BT proxy is the Enabler and Decryptor. Server never sees raw card data. Zero PCI scope on Vercel.

## Stack
- Next.js 15 App Router + TypeScript (Vercel)
- `mppx` SDK (npm: `mppx`) - the MPP reference implementation by Tempo Labs
- `@neondatabase/serverless` - Neon Postgres
- `posthog-node` - PostHog analytics
- `@basis-theory/node-sdk` - BT operations

## What to build

### 1. MPP server route: `app/api/pay/route.ts`

Use `mppx/nextjs` middleware. Accept card payment method. When credential comes in (encrypted JWE), forward to BT proxy for decryption + charge.

```typescript
import { Mppx, card } from 'mppx/nextjs'

const mppx = Mppx.create({
  methods: [
    card({
      // BT acts as the Enabler - provides encryption key + handles charge
      enabler: process.env.BT_PROXY_URL,
      // When credential arrives, BT proxy handles decryption + charge
      onCharge: async (credential) => {
        // POST credential to BT proxy, get authorization ref back
        const res = await fetch(process.env.BT_PROXY_URL!, {
          method: 'POST',
          headers: { 'BT-PROXY-KEY': process.env.BT_PROXY_KEY! },
          body: JSON.stringify(credential)
        })
        return res.json() // { authorization_ref, token }
      }
    })
  ],
})

export const GET = mppx.charge({ amount: '0.01' })(async () => {
  return Response.json({ message: 'API response — paid access granted', timestamp: Date.now() })
})
```

Look at the actual mppx SDK docs at https://mpp.dev/payment-methods/card and https://mpp.dev/quickstart/server to get the exact API right. Use `mppx` npm package.

### 2. Neon schema: `lib/db.ts`

```sql
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bt_token TEXT,
  authorization_ref TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

Use `@neondatabase/serverless`. Record each payment attempt.

### 3. PostHog events: `lib/analytics.ts`

Fire events: `payment_challenged`, `payment_succeeded`, `payment_failed`
Properties: amount, currency, method, timestamp

### 4. Status page: `app/page.tsx`

Simple page showing:
- "MPP Payment Proxy — BT Card Integration"
- How it works (the 8-step flow above)
- MCP client config example
- Live recent payment count from Neon

### 5. `vercel.json`

```json
{
  "functions": {
    "app/api/**": { "maxDuration": 30 }
  }
}
```

## Environment variables

```
DATABASE_URL=            # Neon (from stripe projects add neon/postgres)
POSTHOG_PROJECT_API_KEY= # PostHog (from stripe projects add posthog/analytics)
POSTHOG_HOST=https://app.posthog.com
BT_PROXY_KEY=            # Basis Theory proxy key
BT_PROXY_URL=            # BT proxy URL (e.g. https://api.basistheory.com/proxy)
BT_API_KEY=              # BT API key
```

## README

Include:
1. What MPP is (one paragraph, link to mpp.dev)
2. What BT proxy does in this flow (Enabler + Decryptor)
3. Why this matters: "BT isn't a Stripe Projects provider yet — this shows exactly what that integration would look like"
4. How to provision with Stripe Projects commands
5. How to add BT creds manually  
6. The 8-step payment flow diagram (text version)
7. How to test with `npx mppx <your-url>/api/pay`

## When done

1. Look at what's already been scaffolded in the repo
2. Build on top of it — don't wipe what's there if it's useful
3. `git add -A && git commit -m "feat: MPP payment proxy with BT card integration"`
4. `git push origin main`

GitHub App token is in GH_TOKEN. Refresh with:
```
export GH_TOKEN=$(~/.local/bin/github-app-token armsteadj1/mcp-payment-proxy 2>/dev/null)
```

First install mppx: `npm install mppx @neondatabase/serverless posthog-node @basis-theory/node-sdk`
