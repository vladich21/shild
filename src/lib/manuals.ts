const MODEL_MANUALS = [
  {
    brand: "aeg",
    model: "bpe742380b",
    url: "https://www.aeg.nl/kitchen/cooking/ovens/oven/bpe742380b/",
  },
];

export function resolveManual(brand: string, model: string): string {
  const exact = exactManual(brand, model);
  if (exact) return exact;
  return manualSearchUrl(brand, model);
}

export function manualForDevice(stored: string, brand: string, model: string): string {
  const exact = exactManual(brand, model);
  if (exact) return exact;
  if (stored && mentionsModel(stored, model)) return stored;
  return resolveManual(brand, model);
}

export function manualSearchUrl(brand: string, model: string) {
  const query = [brand, model, "инструкция по эксплуатации"].map((part) => part.trim()).filter(Boolean).join(" ");
  if (!query) return "";
  return `https://yandex.ru/search/?text=${encodeURIComponent(query)}`;
}

export function manualLookupPrompt(brand: string, model: string) {
  return `Найди официальную страницу инструкции именно для модели «${brand} ${model}».
Верни JSON {"url": string}.
url — прямая https-ссылка, в адресе которой есть код модели ${model}.
Если такой страницы нет, url = "".
Не возвращай общую страницу бренда, поиск, магазины и видео.`;
}

export function readManualUrl(input: unknown, model: string): string {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const raw = typeof source.url === "string" ? source.url.trim() : "";
  if (!raw || !mentionsModel(raw, model)) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || blockedHost(host)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function exactManual(brand: string, model: string) {
  const brandKey = compact(brand);
  const modelKey = compact(model);
  if (modelKey.length < 4) return "";
  return (
    MODEL_MANUALS.find((item) => brandKey.includes(item.brand) && modelKey.includes(item.model))?.url ?? ""
  );
}

function mentionsModel(url: string, model: string) {
  const modelKey = compact(model);
  if (modelKey.length < 4) return false;
  return compact(decodeURIComponent(url)).includes(modelKey);
}

function blockedHost(host: string) {
  return ["yandex.", "google.", "youtube.", "ozon.", "wildberries.", "avito.", "dns-shop.", "mvideo.", "market.yandex."].some(
    (name) => host.includes(name),
  );
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "");
}
