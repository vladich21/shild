import type { Recognition } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export function normalizeRecognition(input: unknown): Recognition {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const confidence = asConfidence(source.confidence);

  return {
    brand: asText(source.brand),
    model: asText(source.model),
    deviceType: asText(source.deviceType),
    serialNumber: asText(source.serialNumber),
    store: asText(source.store),
    purchaseDate: asDate(source.purchaseDate),
    priceRub: asMoney(source.priceRub),
    warrantyMonths: asMonths(source.warrantyMonths),
    manufacturerMonths: null,
    manufacturerNote: "",
    manualUrl: "",
    visibleText: Array.isArray(source.visibleText)
      ? source.visibleText.map(asText).filter((item): item is string => Boolean(item)).slice(0, 12)
      : [],
    confidence,
    notes: asText(source.notes) ?? "",
  };
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed === "—") return null;
  return trimmed;
}

function asDate(value: unknown): string | null {
  const text = asText(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function asMoney(value: unknown): number | null {
  const number = asNumber(value);
  if (number === null || number < 0 || number > 10_000_000) return null;
  return Math.round(number);
}

function asMonths(value: unknown): number | null {
  const number = asNumber(value);
  if (number === null || number < 1 || number > 120) return null;
  return Math.round(number);
}

function asConfidence(value: unknown): number | null {
  const number = asNumber(value);
  if (number === null) return null;
  const ratio = number > 1 ? number / 100 : number;
  if (ratio < 0 || ratio > 1) return null;
  return Math.round(ratio * 100) / 100;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function modelsMatch(left: string, right: string) {
  const a = left.toLowerCase().replace(/[^a-zа-я0-9]/gi, "");
  const b = right.toLowerCase().replace(/[^a-zа-я0-9]/gi, "");
  if (a.length < 4 || b.length < 4) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function splitDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
}
