import { applicationFees, type CandidateCategory } from "@/lib/constants";

export type ApplicationInput = {
  candidateName: string;
  fatherName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  category: CandidateCategory;
  postApplied: string;
  address: string;
  amount?: number;
};

export type ValidationResult =
  | { ok: true; data: ApplicationInput; amount: number }
  | { ok: false; error: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[6-9]\d{9}$/;

export function sanitizeText(value: unknown, maxLength = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength = 800) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function isCandidateCategory(value: unknown): value is CandidateCategory {
  return typeof value === "string" && value in applicationFees;
}

export function validateApplicationInput(payload: unknown): ValidationResult {
  const source = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const category = source.category;

  if (!isCandidateCategory(category)) {
    return { ok: false, error: "Please select a valid category." };
  }

  const data: ApplicationInput = {
    candidateName: sanitizeText(source.candidateName, 100),
    fatherName: sanitizeText(source.fatherName, 100),
    email: sanitizeText(source.email, 120).toLowerCase(),
    phone: sanitizeText(source.phone, 20).replace(/\D/g, ""),
    dateOfBirth: sanitizeText(source.dateOfBirth, 20),
    category,
    postApplied: sanitizeText(source.postApplied || "DMRC Apprentice Information Demo", 140),
    address: sanitizeMultiline(source.address, 800),
    amount: source.amount === undefined ? undefined : Number(source.amount)
  };
  const amount = applicationFees[category];

  if (!data.candidateName || !data.fatherName || !data.email || !data.phone || !data.dateOfBirth || !data.address) {
    return { ok: false, error: "Please fill all required fields." };
  }

  if (!emailPattern.test(data.email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (!phonePattern.test(data.phone)) {
    return { ok: false, error: "Please enter a valid 10 digit Indian mobile number." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth)) {
    return { ok: false, error: "Please enter a valid date of birth." };
  }

  if (data.amount !== undefined && data.amount !== amount) {
    return { ok: false, error: "Fee amount mismatch. Please refresh the page and try again." };
  }

  return { ok: true, data, amount };
}
