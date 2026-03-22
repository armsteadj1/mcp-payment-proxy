import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new PostHog(apiKey, {
      host: "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export async function trackPaymentInitiated(
  transactionId: string,
  amount: number,
  currency: string
): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  ph.capture({
    distinctId: "mcp-payment-proxy",
    event: "payment_initiated",
    properties: { transaction_id: transactionId, amount, currency },
  });
  await ph.flush();
}

export async function trackPaymentSuccess(
  transactionId: string,
  amount: number,
  currency: string,
  btToken: string
): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  ph.capture({
    distinctId: "mcp-payment-proxy",
    event: "payment_success",
    properties: {
      transaction_id: transactionId,
      amount,
      currency,
      bt_token: btToken,
    },
  });
  await ph.flush();
}

export async function trackPaymentFailed(
  transactionId: string,
  amount: number,
  currency: string,
  error: string
): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  ph.capture({
    distinctId: "mcp-payment-proxy",
    event: "payment_failed",
    properties: { transaction_id: transactionId, amount, currency, error },
  });
  await ph.flush();
}
