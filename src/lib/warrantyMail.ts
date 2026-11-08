import { daysUntil, daysWord, formatDate, formatMoney } from "@/lib/dates";
import type { Device } from "@/lib/types";
import { warrantyEnd } from "@/lib/warranty";

const SOON_DAYS = 10;

export function modelStory(device: Device): string {
  const model = device.model.replace(/\s/g, "").toUpperCase();
  if (model.includes("55UJ630")) {
    return "Это телевизор LG диагональю 55 дюймов, серия UJ630V. Модель с экраном 4K UHD, разрешение 3840×2160.";
  }
  const name = [device.category, device.brand, device.model].filter(Boolean).join(" ");
  const specs = device.specs
    .slice(0, 4)
    .map((spec) => `${spec.label}: ${spec.value}`)
    .join(". ");
  return specs ? `${name}. ${specs}.` : `${name}.`;
}

export function warrantyLetter(device: Device, email: string) {
  const end = warrantyEnd(device);
  const days = end ? daysUntil(end) : null;
  const soon = days !== null && days >= 0 && days <= SOON_DAYS;
  const over = days !== null && days < 0;
  const name = device.title || [device.brand, device.model].filter(Boolean).join(" ");
  const headline = soon ? "Скоро закончится гарантия" : over ? "Гарантия закончилась" : "Напоминание о гарантии";
  const endLabel = end ? formatDate(end).replace(/\.$/, "") : "";
  const lead = soon
    ? `До конца гарантии на «${name}» осталось ${days} ${daysWord(days ?? 0)}.`
    : over
      ? `Гарантия на «${name}» закончилась ${endLabel}.`
      : `Гарантия на «${name}» действует до ${endLabel || "неизвестной даты"}. Когда срок закончится, на почту кабинета уйдёт уведомление.`;

  const subject = `${headline}: ${name}`;
  const html = renderLetter({
    email,
    headline,
    lead,
    name,
    story: modelStory(device),
    end: end ? formatDate(end) : "не указана",
    brand: device.brand || "не указан",
    model: device.model || "не указана",
    category: device.category || "не указана",
    serial: device.serialNumber || "не указан",
    store: device.store || "не указан",
    bought: device.purchaseDate ? formatDate(device.purchaseDate) : "не указана",
    price: device.priceRub !== null ? formatMoney(device.priceRub) : "не указана",
  });

  return { subject, html, soon, over, end };
}

function renderLetter(letter: {
  email: string;
  headline: string;
  lead: string;
  name: string;
  story: string;
  end: string;
  brand: string;
  model: string;
  category: string;
  serial: string;
  store: string;
  bought: string;
  price: string;
}) {
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e(letter.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f3f3;color:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f3;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
          <tr>
            <td style="background:#111111;padding:28px 32px 32px;">
              <img src="/icon.svg" alt="Шильд" width="140" height="88" style="display:block;height:44px;width:auto;border:0;filter:invert(1);" />
              <h1 style="margin:16px 0 0;color:#ffffff;font-size:32px;line-height:1.15;font-weight:500;">${e(letter.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0;font-size:16px;line-height:1.6;">Здравствуйте.</p>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">${e(letter.lead)}</p>
              <p style="margin:28px 0 0;color:#5c5c5c;font-size:12px;letter-spacing:0.18em;">МОДЕЛЬ</p>
              <p style="margin:8px 0 0;font-size:24px;line-height:1.25;font-weight:500;">${e(letter.name)}</p>
              <p style="margin:12px 0 0;color:#3c3c3c;font-size:15px;line-height:1.6;">${e(letter.story)}</p>
              <p style="margin:28px 0 0;color:#5c5c5c;font-size:12px;letter-spacing:0.18em;">ГАРАНТИЯ ДО</p>
              <p style="margin:8px 0 0;color:#ff5a1f;font-size:28px;line-height:1.2;font-weight:500;">${e(letter.end)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #d7d7d7;">
                ${row("Категория", letter.category)}
                ${row("Бренд", letter.brand)}
                ${row("Модель", letter.model)}
                ${row("Серийный номер", letter.serial)}
                ${row("Магазин", letter.store)}
                ${row("Дата покупки", letter.bought)}
                ${row("Цена", letter.price)}
              </table>
              <p style="margin:28px 0 0;color:#5c5c5c;font-size:13px;line-height:1.5;">Письмо подготовлено для ${e(letter.email || "почты кабинета")}.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;color:#5c5c5c;font-size:12px;line-height:1.5;">
              Шильд хранит паспорт техники и напоминает о сроке гарантии.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #d7d7d7;color:#5c5c5c;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:12px 0;border-bottom:1px solid #d7d7d7;font-size:14px;text-align:right;">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
