const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  createSignedUrl,
  listApplications,
  saveApplicationRecord,
  updateApplicationVerification
} = require("./api/_applications");

const rootDir = __dirname;
const port = Number(process.env.PORT || 3000);
const maxJsonBodyBytes = Number(process.env.MAX_JSON_BODY_BYTES || 15 * 1024 * 1024);

loadLocalEnv();

const cashfreeConfig = {
  appId: process.env.CASHFREE_APP_ID,
  secretKey: process.env.CASHFREE_SECRET_KEY,
  mode: process.env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production",
  apiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "*"
};

const cashfreeBaseUrl =
  cashfreeConfig.mode === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";

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

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": cashfreeConfig.allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > maxJsonBodyBytes) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });

    request.on("error", reject);
  });
}

function getRequestOrigin(request) {
  const host = request.headers.host || `127.0.0.1:${port}`;
  const protocol = request.headers["x-forwarded-proto"] || "http";

  return `${protocol}://${host}`;
}

function validateCashfreeConfig() {
  if (!cashfreeConfig.appId || !cashfreeConfig.secretKey) {
    throw new Error("Cashfree credentials are missing. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY to .env.");
  }
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

async function createCashfreeOrder(request, response) {
  try {
    validateCashfreeConfig();

    const payload = await readJsonBody(request);
    const serviceCode = String(payload.serviceCode || "").toUpperCase();
    const selectedService = servicesByCode[serviceCode];
    const expectedAmount = selectedService && selectedService.amount;
    const amount = Number(payload.amount);
    const customer = payload.customer || {};
    const customerPhone = normalizePhone(customer.phone);

    if (serviceCode !== `${String(payload.category || "").toUpperCase()}_CATEGORY`) {
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
      order_note: `DMRC Job - ${selectedService.name}`,
      order_tags: {
        acknowledgement: String(payload.acknowledgement || ""),
        applicationId: String(payload.applicationId || payload.acknowledgement || ""),
        category: String(payload.category || ""),
        post: String(payload.post || ""),
        serviceCode,
        serviceName: selectedService.name
      }
    };

    const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": cashfreeConfig.apiVersion,
        "x-client-id": cashfreeConfig.appId,
        "x-client-secret": cashfreeConfig.secretKey,
        "x-idempotency-key": randomUUID()
      },
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
      mode: cashfreeConfig.mode
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message });
  }
}

async function saveApplication(request, response) {
  try {
    const payload = await readJsonBody(request);
    const application = await saveApplicationRecord(payload);

    return sendJson(response, 200, {
      ok: true,
      applicationId: application.applicationId,
      acknowledgement: application.acknowledgement,
      paymentStatus: application.paymentStatus
    });
  } catch (error) {
    return sendJson(response, 400, { error: error.message });
  }
}

async function getCashfreeOrderStatus(request, response, url) {
  try {
    validateCashfreeConfig();

    const orderId = url.searchParams.get("order_id");

    if (!orderId) {
      return sendJson(response, 400, { error: "Missing order_id." });
    }

    const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        "x-api-version": cashfreeConfig.apiVersion,
        "x-client-id": cashfreeConfig.appId,
        "x-client-secret": cashfreeConfig.secretKey
      }
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
}

async function listStoredApplications(response, url) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const password = String(url.searchParams.get("password") || "");

  if (adminPassword && password !== adminPassword) {
    return sendJson(response, 401, { error: "Invalid admin password." });
  }

  if (!adminPassword) {
    return sendJson(response, 500, { error: "ADMIN_PASSWORD is not configured." });
  }

  const applications = await listApplications();
  const withLinks = await Promise.all(applications.map(async (application) => ({
    ...application,
    fileLinks: {
      photo: await createSignedUrl(application.files?.photo),
      marksheet: await createSignedUrl(application.files?.marksheet),
      aadhar: await createSignedUrl(application.files?.aadhar),
      categoryCertificate: await createSignedUrl(application.files?.categoryCertificate)
    }
  })));

  return sendJson(response, 200, {
    ok: true,
    applications: withLinks
  });
}

async function verifyStoredApplication(request, response, url) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const payload = await readJsonBody(request);
  const password = String(url.searchParams.get("password") || payload.password || "");

  if (adminPassword && password !== adminPassword) {
    return sendJson(response, 401, { error: "Invalid admin password." });
  }

  if (!adminPassword) {
    return sendJson(response, 500, { error: "ADMIN_PASSWORD is not configured." });
  }

  const applicationId = String(payload.applicationId || "").trim();

  if (!applicationId) {
    return sendJson(response, 400, { error: "applicationId is required." });
  }

  const updated = await updateApplicationVerification(applicationId, {
    status: payload.status,
    remarks: payload.remarks,
    verifiedBy: payload.verifiedBy
  });

  if (!updated) {
    return sendJson(response, 404, { error: "Application not found." });
  }

  return sendJson(response, 200, {
    ok: true,
    applicationId: updated.applicationId,
    verification: updated.verification
  });
}

function serveStaticFile(request, response, url) {
  const cleanRoutes = {
    "/contact-us": "/contact-us.html",
    "/terms-and-conditions": "/terms-and-conditions.html",
    "/refunds-and-cancellations": "/refunds-and-cancellations.html"
  };
  const requestedPath = cleanRoutes[url.pathname] || (url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname));
  const filePath = path.resolve(rootDir, `.${requestedPath}`);

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/cashfree/create-order") {
    await createCashfreeOrder(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/applications/save") {
    await saveApplication(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/cashfree/order-status") {
    await getCashfreeOrderStatus(request, response, url);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/applications/list") {
    await listStoredApplications(response, url);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/applications/verify") {
    await verifyStoredApplication(request, response, url);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStaticFile(request, response, url);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed." });
});

server.listen(port, () => {
  console.log(`DMRC recruitment site running at http://127.0.0.1:${port}`);
  console.log(`Cashfree mode: ${cashfreeConfig.mode}`);
});
