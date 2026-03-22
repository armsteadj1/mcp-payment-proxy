import { countPayments } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getPaymentCount(): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    return await countPayments()
  } catch {
    return null
  }
}

export default async function Home() {
  const paymentCount = await getPaymentCount()

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <h1>MPP Payment Proxy — BT Card Integration</h1>
      <p>
        A <strong>Machine Payments Protocol (MPP)</strong> server that wraps any API and charges
        per request using <strong>Basis Theory</strong> as the card payment Enabler and Decryptor.
        Vercel never sees raw card data — zero PCI scope.
      </p>

      <h2>How It Works</h2>
      <ol>
        <li>Client requests <code>GET /api/pay</code> (protected resource)</li>
        <li>Server returns <strong>402 + Challenge</strong> — amount, BT proxy URL (Enabler), networks</li>
        <li>Client contacts BT Enabler to get the encryption public key</li>
        <li>Client encrypts card data → receives encrypted <strong>JWE token</strong> from BT</li>
        <li>Client retries <code>GET /api/pay</code> with <strong>Credential</strong> (the JWE)</li>
        <li>Server forwards encrypted JWE to <strong>BT proxy</strong> — BT decrypts + charges card → returns auth ref</li>
        <li>Server stores payment record in <strong>Neon</strong>, fires <strong>PostHog</strong> event</li>
        <li>Server returns <strong>200 + Receipt</strong> — paid access granted</li>
      </ol>

      <h2>MPP Endpoint</h2>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
        GET /api/pay  — MPP payment-gated resource (card via BT proxy)
      </pre>

      <h2>MCP Endpoint</h2>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
        POST /api/mcp  — Streamable HTTP MCP transport
      </pre>

      <h2>Connect an MCP Client</h2>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
{JSON.stringify(
  {
    mcpServers: {
      'payment-proxy': {
        url: 'https://your-deployment.vercel.app/api/mcp',
      },
    },
  },
  null,
  2,
)}
      </pre>

      <h2>Test the MPP Route</h2>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
        npx mppx https://your-deployment.vercel.app/api/pay
      </pre>

      <h2>Payment Stats</h2>
      {paymentCount === null ? (
        <p style={{ color: '#888' }}>Database not connected.</p>
      ) : (
        <p>
          <strong>{paymentCount}</strong> payment{paymentCount !== 1 ? 's' : ''} processed.
        </p>
      )}
    </main>
  )
}
