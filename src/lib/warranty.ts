import { addMonths, daysUntil, daysWord, formatDate, todayIso } from "./dates";
import type { Device, WarrantySource } from "./types";

export function warrantyEnd(device: Pick<Device, "purchaseDate" | "warrantyMonths">): string | null {
  if (!device.purchaseDate || !device.warrantyMonths) return null;
  return addMonths(device.purchaseDate, device.warrantyMonths);
}

export function warrantySourceLabel(source: WarrantySource): string {
  switch (source) {
    case "document":
      return "Срок был на фото, вы его подтвердили";
    case "user":
      return "Срок введён вручную";
    case "catalog":
      return "Типовой срок из каталога Шильд. Это не проверка у производителя";
    case "manufacturer":
      return "Базовая гарантия производителя. Расширенный срок после регистрации не включён";
    default:
      return "Срок гарантии неизвестен";
  }
}

export const WARRANTY_ALERT_DAYS = 10;

export function warrantyAlert(end: string | null) {
  const days = end ? daysUntil(end) : null;
  return {
    days,
    urgent: days !== null && days >= 0 && days <= WARRANTY_ALERT_DAYS,
    over: days !== null && days < 0,
  };
}

export type Reminder = {
  id: string;
  tone: "soon" | "later" | "over" | "urgent";
  title: string;
  detail: string;
};

export function remindersFor(device: Device): Reminder[] {
  const items: Reminder[] = [];
  const end = warrantyEnd(device);

  if (end) {
    const days = daysUntil(end);
    if (days !== null && days < 0) {
      items.push({
        id: "warranty-over",
        tone: "over",
        title: "Гарантия закончилась",
        detail: formatDate(end),
      });
    } else if (days !== null && days <= WARRANTY_ALERT_DAYS) {
      items.push({
        id: "warranty-soon",
        tone: "urgent",
        title: "Скоро конец гарантии",
        detail: `Осталось ${days} ${daysWord(days)}, до ${formatDate(end)}`,
      });
    }
  }

  if (device.purchaseDate) {
    for (const rule of device.maintenance) {
      const next = nextMaintenance(device.purchaseDate, rule.everyMonths);
      if (!next) continue;
      const days = daysUntil(next);
      items.push({
        id: `care-${rule.title}`,
        tone: days !== null && days <= 14 ? "soon" : "later",
        title: rule.title,
        detail: days !== null && days < 0 ? `Срок прошёл ${formatDate(next)}` : `Следующий раз ${formatDate(next)}`,
      });
    }
  }

  return items;
}

function nextMaintenance(start: string, everyMonths: number): string | null {
  const today = todayIso();
  for (let step = 1; step <= 240; step += 1) {
    const cursor = addMonths(start, everyMonths * step);
    if (cursor && cursor >= today) return cursor;
  }
  return null;
}
