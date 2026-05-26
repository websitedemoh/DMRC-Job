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
const { upsertTransaction } = require("../_transactions");

const servicesByCode = {
  OBC_CATEGORY: {
    name: "OBC Category",
    amount: 350
  },
  GEN_CATEGORY: {
    name: "GEN Category",
    amount: 400
  },
  ST_CATEGORY: {
    name: "ST Category",
    amount: 250
  },
  SC_CATEGORY: {
    name: "SC Category",
    amount: 250
  }
};

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
    const category = String(payload.category || "").toUpperCase();
    const serviceCode = String(payload.serviceCode || "").toUpperCase();
    const selectedService = servicesByCode[serviceCode];
    const expectedAmount = selectedService && selectedService.amount;
    const amount = Number(payload.amount);
    const customer = payload.customer || {};
    const customerPhone = normalizePhone(customer.phone);

    if (serviceCode !== `${category}_CATEGORY`) {
      return sendJson(response, 400, { error: "Payment category must match candidate category." });
    }

    if (!expectedAmount) {
      return sendJson(response, 400, { error: "Invalid category selected." });
    }

    if (amount !== expectedAmount) {
      return sendJson(response, 400, { error: "Invalid payment amount for selected category." });
    }

    if (customerPhone.length !== 10) {
      return sendJson(response, 400, { error: "Customer phone must be a 10 digit mobile number." });
    }

    if (!String(customer.name || "").trim() || !String(customer.email || "").includes("@")) {
      return sendJson(response, 400, { error: "Valid customer name and email are required." });
    }

    const orderId = `DMRC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const origin = getRequestOrigin(request);
    const orderPayload = {
      order_id: orderId,
      order_amount: Number(expectedAmount.toFixed(2)),
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
      order_note: `DMRC Job - ${selectedService.name}`,
      order_tags: {
        acknowledgement: String(payload.acknowledgement || ""),
        category,
        post: String(payload.post || ""),
        serviceCode,
        serviceName: selectedService.name
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

    await upsertTransaction({
      orderId: cashfreeData.order_id,
      amount: cashfreeData.order_amount,
      currency: cashfreeData.order_currency,
      status: cashfreeData.order_status || "PENDING",
      acknowledgement: String(payload.acknowledgement || ""),
      category,
      post: String(payload.post || ""),
      serviceCode,
      serviceName: selectedService.name,
      customer: {
        name: String(customer.name || ""),
        email: String(customer.email || ""),
        phone: customerPhone
      },
      latestCashfreeResponse: cashfreeData
    });

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
