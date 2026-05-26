const {
  getCashfreeHeaders,
  getConfig,
  handleOptions,
  sendJson,
  validateConfig
} = require("../_cashfree");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  try {
    const config = getConfig();
    validateConfig(config);

    const orderId = request.query.order_id;

    if (!orderId) {
      return sendJson(response, 400, { error: "Missing order_id." });
    }

    const cashfreeResponse = await fetch(`${config.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      headers: getCashfreeHeaders(config)
    });
    const cashfreeData = await cashfreeResponse.json().catch(() => ({}));

    if (!cashfreeResponse.ok) {
      return sendJson(response, cashfreeResponse.status, {
        error: cashfreeData.message || cashfreeData.error_description || "Could not fetch Cashfree order status."
      });
    }

    return sendJson(response, 200, {
      orderId: cashfreeData.order_id,
      orderStatus: cashfreeData.order_status,
      amount: cashfreeData.order_amount,
      currency: cashfreeData.order_currency
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message });
  }
};
