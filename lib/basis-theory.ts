export interface TokenizeCardInput {
  card_number: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
}

export interface TokenizeCardResult {
  token_id: string;
  masked_card: string;
}

export async function tokenizeCard(
  card: TokenizeCardInput
): Promise<TokenizeCardResult> {
  const proxyUrl = process.env.BT_PROXY_URL;
  const proxyKey = process.env.BT_PROXY_KEY;

  if (!proxyUrl || !proxyKey) {
    throw new Error("BT_PROXY_URL and BT_PROXY_KEY must be configured");
  }

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BT-API-KEY": proxyKey,
    },
    body: JSON.stringify({
      type: "card",
      data: {
        number: card.card_number,
        expiration_month: card.exp_month,
        expiration_year: card.exp_year,
        cvc: card.cvv,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Basis Theory proxy error (${response.status}): ${body}`
    );
  }

  const data = await response.json();

  return {
    token_id: data.id,
    masked_card: data.data?.number
      ? `****${data.data.number.slice(-4)}`
      : "****",
  };
}
