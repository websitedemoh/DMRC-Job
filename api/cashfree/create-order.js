const {
  getConfig,
  getIdempotencyHeaders,
  getJsonBody,
  getRequestOrigin,
  handleOptions,
  normalizePhone,
  sendJson,
  validateConfig
} = require("../_cashfree");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  try {
    const config = getConfig();
    validateConfig(config);

    const payload = getJsonBody(request);
    const amount = Number(payload.amount);
    const customer = payload.customer || {};
    const customerPhone = normalizePhone(customer.phone);

    if (!Number.isFinite(amount) || amount < 1) {
      return sendJson(response, 400, { error: "Invalid payment amount." });
    }

    if (customerPhone.length !== 10) {
      return sendJson(response, 400, { error: "Customer phone must be a 10 digit mobile number." });
    }

    const orderId = `DMRC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const origin = getRequestOrigin(request);
    const orderPayload = {
      order_id: orderId,
      order_amount: Number(amount.toFixed(2)),
      order_currency: "INR",
      customer_details: {
        customer_id: String(payload.acknowledgement || orderId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45),
        customer_name: String(customer.name || "DMRC Applicant").slice(0, 100),
        customer_email: String(customer.email || "").slice(0, 100),
        customer_phone: customerPhone
      },
      order_meta: {
        return_url: `${origin}/index.html?order_id=${orderId}`
      },
      order_note: "DMRC Apprentice application fee",
      order_tags: {
        acknowledgement: String(payload.acknowledgement || ""),
        category: String(payload.category || ""),
        post: String(payload.post || "")
      }
    };

    const cashfreeResponse = await fetch(`${config.baseUrl}/orders`, {
      method: "POST",
      headers: getIdempotencyHeaders(config),
      body: JSON.stringify(orderPayload)
    });
    const cashfreeData = await cashfreeResponse.json().catch(() => ({}));

    if (!cashfreeResponse.ok) {
      return sendJson(response, cashfreeResponse.status, {
        error: cashfreeData.message || cashfreeData.error_description || "Cashfree order creation failed."
      });
    }

    return sendJson(response, 200, {
      orderId: cashfreeData.order_id,
      paymentSessionId: cashfreeData.payment_session_id,
      amount: cashfreeData.order_amount,
      currency: cashfreeData.order_currency,
      mode: config.mode
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message });
  }
};
