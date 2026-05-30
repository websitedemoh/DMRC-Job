const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

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
