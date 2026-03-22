import { neon } from '@neondatabase/serverless'

// ── Existing transactions table (used by MCP /api/mcp route) ──────────────

export interface Transaction {
  id: string
  bt_token: string
  amount: number
  currency: string
  status: string
  created_at: string
}

function getClient() {
  return neon(process.env.DATABASE_URL!)
}

export async function initializeDatabase(): Promise<void> {
  const sql = getClient()
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bt_token TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
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
  `
}

export async function insertTransaction(
  bt_token: string,
  amount: number,
  currency: string,
  status: string,
): Promise<Transaction> {
  const sql = getClient()
  const rows = await sql`
    INSERT INTO transactions (bt_token, amount, currency, status)
    VALUES (${bt_token}, ${amount}, ${currency}, ${status})
    RETURNING *
  `
  return rows[0] as Transaction
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const sql = getClient()
  const rows = await sql`SELECT * FROM transactions WHERE id = ${id}`
  return (rows[0] as Transaction) ?? null
}

export async function listTransactions(limit: number = 10): Promise<Transaction[]> {
  const sql = getClient()
  const rows = await sql`SELECT * FROM transactions ORDER BY created_at DESC LIMIT ${limit}`
  return rows as Transaction[]
}

// ── Payments table (used by MPP /api/pay route) ───────────────────────────

export interface Payment {
  id: string
  bt_token: string | null
  authorization_ref: string | null
  amount_cents: number
  currency: string
  status: string
  metadata: Record<string, string> | null
  created_at: string
}

export async function insertPayment(params: {
  bt_token: string
  authorization_ref: string
  amount_cents: number
  currency: string
  status: string
  metadata: Record<string, string>
}): Promise<Payment> {
  const sql = getClient()
  const { bt_token, authorization_ref, amount_cents, currency, status, metadata } = params
  const rows = await sql`
    INSERT INTO payments (bt_token, authorization_ref, amount_cents, currency, status, metadata)
    VALUES (${bt_token}, ${authorization_ref}, ${amount_cents}, ${currency}, ${status}, ${JSON.stringify(metadata)})
    RETURNING *
  `
  return rows[0] as Payment
}

export async function countPayments(): Promise<number> {
  const sql = getClient()
  const rows = await sql`SELECT COUNT(*) AS count FROM payments`
  return Number((rows[0] as { count: string }).count)
}

export async function listPayments(limit: number = 10): Promise<Payment[]> {
  const sql = getClient()
  const rows = await sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT ${limit}`
  return rows as Payment[]
}
