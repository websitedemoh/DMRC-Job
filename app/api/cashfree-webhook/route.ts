import { NextResponse } from "next/server";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { appendWebhookEvent } from "@/lib/store";

export const runtime = "nodejs";

function getOrderId(payload: Record<string, unknown>) {
  const data = payload.data as Record<string, unknown> | undefined;
  const order = data?.order as Record<string, unknown> | undefined;

  return String(order?.order_id || data?.order_id || payload.order_id || "");
}

function getPaymentStatus(payload: Record<string, unknown>) {
  const data = payload.data as Record<string, unknown> | undefined;
  const order = data?.order as Record<string, unknown> | undefined;
  const payment = data?.payment as Record<string, unknown> | undefined;

  return String(payment?.payment_status || order?.order_status || data?.payment_status || payload.payment_status || "");
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    verifyCashfreeWebhookSignature(
      rawBody,
      request.headers.get("x-webhook-signature"),
      request.headers.get("x-webhook-timestamp")
    );

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const orderId = getOrderId(payload);
    const status = getPaymentStatus(payload);
    const eventType = String(payload.type || payload.event || "cashfree.webhook");

    await appendWebhookEvent({
      receivedAt: new Date().toISOString(),
      type: eventType,
      orderId,
      status,
      payload
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Cashfree webhook rejected", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed." },
      { status: 400 }
    );
  }
}
