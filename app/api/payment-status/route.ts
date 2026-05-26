import { NextResponse } from "next/server";
import { getCashfreeOrderStatus } from "@/lib/cashfree";
import { getApplicationByOrderId, normalizePaymentStatus, updateApplicationPaymentStatus } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id is required." }, { status: 400 });
  }

  try {
    const cashfreeStatus = await getCashfreeOrderStatus(orderId);
    const paymentStatus = normalizePaymentStatus(cashfreeStatus.order_status);
    const application = await updateApplicationPaymentStatus(orderId, paymentStatus, cashfreeStatus)
      ?? await getApplicationByOrderId(orderId);

    return NextResponse.json({
      order_id: orderId,
      payment_status: paymentStatus,
      cashfree_status: cashfreeStatus.order_status,
      amount: cashfreeStatus.order_amount,
      currency: cashfreeStatus.order_currency,
      application
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify payment status." },
      { status: 500 }
    );
  }
}
