const { createHmac, randomUUID, timingSafeEqual } = require("node:crypto");

function getConfig() {
  const mode = process.env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production";

  return {
    appId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    mode,
    apiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET,
    allowedOrigin: process.env.ALLOWED_ORIGIN || "*",
    baseUrl: mode === "sandbox" ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg"
  };
}

function setCors(response, config = getConfig()) {
  response.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, payload) {
  setCors(response);
  response.setHeader("Cache-Control", "no-store");
  response.status(statusCode).json(payload);
}

function handleOptions(request, response) {
  if (request.method !== "OPTIONS") {
    return false;
  }

  setCors(response);
  response.status(204).end();
  return true;
}

function validateConfig(config = getConfig()) {
  if (!config.appId || !config.secretKey) {
    throw new Error("Cashfree credentials are missing. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Vercel environment variables.");
  }
}

function getJsonBody(request) {
  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  return request.body || {};
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function getRequestOrigin(request) {
  const origin = request.headers.origin;

  if (origin) {
    return origin;
  }

  const host = request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "https";

  return `${protocol}://${host}`;
}

function getCashfreeHeaders(config = getConfig()) {
  return {
    "Content-Type": "application/json",
    "x-api-version": config.apiVersion,
    "x-client-id": config.appId,
    "x-client-secret": config.secretKey
  };
}

function getIdempotencyHeaders(config = getConfig()) {
  return {
    ...getCashfreeHeaders(config),
    "x-idempotency-key": randomUUID()
  };
}

function verifyWebhookSignature(rawBody, signature, timestamp, config = getConfig()) {
  const webhookSecret = config.webhookSecret || config.secretKey;

  if (!webhookSecret || !signature || !timestamp) {
    return false;
  }

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

module.exports = {
  getConfig,
  getRequestOrigin,
  getJsonBody,
  getCashfreeHeaders,
  getIdempotencyHeaders,
  handleOptions,
  normalizePhone,
  sendJson,
  validateConfig,
  verifyWebhookSignature
};
