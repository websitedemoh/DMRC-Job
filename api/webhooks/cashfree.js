const {
  getConfig,
  handleOptions,
  sendJson,
  verifyWebhookSignature
} = require("../_cashfree");
const {
  appendWebhook,
  creditWalletOnce,
  getTransaction,
  markTransaction
} = require("../_transactions");
const { updateApplicationPayment } = require("../_applications");

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1024 * 1024) {
        request.destroy();
        reject(new Error("Webhook payload is too large."));
      }
    });
    request.on("end", () => resolve(rawBody));
    request.on("error", reject);
  });
}

function getHeader(request, name) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getEventType(payload) {
  return String(payload.type || payload.event || payload.event_type || "").toLowerCase();
}

function getOrderId(payload) {
  return String(
    payload?.data?.order?.order_id
    || payload?.data?.payment?.order_id
    || payload?.data?.order_id
    || payload?.order?.order_id
    || payload?.order_id
    || ""
  );
}

function getAmount(payload) {
  return Number(
    payload?.data?.order?.order_amount
    || payload?.data?.payment?.payment_amount
    || payload?.order?.order_amount
    || payload?.order_amount
    || 0
  );
}

async function processWebhook(payload) {
  const eventType = getEventType(payload);
  const orderId = getOrderId(payload);
  const amount = getAmount(payload);

  await appendWebhook(payload);

  if (!orderId) {
    return;
  }

  if (eventType === "payment.success") {
    const existingTransaction = await getTransaction(orderId);

    if (existingTransaction?.status === "SUCCESS") {
      return;
    }

    const transaction = await markTransaction(orderId, "SUCCESS", payload.data || payload);
    await updateApplicationPayment(transaction.applicationId || transaction.acknowledgement, {
      orderId,
      paymentStatus: "SUCCESS"
    });
    await creditWalletOnce(orderId, amount);
    return;
  }

  if (eventType === "payment.failed") {
    const transaction = await markTransaction(orderId, "FAILED", payload.data || payload);
    await updateApplicationPayment(transaction.applicationId || transaction.acknowledgement, {
      orderId,
      paymentStatus: "FAILED"
    });
    return;
  }

  if (eventType === "payment.user_dropped") {
    const transaction = await markTransaction(orderId, "CANCELLED", payload.data || payload);
    await updateApplicationPayment(transaction.applicationId || transaction.acknowledgement, {
      orderId,
      paymentStatus: "CANCELLED"
    });
  }
}

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  try {
    const rawBody = await readRawBody(request);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const config = getConfig();
    const signature = getHeader(request, "x-webhook-signature");
    const timestamp = getHeader(request, "x-webhook-timestamp");

    if (process.env.NODE_ENV !== "production") {
      console.log("Cashfree webhook payload", payload);
    }

    if (config.webhookSecret && !verifyWebhookSignature(rawBody, signature, timestamp, config)) {
      return sendJson(response, 401, { ok: false, error: "Invalid webhook signature." });
    }

    await processWebhook(payload);
    return sendJson(response, 200, { ok: true });
  } catch (error) {
    console.error("Cashfree webhook processing error", error);
    return sendJson(response, 200, { ok: true });
  }
};
