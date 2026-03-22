import { Mppx } from 'mppx/nextjs'
import { Method, z } from 'mppx'
import { initializeDatabase, insertPayment } from '@/lib/db'
import { trackPaymentChallenged, trackPaymentSucceeded, trackPaymentFailed } from '@/lib/analytics'

export const maxDuration = 30

// Custom BT card payment method.
// BT proxy acts as both Enabler (provides encryption key to client)
// and Decryptor (decrypts JWE + charges card).
const btCharge = Method.from({
  name: 'bt',
  intent: 'charge',
  schema: {
    credential: {
      // Client sends back the encrypted JWE token it received from BT
      payload: z.object({ jwe: z.string() }),
    },
    request: z.object({
      amount: z.string().check(z.regex(/^\d+(\.\d+)?$/, 'Invalid amount')),
      currency: z.string(),
      // BT proxy URL — client uses this to get the encryption key (Enabler role)
      enabler: z.string(),
    }),
  },
})

const btCardServer = Method.toServer(btCharge, {
  defaults: {
    currency: 'usd',
    enabler: process.env.BT_PROXY_URL ?? '',
  },

  async verify({ credential }) {
    const { jwe } = credential.payload
    const { amount, currency } = credential.challenge.request
    const amountCents = Math.round(parseFloat(amount) * 100)

    await initializeDatabase()

    // Fire challenged event (verification phase = payment is being processed)
    await trackPaymentChallenged(amountCents, currency, 'bt-card')

    // Forward encrypted JWE to BT proxy — BT decrypts + charges card
    let authorization_ref: string
    let token: string | undefined
    try {
      const res = await fetch(process.env.BT_PROXY_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'BT-PROXY-KEY': process.env.BT_PROXY_KEY!,
        },
        body: JSON.stringify({ jwe }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => res.status.toString())
        await trackPaymentFailed(amountCents, currency, 'bt-card', `BT proxy ${res.status}: ${body}`)
        throw new Error(`BT proxy returned ${res.status}`)
      }

      const data = await res.json()
      authorization_ref = data.authorization_ref
      token = data.token
    } catch (e) {
      if (!(e instanceof Error && e.message.startsWith('BT proxy'))) {
        await trackPaymentFailed(amountCents, currency, 'bt-card', (e as Error).message)
      }
      throw e
    }

    // Store payment record in Neon
    await insertPayment({
      bt_token: token ?? '',
      authorization_ref,
      amount_cents: amountCents,
      currency,
      status: 'succeeded',
      metadata: { jwe_length: String(jwe.length) },
    })

    // Fire success event
    await trackPaymentSucceeded(amountCents, currency, 'bt-card')

    return {
      method: 'bt',
      status: 'success',
      timestamp: new Date().toISOString(),
      reference: authorization_ref,
    }
  },
})

// Lazy-init to avoid throwing at module load when env vars aren't set
let _mppx: ReturnType<typeof Mppx.create<readonly [typeof btCardServer]>> | null = null

function getMppx() {
  if (!_mppx) {
    _mppx = Mppx.create({
      methods: [btCardServer],
      secretKey: process.env.MPP_SECRET_KEY,
    })
  }
  return _mppx
}

export const GET = (req: Request) => {
  const mppx = getMppx()
  return mppx['bt/charge']({ amount: '0.01' })(() =>
    Response.json({
      message: 'API response — paid access granted',
      timestamp: Date.now(),
    }),
  )(req)
}
