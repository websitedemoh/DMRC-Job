import { promises as fs } from "node:fs";
import path from "node:path";
import type { ApplicationInput } from "@/lib/validation";

export type PaymentStatus = "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "UNKNOWN";

export type WebhookEvent = {
  receivedAt: string;
  type: string;
  orderId?: string;
  status?: string;
  payload: unknown;
};

export type ApplicationRecord = {
  id: string;
  orderId: string;
  amount: number;
  paymentSessionId?: string;
  paymentStatus: PaymentStatus;
  applicant: ApplicationInput;
  createdAt: string;
  updatedAt: string;
  latestCashfreeResponse?: unknown;
  webhookEvents: WebhookEvent[];
};

type StoreFile = {
  applications: ApplicationRecord[];
  webhookEvents: WebhookEvent[];
};

const dataDirectory = path.join(process.cwd(), "data");
const storePath = path.join(dataDirectory, "applications.json");

let memoryStore: StoreFile = {
  applications: [],
  webhookEvents: []
};

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return memoryStore;
  }
}

async function writeStore(store: StoreFile) {
  memoryStore = store;

  try {
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Vercel serverless filesystem is read-only at runtime; memory fallback keeps the demo route functional.
  }
}

export async function saveApplication(record: ApplicationRecord) {
  const store = await readStore();
  const existingIndex = store.applications.findIndex((item) => item.orderId === record.orderId);

  if (existingIndex >= 0) {
    store.applications[existingIndex] = record;
  } else {
    store.applications.unshift(record);
  }

  await writeStore(store);
  return record;
}

export async function listApplications() {
  const store = await readStore();
  return store.applications;
}

export async function getApplicationByOrderId(orderId: string) {
  const store = await readStore();
  return store.applications.find((item) => item.orderId === orderId) ?? null;
}

export async function updateApplicationPaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  latestCashfreeResponse?: unknown
) {
  const store = await readStore();
  const existing = store.applications.find((item) => item.orderId === orderId);

  if (!existing) {
    return null;
  }

  existing.paymentStatus = paymentStatus;
  existing.updatedAt = new Date().toISOString();
  existing.latestCashfreeResponse = latestCashfreeResponse;
  await writeStore(store);
  return existing;
}

export async function appendWebhookEvent(event: WebhookEvent) {
  const store = await readStore();
  store.webhookEvents.unshift(event);

  if (event.orderId) {
    const application = store.applications.find((item) => item.orderId === event.orderId);

    if (application) {
      application.webhookEvents.unshift(event);

      if (event.status) {
        application.paymentStatus = normalizePaymentStatus(event.status);
      }

      application.updatedAt = new Date().toISOString();
    }
  }

  await writeStore(store);
  return event;
}

export function normalizePaymentStatus(status: unknown): PaymentStatus {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID" || normalized === "SUCCESS") {
    return "PAID";
  }

  if (normalized === "FAILED" || normalized === "USER_DROPPED" || normalized === "EXPIRED") {
    return "FAILED";
  }

  if (normalized === "CANCELLED") {
    return "CANCELLED";
  }

  if (normalized === "ACTIVE" || normalized === "PENDING" || normalized === "CREATED") {
    return "PENDING";
  }

  return "UNKNOWN";
}
