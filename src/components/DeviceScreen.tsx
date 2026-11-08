"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { BackLink } from "@/components/BackLink";
import { CategoryField } from "@/components/CategoryField";
import { fetchBrand } from "@/lib/brandClient";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Field } from "@/components/Field";
import { manualForDevice } from "@/lib/manuals";
import { daysWord, formatDate, formatMoney, formatPriceInput, todayIso } from "@/lib/dates";
import type { DevicePatch } from "@/lib/devicePatch";
import { loadDevices, loadEmail, saveDevices, updateDevice } from "@/lib/storage";
import type { Device } from "@/lib/types";
import { remindersFor, warrantyAlert, warrantyEnd } from "@/lib/warranty";

type FormState = {
  title: string;
  brand: string;
  model: string;
  category: string;
  serialNumber: string;
  store: string;
  purchaseDate: string;
  priceRub: string;
  warrantyMonths: string;
};

export function DeviceScreen({ id }: { id: string }) {
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(() => loadDevices().find((item) => item.id === id) ?? null);
  const [form, setForm] = useState<FormState | null>(() => {
    const found = loadDevices().find((item) => item.id === id);
    return found ? toForm(found) : null;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [email] = useState(() => loadEmail());

  if (!email) return <AuthScreen mode="login" />;

  if (!device || !form) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <h1 className="font-display text-4xl">Карточка не найдена</h1>
        <Link href="/cabinet" className="btn btn-dark mt-6">
          В кабинет
        </Link>
      </div>
    );
  }

  const end = warrantyEnd(device);
  const formMonths = Number(form.warrantyMonths);
  const shownEnd =
    form.purchaseDate && Number.isInteger(formMonths) && formMonths >= 1 && formMonths <= 120
      ? warrantyEnd({ purchaseDate: form.purchaseDate, warrantyMonths: formMonths })
      : end;
  const shownMonths = Number.isInteger(formMonths) && formMonths >= 1 && formMonths <= 120 ? formMonths : device.warrantyMonths;
  const reminders = remindersFor(device);
  const manualUrl = manualForDevice(device.manualUrl, device.brand, device.model);

  function remove() {
    const next = loadDevices().filter((item) => item.id !== device?.id);
    saveDevices(next);
    router.push("/cabinet");
  }

  function edit(key: keyof FormState, value: string) {
    const next = key === "priceRub" ? formatPriceInput(value) : value;
    setForm((current) => (current ? { ...current, [key]: next } : current));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function save() {
    if (!device || !form) return;
    const nextErrors: Record<string, string> = {};
    if (!form.brand.trim()) nextErrors.brand = "Укажите бренд.";
    if (!form.model.trim()) nextErrors.model = "Укажите модель.";
    if (form.priceRub.trim()) {
      const parsed = Number(form.priceRub.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) nextErrors.priceRub = "Запишите цену числом.";
    }
    if (form.warrantyMonths.trim()) {
      const months = Number(form.warrantyMonths);
      if (!Number.isInteger(months) || months < 1 || months > 120) {
        nextErrors.warrantyMonths = "Укажите число месяцев, например 12.";
      }
    }
    setFieldErrors(nextErrors);
    setNotice("");
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          previousWarrantyMonths: device.warrantyMonths,
          previousWarrantySource: device.warrantySource,
          currentManualUrl: manualUrl,
        }),
      });
      let data: { patch?: DevicePatch; error?: string };
      try {
        data = (await response.json()) as { patch?: DevicePatch; error?: string };
      } catch {
        throw new Error("Не удалось сохранить данные. Попробуйте ещё раз.");
      }
      if (!response.ok || !data.patch) {
        throw new Error(plainSaveError(data.error));
      }
      const saved = updateDevice(device.id, data.patch);
      if (!saved) {
        throw new Error("Карточка не найдена в кабинете. Обновите страницу.");
      }
      setDevice(saved);
      setForm(toForm(saved));
      setNotice("Данные сохранены.");
    } catch (reason) {
      setFieldErrors(errorsForMessage(plainSaveError(reason instanceof Error ? reason.message : undefined)));
    } finally {
      setBusy(false);
    }
  }

  const subtitle = [device.brand, device.model].filter(Boolean).join(" ");
  const showSubtitle = subtitle.length > 0 && !device.title.toLowerCase().includes(subtitle.toLowerCase());

  return (
    <div className="mx-auto w-full max-w-7xl px-6 pb-8 pt-8 lg:pt-10">
      <BackLink href="/cabinet" />
      <div className="mt-4 grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="rise flex justify-center bg-[#ececec]">
          {device.photoDataUrl ? (
            // User photos are local data URLs, so the browser image is the right fit.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={device.photoDataUrl} alt="" className="block h-auto max-h-[40rem] w-full object-contain" />
          ) : (
            <div className="grid h-80 w-full place-items-center text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Фото</p>
                <p className="mt-2 text-sm text-muted">Снимок появится после загрузки</p>
              </div>
            </div>
          )}
        </div>

        <div className="rise rise-late min-w-0 pt-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{device.category}</p>
          <h1 className="mt-3 text-[1.75rem] font-medium leading-tight tracking-tight sm:text-[2.5rem] sm:leading-[1.05]">{device.title}</h1>
          {showSubtitle ? <p className="mt-3 text-lg text-muted">{subtitle}</p> : null}

          <dl className="mt-8 border-t border-line">
            <Fact label="Серийный номер" value={device.serialNumber || "не указан"} />
            <Fact label="Магазин" value={device.store || "не указан"} />
            <Fact label="Дата покупки" value={device.purchaseDate ? formatDate(device.purchaseDate) : "не указана"} />
            <WarrantyFact months={shownMonths} end={shownEnd} />
            <Fact label="Цена" value={device.priceRub !== null ? formatMoney(device.priceRub) : "не указана"} />
          </dl>
          {manualUrl ? (
            <p className="mt-4 text-sm">
              Если сломалось —{" "}
              <a href={manualUrl} target="_blank" rel="noreferrer" className="link-orange">
                открыть инструкцию
              </a>
            </p>
          ) : null}

          <div className="mt-5">
            <button type="button" className="btn btn-ghost" disabled={!device.receiptDataUrl} onClick={() => setReceiptOpen(true)}>
              Фото чека
            </button>
          </div>
        </div>
      </div>

      <form
        className="mt-12 grid gap-x-8 gap-y-4 border-t border-line pt-10 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="sm:col-span-2">
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted">Данные</h2>
        </div>
        <Field label="Название в кабинете">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <CategoryField value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
        <Field label="Бренд" error={fieldErrors.brand}>
          <input value={form.brand} onChange={(event) => edit("brand", event.target.value)} />
        </Field>
        <Field label="Модель" error={fieldErrors.model}>
          <input
            value={form.model}
            onChange={(event) => edit("model", event.target.value)}
            onBlur={(event) => {
              const model = event.target.value.trim();
              if (model.length < 4) return;
              void fetchBrand(model).then((brand) => {
                if (!brand) return;
                setForm((current) => {
                  if (!current || current.brand.trim() || current.model.trim() !== model) return current;
                  const title = current.title.trim() ? current.title : `${brand} ${current.model.trim()}`;
                  return { ...current, brand, title };
                });
              });
            }}
          />
        </Field>
        <Field label="Серийный номер">
          <input value={form.serialNumber} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} />
        </Field>
        <Field label="Магазин">
          <input value={form.store} onChange={(event) => setForm({ ...form, store: event.target.value })} />
        </Field>
        <Field label="Дата покупки" error={fieldErrors.purchaseDate}>
          <input type="date" max={todayIso()} value={form.purchaseDate} onChange={(event) => edit("purchaseDate", event.target.value)} />
        </Field>
        <Field label="Гарантия, месяцев" error={fieldErrors.warrantyMonths}>
          <input
            inputMode="numeric"
            value={form.warrantyMonths}
            onChange={(event) => edit("warrantyMonths", event.target.value)}
            placeholder="Только если срок известен"
          />
        </Field>
        <Field label="Цена, ₽" error={fieldErrors.priceRub}>
          <input inputMode="numeric" value={form.priceRub} onChange={(event) => edit("priceRub", event.target.value)} />
        </Field>
        <div className="flex flex-col justify-end gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-orange px-8 text-sm hover:bg-orange disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
            <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setConfirming(true)}>
              Удалить карточку
            </button>
          </div>
          {fieldErrors.save ? <small className="field-error">{fieldErrors.save}</small> : null}
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}
        </div>
      </form>
      {receiptOpen && device.receiptDataUrl ? (
        <ReceiptDialog src={device.receiptDataUrl} onClose={() => setReceiptOpen(false)} />
      ) : null}
      {confirming ? (
        <ConfirmDialog
          title="Удалить карточку?"
          text="Вы точно хотите удалить её из кабинета?"
          confirmLabel="Да, удалить"
          onClose={() => setConfirming(false)}
          onConfirm={remove}
        />
      ) : null}

      {reminders.length > 0 || device.specs.length > 0 ? (
      <div className="mt-14 grid items-start gap-x-16 gap-y-10 border-t border-line pt-10 lg:grid-cols-2">
        {reminders.length > 0 ? (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted">Напоминания</h2>
            <ul className="mt-2 border-t border-line">
              {reminders.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-sm">
                  <span>{item.title}</span>
                  <span className={reminderClass(item.tone)}>{item.detail}</span>
                </li>
              ))}
            </ul>
        </section>
        ) : null}

        {device.specs.length > 0 ? (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted">Характеристики</h2>
            <dl className="mt-2 border-t border-line">
              {device.specs.map((spec) => (
                <div key={spec.label} className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-sm">
                  <dt className="text-muted">{spec.label}</dt>
                  <dd className="text-right">{spec.value}</dd>
                </div>
              ))}
            </dl>
        </section>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

function ReceiptDialog({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Фото чека"
        className="max-h-[90vh] w-full max-w-3xl overflow-auto bg-card p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex justify-end">
          <button type="button" className="text-sm text-muted hover:text-ink" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {/* User photos are local data URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Чек или гарантийный талон" className="block h-auto w-full object-contain" />
      </div>
    </div>
  );
}

function toForm(device: Device): FormState {
  return {
    title: device.title,
    brand: device.brand,
    model: device.model,
    category: device.category,
    serialNumber: device.serialNumber,
    store: device.store,
    purchaseDate: device.purchaseDate,
    priceRub: device.priceRub === null ? "" : formatPriceInput(String(device.priceRub)),
    warrantyMonths: device.warrantyMonths === null ? "" : String(device.warrantyMonths),
  };
}

function errorsForMessage(message: string): Record<string, string> {
  if (message.includes("бренд") || message.includes("модель")) {
    return { brand: "Укажите бренд.", model: "Укажите модель." };
  }
  if (message.includes("Цен")) return { priceRub: "Запишите цену числом." };
  if (message.includes("месяц")) return { warrantyMonths: "Укажите число месяцев, например 12." };
  if (message.includes("Дат")) return { purchaseDate: "Выберите дату покупки." };
  return { save: message };
}

function plainSaveError(message: string | undefined) {
  if (!message || message.length > 240 || /[{}[\]]|\(\d{3}\)|\bfetch\b|\bstatus\b/i.test(message)) {
    return "Не удалось сохранить данные. Попробуйте ещё раз.";
  }
  return message;
}

function WarrantyFact({ months, end }: { months: number | null; end: string | null }) {
  const alert = warrantyAlert(end);
  const hot = alert.urgent || alert.over;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-sm">
      <dt className="text-muted">Гарантия</dt>
      <dd className="text-right">
        {months ? (
          <>
            <span>{monthsLabel(months)}</span>
            {end ? (
              <span className={hot ? "warranty-until is-hot" : "warranty-until"}>
                {alert.over ? `Закончилась ${formatDate(end)}` : `до ${formatDate(end)}`}
              </span>
            ) : null}
            {alert.urgent && alert.days !== null ? (
              <span className="mt-1 block text-[#c4341d]">осталось {alert.days} {daysWord(alert.days)}</span>
            ) : null}
          </>
        ) : (
          "не указана"
        )}
      </dd>
    </div>
  );
}

function reminderClass(tone: string) {
  if (tone === "later") return "text-right text-muted";
  if (tone === "urgent" || tone === "over") return "text-right font-medium text-[#c4341d]";
  return "text-right text-orange";
}

function monthsLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} месяц`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} месяца`;
  return `${count} месяцев`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right break-words">{value}</dd>
    </div>
  );
}
