import { normalizeDevicePatch, type DevicePatchInput } from "@/lib/devicePatch";
import type { WarrantySource } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return Response.json({ error: "Не удалось найти карточку." }, { status: 400 });
  }

  let body: Partial<DevicePatchInput>;
  try {
    body = (await request.json()) as Partial<DevicePatchInput>;
  } catch {
    return Response.json({ error: "Не удалось сохранить данные. Попробуйте ещё раз." }, { status: 400 });
  }

  const result = normalizeDevicePatch({
    title: text(body.title),
    brand: text(body.brand),
    model: text(body.model),
    category: text(body.category),
    serialNumber: text(body.serialNumber),
    store: text(body.store),
    purchaseDate: text(body.purchaseDate),
    priceRub: text(body.priceRub),
    warrantyMonths: text(body.warrantyMonths),
    previousWarrantyMonths: numberOrNull(body.previousWarrantyMonths),
    previousWarrantySource: source(body.previousWarrantySource),
    currentManualUrl: text(body.currentManualUrl),
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ id, patch: result.patch });
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function source(value: unknown): WarrantySource {
  if (value === "document" || value === "user" || value === "catalog" || value === "manufacturer" || value === "unknown") return value;
  return "unknown";
}
