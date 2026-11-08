import { CATEGORIES, matchCatalog } from "./catalog";
import type { Device, WarrantySource } from "./types";

export type DevicePatchInput = {
  title: string;
  brand: string;
  model: string;
  category: string;
  serialNumber: string;
  store: string;
  purchaseDate: string;
  priceRub: string;
  warrantyMonths: string;
  previousWarrantyMonths: number | null;
  previousWarrantySource: WarrantySource;
  currentManualUrl: string;
};

export type DevicePatch = Pick<
  Device,
  | "title"
  | "brand"
  | "model"
  | "category"
  | "serialNumber"
  | "store"
  | "purchaseDate"
  | "priceRub"
  | "warrantyMonths"
  | "warrantySource"
  | "catalogId"
  | "manualUrl"
  | "specs"
  | "maintenance"
>;

export function normalizeDevicePatch(input: DevicePatchInput): { ok: true; patch: DevicePatch } | { ok: false; error: string } {
  const brand = input.brand.trim();
  const model = input.model.trim();
  if (!brand || !model) {
    return { ok: false, error: "Нужны бренд и модель. Их можно вписать вручную." };
  }

  let priceRub: number | null = null;
  if (input.priceRub.trim()) {
    const parsed = Number(input.priceRub.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, error: "Цену запишите числом." };
    }
    priceRub = Math.round(parsed);
  }

  let warrantyMonths: number | null = null;
  if (input.warrantyMonths.trim()) {
    const months = Number(input.warrantyMonths);
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      return { ok: false, error: "Срок гарантии укажите числом месяцев, например 12." };
    }
    warrantyMonths = months;
  }

  const purchaseDate = input.purchaseDate.trim();
  if (purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    return { ok: false, error: "Дату покупки выберите в календаре." };
  }

  const catalog = matchCatalog(brand, model);
  const category = (CATEGORIES as readonly string[]).includes(input.category)
    ? input.category
    : catalog?.category ?? "Другое";
  const title = input.title.trim() || [category !== "Другое" ? category : "", brand, model].filter(Boolean).join(" ");

  return {
    ok: true,
    patch: {
      title,
      brand,
      model,
      category,
      serialNumber: input.serialNumber.trim(),
      store: input.store.trim(),
      purchaseDate,
      priceRub,
      warrantyMonths,
      warrantySource: sourceFor(warrantyMonths, input, catalog?.warrantyMonths ?? null),
      catalogId: catalog?.id ?? null,
      manualUrl: input.currentManualUrl.trim() || catalog?.manualUrl || "",
      specs: catalog?.specs ?? [],
      maintenance: catalog?.maintenance ?? [],
    },
  };
}

function sourceFor(
  months: number | null,
  input: DevicePatchInput,
  catalogMonths: number | null,
): WarrantySource {
  if (!months) return "unknown";
  if (
    (input.previousWarrantySource === "document" || input.previousWarrantySource === "manufacturer") &&
    input.previousWarrantyMonths !== null &&
    months === input.previousWarrantyMonths
  ) {
    return input.previousWarrantySource;
  }
  if (catalogMonths !== null && months === catalogMonths) return "catalog";
  return "user";
}
