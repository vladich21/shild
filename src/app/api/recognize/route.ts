import { resolveBrand } from "@/lib/brandLookup";
import { CATEGORIES, matchCatalog } from "@/lib/catalog";
import { askGemini } from "@/lib/gemini";
import { manualLookupPrompt, readManualUrl, resolveManual } from "@/lib/manuals";
import {
  knownManufacturerWarranty,
  manufacturerWarrantyPrompt,
  readManufacturerWarranty,
} from "@/lib/manufacturerWarranty";
import { DEFAULT_GEMINI_MODEL, normalizeRecognition, splitDataUrl } from "@/lib/recognition";
import type { Recognition } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CATEGORY_LIST = CATEGORIES.join(", ");

function nameplatePrompt() {
  return `Ты читаешь только фото техники или наклейки для сервиса «Шильд». Чека в этом запросе нет.

brand верни только если бренд написан на наклейке. Не угадывай бренд по модели.
model — код модели как на наклейке. serialNumber — серийный номер, если он написан.
deviceType — одно название из списка, если подходит: ${CATEGORY_LIST}.
Если тип виден, но его нет в списке, напиши коротко по-русски. Не пиши «Другое». Если тип не виден, null.
store, purchaseDate, priceRub и warrantyMonths с наклейки не заполняй: для них нужен чек или талон. Ставь null.
Верни только то, что видно. Если поля нет, null. confidence — число от 0 до 1.`;
}

function receiptPrompt(known: { brand: string; model: string; serialNumber: string }) {
  const knownLines = known.model || known.brand || known.serialNumber
    ? `Наклейка уже прочитана, её фото в запросе нет. С наклейки: бренд «${known.brand || "не написан"}», модель «${known.model || "не написана"}», серийный номер «${known.serialNumber || "не написан"}».
Строка чека или талон — эта техника, если модель совпадает${known.model ? ` с «${known.model}»` : ""}. Совпадение серийного номера тоже подтверждает.
Если на наклейке бренда не было, а на документе та же модель и бренд написан — верни этот brand. Пример: наклейка «KGN49XI20R», талон «Bosch KGN49XI20R» — brand = Bosch.
Если модель другая — brand, store, purchaseDate, priceRub и warrantyMonths = null. В notes напиши, что документ от другой техники.`
    : `Наклейки ещё нет. Если на снимке одна техника — заполни brand, model и цену. Если покупок несколько — не угадывай устройство: brand, model и priceRub = null, строки перечисли в notes.`;

  return `Ты читаешь только фото чека или гарантийного талона для сервиса «Шильд». Наклейку повторно не смотри.

${knownLines}

Бери только написанное: бренд, магазин, дату покупки или продажи, цену одной единицы и срок гарантии.
Цену бери из строки про эту технику. Итог чека не бери. Не выбирай первую, последнюю или самую дорогую строку.
Дату не выдумывай. Если даты нет, purchaseDate = null.
warrantyMonths только если срок написан: «12 месяцев» или «1 год» — это 12. Срок после регистрации и расширенную гарантию не бери.
model верни так, как написано на этом документе.
deviceType — из списка, если тип понятен: ${CATEGORY_LIST}. Если типа нет в списке, короткое русское название. Не пиши «Другое». Если тип не виден, null.
purchaseDate в формате YYYY-MM-DD. priceRub — число рублей. confidence от 0 до 1. Если поля нет, null.`;
}

export async function GET() {
  return Response.json({
    ready: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  });
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      {
        error:
          "Ключ для чтения фото ещё не подключён.",
      },
      { status: 503 },
    );
  }

  let body: {
    image?: string | null;
    kind?: "nameplate" | "receipt";
    known?: { brand?: string; model?: string; serialNumber?: string };
    enrich?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Не удалось отправить фото. Попробуйте ещё раз." }, { status: 400 });
  }

  const kind = body.kind === "receipt" ? "receipt" : "nameplate";
  const known = {
    brand: asKnown(body.known?.brand),
    model: asKnown(body.known?.model),
    serialNumber: asKnown(body.known?.serialNumber),
  };
  const image = labeled(
    kind === "receipt" ? "Фото чека или гарантийного талона" : "Фото техники или наклейки",
    body.image,
  );

  if (!image) {
    return Response.json({ error: "Сначала добавьте фото техники или чека." }, { status: 400 });
  }

  if (image.data.length > 5_000_000) {
    return Response.json({ error: "Фото слишком большое. Снимите его ближе и загрузите ещё раз." }, { status: 413 });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const parts = [
    { text: kind === "receipt" ? receiptPrompt(known) : nameplatePrompt() },
    { text: image.label },
    { inlineData: { mimeType: image.mimeType, data: image.data } },
  ];

  try {
    const payload = await generate(model, key, parts);
    const recognition = normalizeRecognition(payload);
    if (body.enrich !== false) {
      if (!recognition.brand && recognition.model) {
        const found = await resolveBrand(recognition.model, (prompt) => askGemini(key, model, [{ text: prompt }]));
        if (found) recognition.brand = found;
      }
      await Promise.all([
        attachManufacturerWarranty(recognition, model, key),
        fillManual(recognition, model, key),
      ]);
    }
    return Response.json({ recognition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: plainRecognizeError(message) }, { status: 502 });
  }
}

async function fillManual(recognition: Recognition, model: string, key: string) {
  if (!recognition.brand || !recognition.model) return;
  recognition.manualUrl = await findManual(recognition.brand, recognition.model, model, key);
}

function asKnown(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

async function findManual(brand: string, modelName: string, model: string, key: string) {
  const ready = resolveManual(brand, modelName);
  if (ready && !ready.startsWith("https://yandex.ru/search/")) return ready;
  try {
    const payload = await generate(model, key, [{ text: manualLookupPrompt(brand, modelName) }]);
    return readManualUrl(payload, modelName) || ready;
  } catch {
    return ready;
  }
}

async function attachManufacturerWarranty(recognition: Recognition, model: string, key: string) {
  if (recognition.warrantyMonths || !recognition.brand || !recognition.model) return;
  const known = knownManufacturerWarranty(recognition.brand, recognition.model);
  if (known) {
    recognition.manufacturerMonths = known.months;
    recognition.manufacturerNote = known.note;
    return;
  }
  if (matchCatalog(recognition.brand, recognition.model)) return;
  try {
    const payload = await generate(model, key, [{ text: manufacturerWarrantyPrompt(recognition.brand, recognition.model) }]);
    const found = readManufacturerWarranty(payload);
    if (!found) return;
    recognition.manufacturerMonths = found.months;
    recognition.manufacturerNote = found.note;
  } catch {
    return;
  }
}

function labeled(label: string, value: string | null | undefined) {
  if (!value) return null;
  const image = splitDataUrl(value);
  if (!image) return null;
  return { label, ...image };
}

function generate(
  model: string,
  key: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
) {
  return askGemini(key, model, parts);
}

function plainRecognizeError(message: string) {
  if (!message || message.length > 240 || /[{}[\]]|\(\d{3}\)|\bfetch\b|\bstatus\b/i.test(message)) {
    return "Не удалось распознать фото. Попробуйте ещё раз.";
  }
  return message;
}
