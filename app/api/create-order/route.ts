import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createCashfreeOrder, getCashfreeMode } from "@/lib/cashfree";
import { type ApplicationRecord, saveApplication } from "@/lib/store";
import { validateApplicationInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validation = validateApplicationInput(payload);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const orderId = `DMRCDEMO_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const applicationId = crypto.randomUUID();
    const applicationRecord: ApplicationRecord = {
      id: applicationId,
      orderId,
      amount: validation.amount,
      paymentStatus: "CREATED",
      applicant: validation.data,
      createdAt: now,
      updatedAt: now,
      webhookEvents: []
    };

    await saveApplication(applicationRecord);

    const cashfreeOrder = await createCashfreeOrder({
      orderId,
      amount: validation.amount,
      candidateName: validation.data.candidateName,
      email: validation.data.email,
      phone: validation.data.phone,
      note: "Unofficial DMRC job information demo application fee",
      tags: {
        website_type: "unofficial_demo",
        category: validation.data.category,
        post: validation.data.postApplied
      }
    });
    const paymentSessionId = cashfreeOrder.payment_session_id || cashfreeOrder.payment_sessions_id;

    if (!paymentSessionId) {
      return NextResponse.json({ error: "Cashfree did not return a payment session id." }, { status: 502 });
    }

    await saveApplication({
      id: applicationId,
      orderId,
      amount: validation.amount,
      paymentSessionId,
      paymentStatus: "PENDING",
      applicant: validation.data,
      createdAt: now,
      updatedAt: new Date().toISOString(),
      latestCashfreeResponse: cashfreeOrder,
      webhookEvents: []
    });

    return NextResponse.json({
      order_id: orderId,
      payment_session_id: paymentSessionId,
      mode: getCashfreeMode(),
      amount: validation.amount
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create payment order." },
      { status: 500 }
    );
  }
}
