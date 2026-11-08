import { matchCatalog } from "@/lib/catalog";
import { manualLookupPrompt, readManualUrl, resolveManual } from "@/lib/manuals";
import {
  knownManufacturerWarranty,
  manufacturerWarrantyPrompt,
  readManufacturerWarranty,
} from "@/lib/manufacturerWarranty";
import { DEFAULT_GEMINI_MODEL, normalizeRecognition, splitDataUrl } from "@/lib/recognition";
import type { Recognition } from "@/lib/types";

export const dynamic = "force-dynamic";

const PROMPT = `Ты читаешь фото для сервиса «Шильд», личного паспорта одной единицы техники.
Снимков может быть два, у каждого есть подпись.

«Фото техники или наклейки» — источник бренда, модели, типа устройства и серийного номера.
«Фото чека или гарантийного талона» — это либо кассовый чек, либо гарантийный талон. Оба годятся.

Сначала сверь второй снимок с наклейкой. Талон или строка чека относятся к этой технике, если бренд и модель совпадают с наклейкой: «TP-Link» и «Archer C24» на талоне — то же устройство, что «TP-Link Archer C24» на шильдике. Совпадение серийного номера тоже подтверждает. «Zyxel Keenetic» — уже другая техника.
Если совпало, забери с талона или из подходящей строки чека только то, что там прямо написано: магазин, дату покупки или продажи, цену и срок гарантии.
Если бренд и модель на талоне не совпали с наклейкой, цену, дату и магазин не бери. В notes напиши, что талон от другой техники.

На чеке часто несколько покупок. Цену бери только из строки про эту технику. Магазин и дату — из шапки чека, и только если такая строка нашлась.
Не выбирай первую, последнюю или самую дорогую строку. Итоговую сумму чека не бери.
Если даты покупки или продажи нет ни на чеке, ни на талоне, purchaseDate = null. Не выдумывай дату.
warrantyMonths заполняй только когда срок прямо написан: «12 месяцев» или «1 год» — это 12. Срок «после регистрации» и расширенную гарантию не бери. Не угадывай 12 месяцев, если срока на снимке нет.

Если наклейки нет и на втором снимке одна техника — заполни бренд, модель и цену из него.
Если наклейки нет и покупок несколько — не угадывай устройство: brand, model и priceRub оставь пустыми, а строки перечисли в notes.

Верни только то, что реально видно. Если поля нет, ставь null.
purchaseDate верни в формате YYYY-MM-DD.
priceRub — число рублей за одну единицу этой техники, без валюты.
confidence — число от 0 до 1.`;

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

  let body: { deviceImage?: string | null; receiptImage?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Не удалось отправить фото. Попробуйте ещё раз." }, { status: 400 });
  }

  const images = [
    labeled("Фото техники или наклейки", body.deviceImage),
    labeled("Фото чека или гарантийного талона", body.receiptImage),
  ].filter((item): item is { label: string; mimeType: string; data: string } => Boolean(item));

  if (images.length === 0) {
    return Response.json({ error: "Сначала добавьте фото техники или чека." }, { status: 400 });
  }

  if (images.some((image) => image.data.length > 5_000_000)) {
    return Response.json({ error: "Фото слишком большое. Снимите его ближе и загрузите ещё раз." }, { status: 413 });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const parts = [
    { text: PROMPT },
    ...images.flatMap((image) => [
      { text: image.label },
      { inlineData: { mimeType: image.mimeType, data: image.data } },
    ]),
  ];

  try {
    const payload = await generate(model, key, parts);
    const recognition = normalizeRecognition(payload);
    await attachManufacturerWarranty(recognition, model, key);
    if (recognition.brand && recognition.model) {
      recognition.manualUrl = await findManual(recognition.brand, recognition.model, model, key);
    }
    return Response.json({ recognition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: plainRecognizeError(message) }, { status: 502 });
  }
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

async function generate(
  model: string,
  key: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  let result = await requestGemini(url, key, body);
  if (!result.ok && result.status >= 500) {
    result = await requestGemini(url, key, body);
  }
  if (!result.ok) throw new Error(modelError(result.status));
  return readModelJson(result.data);
}

async function requestGemini(url: string, key: string, body: unknown) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Нет связи с сервисом чтения фото. Проверьте интернет и попробуйте снова.");
  }
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function readModelJson(data: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}) {
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "");

  if (!text) {
    throw new Error("Не удалось прочитать текст на фото. Снимите наклейку или чек крупнее.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Не удалось разобрать фото. Попробуйте другой снимок.");
  }
}

function modelError(status: number) {
  if (status === 401 || status === 403) {
    return "Ключ для чтения фото не подошёл. Проверьте его и обновите страницу.";
  }
  if (status === 429) {
    return "Слишком много попыток подряд. Подождите минуту и загрузите фото ещё раз.";
  }
  if (status === 400) {
    return "Не получилось прочитать эти фото. Снимите наклейку и чек крупнее и попробуйте снова.";
  }
  if (status === 404) {
    return "Сервис чтения фото сейчас недоступен. Попробуйте позже.";
  }
  if (status >= 500) {
    return "Сервис чтения фото сейчас не отвечает. Попробуйте ещё раз через минуту.";
  }
  return "Не удалось распознать фото. Попробуйте другой снимок.";
}

function plainRecognizeError(message: string) {
  if (!message || message.length > 240 || /[{}[\]]|\(\d{3}\)|\bfetch\b|\bstatus\b/i.test(message)) {
    return "Не удалось распознать фото. Попробуйте ещё раз.";
  }
  return message;
}
