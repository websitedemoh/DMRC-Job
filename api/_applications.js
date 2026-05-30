const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createSign } = require("node:crypto");

const isVercel = Boolean(process.env.VERCEL);
const storePath = isVercel
  ? path.join("/tmp", "dmrc-applications.json")
  : path.join(process.cwd(), "data", "applications.json");
const uploadsDir = isVercel
  ? path.join("/tmp", "dmrc-application-uploads")
  : path.join(process.cwd(), "data", "application-uploads");

let memoryStore = {
  applications: []
};
let googleTokenCache = {
  accessToken: "",
  expiresAt: 0
};

function getSupabaseConfig() {
  return {
    url: String(process.env.SUPABASE_URL || "").replace(/\/$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "dmrc-applications"
  };
}

function getMaxFileBytes() {
  return Number(process.env.APPLICATION_FILE_MAX_MB || 5) * 1024 * 1024;
}

function isGoogleSheetsRequired() {
  return String(process.env.GOOGLE_SHEETS_REQUIRED || "false").toLowerCase() === "true";
}

function isAppsScriptRequired() {
  return String(process.env.GOOGLE_APPS_SCRIPT_REQUIRED || "false").toLowerCase() === "true";
}

function getAppsScriptUrl() {
  return String(process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
}

function getGoogleSheetsConfig() {
  return {
    spreadsheetId: String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim(),
    sheetName: String(process.env.GOOGLE_SHEETS_SHEET_NAME || "Applications").trim(),
    serviceAccountEmail: String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim(),
    privateKey: String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim()
  };
}

function hasGoogleSheetsConfig(config) {
  return Boolean(config.spreadsheetId && config.sheetName && config.serviceAccountEmail && config.privateKey);
}

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createGoogleServiceJwt(config) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const payload = {
    iss: config.serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");

  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(config.privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${unsignedToken}.${signature}`;
}

async function getGoogleAccessToken(config) {
  if (googleTokenCache.accessToken && Date.now() < googleTokenCache.expiresAt) {
    return googleTokenCache.accessToken;
  }

  const assertion = createGoogleServiceJwt(config);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Could not get Google access token.");
  }

  const expiresInSeconds = Number(data.expires_in || 3600);

  googleTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(30, expiresInSeconds - 60) * 1000
  };

  return googleTokenCache.accessToken;
}

function getSheetRange(sheetName) {
  const escapedSheetName = String(sheetName || "Applications").replace(/'/g, "''");
  return `'${escapedSheetName}'!A:Z`;
}

function getApplicationSheetRow(application) {
  const files = application.files || {};
  const photo = files.photo || {};
  const marksheet = files.marksheet || {};
  const aadhar = files.aadhar || {};

  return [
    application.createdAt || "",
    application.updatedAt || "",
    application.applicationId || "",
    application.acknowledgement || "",
    application.name || "",
    application.father || "",
    application.post || "",
    application.category || "",
    application.serviceCode || "",
    application.serviceName || "",
    application.fee || 0,
    application.mobile || "",
    application.email || "",
    application.dob || "",
    application.address || "",
    application.paymentStatus || "",
    application.orderId || "",
    photo.originalName || "",
    photo.path || "",
    marksheet.originalName || "",
    marksheet.path || "",
    aadhar.originalName || "",
    aadhar.path || ""
  ];
}

async function appendApplicationToGoogleSheet(application) {
  const config = getGoogleSheetsConfig();

  if (!hasGoogleSheetsConfig(config)) {
    if (isGoogleSheetsRequired()) {
      throw new Error("Google Sheets sync is required but config is missing.");
    }
    return;
  }

  const accessToken = await getGoogleAccessToken(config);
  const range = getSheetRange(config.sheetName);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}`
    + `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      majorDimension: "ROWS",
      values: [getApplicationSheetRow(application)]
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "Google Sheets append failed.");
  }
}

async function appendApplicationToAppsScript(application) {
  const url = getAppsScriptUrl();

  if (!url) {
    if (isAppsScriptRequired()) {
      throw new Error("Google Apps Script sync is required but GOOGLE_APPS_SCRIPT_URL is missing.");
    }
    return false;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(application)
  });
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Apps Script sync failed with status ${response.status}.`);
  }

  try {
    const data = raw ? JSON.parse(raw) : {};

    if (data && data.ok === false) {
      throw new Error(data.error || "Apps Script returned error.");
    }
  } catch (error) {
    if (isAppsScriptRequired()) {
      throw error;
    }
  }

  return true;
}

function sanitizeText(value, maxLength = 300) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function safeFileName(fileName) {
  const cleaned = String(fileName || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return cleaned || "document";
}

function parseDataUrl(file, label) {
  if (!file || !file.dataUrl) {
    throw new Error(`${label} file is required.`);
  }

  const match = String(file.dataUrl).match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error(`${label} file is invalid.`);
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const allowed = contentType.startsWith("image/") || contentType === "application/pdf";

  if (!allowed) {
    throw new Error(`${label} must be an image or PDF file.`);
  }

  if (buffer.length > getMaxFileBytes()) {
    throw new Error(`${label} must be ${process.env.APPLICATION_FILE_MAX_MB || 5} MB or smaller.`);
  }

  return {
    buffer,
    contentType,
    fileName: safeFileName(file.name),
    size: Number(file.size || buffer.length)
  };
}

async function readStore() {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return memoryStore;
  }
}

async function writeStore(store) {
  memoryStore = store;

  try {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Vercel filesystem is temporary. Supabase should be configured for production persistence.
  }
}

async function uploadToSupabase({ applicationId, kind, file }) {
  const config = getSupabaseConfig();

  if (!config.url || !config.serviceRoleKey) {
    return null;
  }

  const objectPath = `${applicationId}/${kind}-${Date.now()}-${file.fileName}`;
  const uploadUrl = `${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "Content-Type": file.contentType,
      "x-upsert": "true"
    },
    body: file.buffer
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Could not upload ${kind} to storage.`);
  }

  return {
    storage: "supabase",
    bucket: config.bucket,
    path: objectPath,
    contentType: file.contentType,
    originalName: file.fileName,
    size: file.size
  };
}

async function saveLocalFile({ applicationId, kind, file }) {
  const localDir = path.join(uploadsDir, applicationId);
  const filePath = path.join(localDir, `${kind}-${Date.now()}-${file.fileName}`);

  await fs.mkdir(localDir, { recursive: true });
  await fs.writeFile(filePath, file.buffer);

  return {
    storage: "local",
    path: filePath,
    contentType: file.contentType,
    originalName: file.fileName,
    size: file.size
  };
}

async function storeFile(applicationId, kind, file) {
  const supabaseFile = await uploadToSupabase({ applicationId, kind, file });
  return supabaseFile || saveLocalFile({ applicationId, kind, file });
}

async function saveApplicationRecord(payload) {
  const phone = normalizePhone(payload.mobile);

  if (phone.length !== 10) {
    throw new Error("Mobile number must be a 10 digit number.");
  }

  if (!sanitizeText(payload.name, 100) || !String(payload.email || "").includes("@")) {
    throw new Error("Candidate name and valid email are required.");
  }

  const applicationId = sanitizeText(payload.acknowledgement, 80) || `APP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const files = payload.files || {};
  const photo = parseDataUrl(files.photo, "Photo");
  const marksheet = parseDataUrl(files.marksheet, "Marksheet");
  const aadhar = parseDataUrl(files.aadhar, "Aadhar card");
  const savedFiles = {
    photo: await storeFile(applicationId, "photo", photo),
    marksheet: await storeFile(applicationId, "marksheet", marksheet),
    aadhar: await storeFile(applicationId, "aadhar", aadhar)
  };
  const now = new Date().toISOString();
  const application = {
    applicationId,
    acknowledgement: applicationId,
    name: sanitizeText(payload.name, 100),
    father: sanitizeText(payload.father, 100),
    post: sanitizeText(payload.post, 120),
    category: sanitizeText(payload.category, 20).toUpperCase(),
    serviceCode: sanitizeText(payload.serviceCode, 60),
    serviceName: sanitizeText(payload.serviceName, 120),
    mobile: phone,
    email: sanitizeText(payload.email, 120),
    dob: sanitizeText(payload.dob, 20),
    address: sanitizeText(payload.address, 500),
    fee: Number(payload.fee || 0),
    paymentStatus: sanitizeText(payload.paymentStatus || "PENDING", 30),
    orderId: sanitizeText(payload.orderId || "", 80),
    files: savedFiles,
    createdAt: now,
    updatedAt: now
  };
  const store = await readStore();
  const existingIndex = store.applications.findIndex((item) => item.applicationId === application.applicationId);

  if (existingIndex >= 0) {
    store.applications[existingIndex] = {
      ...store.applications[existingIndex],
      ...application,
      createdAt: store.applications[existingIndex].createdAt,
      updatedAt: now
    };
  } else {
    store.applications.unshift(application);
  }

  await writeStore(store);

  try {
    const sentToAppsScript = await appendApplicationToAppsScript(application);

    if (!sentToAppsScript) {
      await appendApplicationToGoogleSheet(application);
    }
  } catch (error) {
    if (isGoogleSheetsRequired() || isAppsScriptRequired()) {
      throw error;
    }
    console.error("Google Sheets sync skipped:", error.message);
  }

  return application;
}

async function updateApplicationPayment(applicationId, updates) {
  if (!applicationId) {
    return null;
  }

  const store = await readStore();
  const existing = store.applications.find((item) => item.applicationId === applicationId || item.acknowledgement === applicationId);

  if (!existing) {
    return null;
  }

  Object.assign(existing, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await writeStore(store);
  return existing;
}

async function listApplications() {
  const store = await readStore();
  return store.applications || [];
}

async function createSignedUrl(file) {
  const config = getSupabaseConfig();

  if (!file || file.storage !== "supabase" || !config.url || !config.serviceRoleKey) {
    return null;
  }

  const response = await fetch(`${config.url}/storage/v1/object/sign/${encodeURIComponent(file.bucket)}/${file.path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn: 3600 })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.signedURL) {
    return null;
  }

  return `${config.url}/storage/v1${data.signedURL}`;
}

module.exports = {
  createSignedUrl,
  listApplications,
  saveApplicationRecord,
  updateApplicationPayment
};
