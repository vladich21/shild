export type ManufacturerWarranty = {
  months: number;
  note: string;
};

const KNOWN: Array<{ brand: string; model: string; months: number }> = [
  { brand: "aeg", model: "bpe742380b", months: 12 },
];

export function knownManufacturerWarranty(brand: string, model: string): ManufacturerWarranty | null {
  const brandKey = compact(brand);
  const modelKey = compact(model);
  if (!brandKey || modelKey.length < 4) return null;
  const found = KNOWN.find((item) => brandKey.includes(item.brand) && modelKey.includes(item.model));
  if (!found) return null;
  return { months: found.months, note: baseNote(found.months) };
}

export function manufacturerWarrantyPrompt(brand: string, model: string) {
  return `Нужна только базовая гарантия производителя для «${brand} ${model}» в России.
Верни JSON: {"baseMonths": number | null, "note": string}.
baseMonths — срок в месяцах, который производитель даёт с даты покупки без регистрации товара.
Если на страницах несколько цифр, бери базовую, не максимальную и не «до N лет».
Гарантию магазина и расширенную гарантию после регистрации не возвращай.
Если базовый срок неясен, baseMonths = null, note = "".
Если срок ясен, note — одна короткая фраза: это базовая гарантия производителя, расширенный срок не включён.`;
}

export function readManufacturerWarranty(input: unknown): ManufacturerWarranty | null {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const months = asMonths(source.baseMonths);
  if (!months) return null;
  const note = typeof source.note === "string" ? source.note.trim() : "";
  return { months, note: note || baseNote(months) };
}

function baseNote(months: number) {
  return `Базовая гарантия производителя: ${months} мес. с даты покупки. Расширенный срок после регистрации не подставлен.`;
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "");
}

function asMonths(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < 1 || number > 120) return null;
  return number;
}
