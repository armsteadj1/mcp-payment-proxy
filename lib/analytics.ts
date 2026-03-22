import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY
  if (!apiKey) return null
  if (!client) {
    client = new PostHog(apiKey, {
      host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return client
}

export async function trackPaymentChallenged(
  amount: number,
  currency: string,
  method: string,
): Promise<void> {
  const ph = getClient()
  if (!ph) return
  ph.capture({
    distinctId: 'mpp-payment-proxy',
    event: 'payment_challenged',
    properties: { amount, currency, method, timestamp: new Date().toISOString() },
  })
  await ph.flush()
}

export async function trackPaymentSucceeded(
  amount: number,
  currency: string,
  method: string,
): Promise<void> {
  const ph = getClient()
  if (!ph) return
  ph.capture({
    distinctId: 'mpp-payment-proxy',
    event: 'payment_succeeded',
    properties: { amount, currency, method, timestamp: new Date().toISOString() },
  })
  await ph.flush()
}

export async function trackPaymentFailed(
  amount: number,
  currency: string,
  method: string,
  error: string,
): Promise<void> {
  const ph = getClient()
  if (!ph) return
  ph.capture({
    distinctId: 'mpp-payment-proxy',
    event: 'payment_failed',
    properties: { amount, currency, method, error, timestamp: new Date().toISOString() },
  })
  await ph.flush()
}
