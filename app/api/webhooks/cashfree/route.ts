import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

type TransactionRecord = {
  orderId: string;
  amount: number;
  status: TransactionStatus;
};

const transactions = new Map<string, TransactionRecord>();
const creditedOrders = new Set<string>();
let walletBalance = 0;

function verifySignature(rawBody: string, signature: string | null, timestamp: string | null) {
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;

  if (!webhookSecret) {
    return true;
  }

  if (!signature || !timestamp) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function getEventType(payload: Record<string, unknown>) {
  return String(payload.type || payload.event || payload.event_type || "").toLowerCase();
}

function getOrderId(payload: Record<string, any>) {
  return String(
    payload?.data?.order?.order_id
    || payload?.data?.payment?.order_id
    || payload?.data?.order_id
    || payload?.order?.order_id
    || payload?.order_id
    || ""
  );
}

function getAmount(payload: Record<string, any>) {
  return Number(
    payload?.data?.order?.order_amount
    || payload?.data?.payment?.payment_amount
    || payload?.order?.order_amount
    || payload?.order_amount
    || 0
  );
}

function markTransaction(orderId: string, amount: number, status: TransactionStatus) {
  const existing = transactions.get(orderId);
  const nextRecord = {
    orderId,
    amount: existing?.amount || amount,
    status
  };

  transactions.set(orderId, nextRecord);
  return existing;
}

function creditWalletOnce(orderId: string, amount: number) {
  if (creditedOrders.has(orderId)) {
    return;
  }

  walletBalance += Number(amount || 0);
  creditedOrders.add(orderId);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};

    if (process.env.NODE_ENV !== "production") {
      console.log("Cashfree webhook payload", payload);
    }

    const signatureOk = verifySignature(
      rawBody,
      request.headers.get("x-webhook-signature"),
      request.headers.get("x-webhook-timestamp")
    );

    if (!signatureOk) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
    }

    const eventType = getEventType(payload);
    const orderId = getOrderId(payload);
    const amount = getAmount(payload);

    if (orderId && eventType === "payment.success") {
      const existing = markTransaction(orderId, amount, "SUCCESS");

      if (existing?.status !== "SUCCESS") {
        creditWalletOnce(orderId, amount);
      }
    }

    if (orderId && eventType === "payment.failed") {
      markTransaction(orderId, amount, "FAILED");
    }

    if (orderId && eventType === "payment.user_dropped") {
      markTransaction(orderId, amount, "CANCELLED");
    }

    return NextResponse.json({ ok: true, walletBalance });
  } catch (error) {
    console.error("Cashfree webhook processing error", error);
    return NextResponse.json({ ok: true });
  }
}
