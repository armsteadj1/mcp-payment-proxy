Build `mcp-payment-proxy` — an MCP (Model Context Protocol) server that wraps Basis Theory proxy to handle card payment payloads securely. Provisioned with Stripe Projects (Vercel + Neon + PostHog).

## What to build

A Next.js app (App Router, TypeScript) with an MCP server endpoint that:

1. **Exposes MCP tools** via `/api/mcp` route (using `@modelcontextprotocol/sdk`):
   - `process_payment` — accepts `card_number`, `exp_month`, `exp_year`, `cvv`, `amount`, `currency` → routes through BT proxy → returns `{token, transaction_id, status}`
   - `get_transaction` — accepts `transaction_id` → returns transaction record from Neon
   - `list_transactions` — returns recent transactions (no raw card data)

2. **Basis Theory proxy integration** — card data is POSTed to a BT proxy endpoint (env: `BT_PROXY_KEY`, `BT_PROXY_URL`). BT tokenizes the card before it hits your servers. The MCP server receives the BT token back, never raw card data.

3. **Neon Postgres** — store transaction records: `id, bt_token, amount, currency, status, created_at`. Use `@neondatabase/serverless` driver. Connection via `DATABASE_URL` env var.

4. **PostHog analytics** — fire events on `process_payment` calls: `payment_initiated`, `payment_success`, `payment_failed`. Use `posthog-node`. API key via `POSTHOG_PROJECT_API_KEY` env var.

5. **Vercel deployment** — include `vercel.json` and make sure it deploys cleanly.

## Environment variables needed (Stripe Projects will provide these)
```
DATABASE_URL=          # Neon connection string (from stripe projects add neon/postgres)
POSTHOG_PROJECT_API_KEY= # PostHog (from stripe projects add posthog/analytics)
BT_PROXY_KEY=          # Basis Theory proxy key (manual - BT not in Stripe Projects yet)
BT_PROXY_URL=          # BT proxy URL
BT_API_KEY=            # BT API key for token operations
```

## Stack
- Next.js 15 App Router + TypeScript
- `@modelcontextprotocol/sdk` for MCP server
- `@neondatabase/serverless` for Postgres
- `posthog-node` for analytics
- `@basis-theory/node-sdk` for BT operations

## README
Write a clear README explaining:
- What this is (MCP server + BT proxy = PCI-safe agentic payments)
- How to provision with Stripe Projects (the commands)
- How to add BT credentials manually (since BT isn't a provider yet — this is the gap)
- How to configure an MCP client to use it

## Key point
The BT proxy is the security layer. Card data from the agent goes → BT proxy → tokenized → Neon stores token only. Vercel never has raw card data. This is the demo showing why BT should be a Stripe Projects provider.

After building, open a PR targeting main. Title: "feat: initial MCP payment proxy with BT integration"
