import crypto from "node:crypto";

export type CashfreeMode = "sandbox" | "production";

export type CashfreeOrderResponse = {
  cf_order_id?: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  payment_session_id?: string;
  payment_sessions_id?: string;
  order_status?: string;
};

export type CashfreeOrderStatusResponse = {
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: string;
  cf_order_id?: string;
};

export function getCashfreeMode(): CashfreeMode {
  return process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
}

export function getCashfreeBaseUrl() {
  return getCashfreeMode() === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
}

export function getCashfreeApiVersion() {
  return process.env.CASHFREE_API_VERSION || "2025-01-01";
}

export function getCashfreeHeaders() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Cashfree credentials are missing. Configure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.");
  }

  return {
    "Content-Type": "application/json",
    "x-api-version": getCashfreeApiVersion(),
    "x-client-id": clientId,
    "x-client-secret": clientSecret
  };
}

export function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for Cashfree return_url and notify_url.");
  }

  const normalized = siteUrl.replace(/\/$/, "");

  if (!normalized.startsWith("https://") && !normalized.startsWith("http://localhost")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS for payment redirects.");
  }

  return normalized;
}

export async function createCashfreeOrder(payload: {
  orderId: string;
  amount: number;
  candidateName: string;
  email: string;
  phone: string;
  note: string;
  tags: Record<string, string>;
}) {
  const siteUrl = getSiteUrl();
  const response = await fetch(`${getCashfreeBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      ...getCashfreeHeaders(),
      "x-idempotency-key": crypto.randomUUID()
    },
    body: JSON.stringify({
      order_id: payload.orderId,
      order_amount: Number(payload.amount.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: payload.orderId,
        customer_name: payload.candidateName,
        customer_email: payload.email,
        customer_phone: payload.phone
      },
      order_meta: {
        return_url: `${siteUrl}/payment-status?order_id=${payload.orderId}`,
        notify_url: `${siteUrl}/api/cashfree-webhook`
      },
      order_note: payload.note,
      order_tags: payload.tags
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error_description || "Cashfree order creation failed.");
  }

  return data as CashfreeOrderResponse;
}

export async function getCashfreeOrderStatus(orderId: string) {
  const response = await fetch(`${getCashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: getCashfreeHeaders(),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error_description || "Unable to verify payment status.");
  }

  return data as CashfreeOrderStatusResponse;
}

export function verifyCashfreeWebhookSignature(rawBody: string, signature: string | null, timestamp: string | null) {
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error("Cashfree client secret is missing.");
  }

  if (!signature || !timestamp) {
    throw new Error("Missing Cashfree webhook signature headers.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", clientSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("Invalid Cashfree webhook signature.");
  }
}
