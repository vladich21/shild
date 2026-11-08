import { matchCatalog } from "./catalog";

const KNOWN: Array<{ model: string; brand: string }> = [
  { model: "bpe742380b", brand: "AEG" },
  { model: "kgn49xi20r", brand: "Bosch" },
];

export function knownBrand(model: string) {
  const key = compact(model);
  if (key.length < 4) return "";
  return KNOWN.find((item) => key === item.model || (item.model.length >= 6 && key.includes(item.model)))?.brand ?? "";
}

export function brandPrompt(model: string) {
  return `По точному коду модели «${model}» определи бренд производителя техники.
Верни JSON: {"brand": string | null}.
brand — только название бренда, как его пишет производитель: Bosch, AEG, Samsung, LG, TP-Link.
Не возвращай магазин, серию и тип техники.
Если по этому коду бренд неясен, brand = null. Не угадывай по похожим моделям.`;
}

export function readBrand(input: unknown, model: string) {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const brand = typeof source.brand === "string" ? source.brand.trim() : "";
  if (!brand || brand.toLowerCase() === "null" || brand.length > 40) return "";
  if (compact(brand) === compact(model)) return "";
  if (/\d{3,}/.test(brand)) return "";
  return brand;
}

export async function resolveBrand(model: string, ask: (prompt: string) => Promise<unknown>) {
  const ready = knownBrand(model) || matchCatalog("", model)?.brand || "";
  if (ready) return ready;
  try {
    return readBrand(await ask(brandPrompt(model)), model);
  } catch {
    return "";
  }
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "");
}
