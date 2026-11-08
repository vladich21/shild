"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { BackLink } from "@/components/BackLink";
import { Field } from "@/components/Field";
import { CATEGORIES, FREE_DEVICE_LIMIT, matchCatalog } from "@/lib/catalog";
import { todayIso } from "@/lib/dates";
import { compressImage } from "@/lib/image";
import { loadDevices, loadEmail, saveDevices } from "@/lib/storage";
import type { CatalogModel, Device, Recognition, WarrantySource } from "@/lib/types";

type Draft = {
  title: string;
  titleTouched: boolean;
  brand: string;
  model: string;
  category: string;
  serialNumber: string;
  store: string;
  purchaseDate: string;
  priceRub: string;
  warrantyMonths: string;
  documentMonths: number | null;
  manufacturerMonths: number | null;
  manualUrl: string;
  photoDataUrl: string | null;
  receiptDataUrl: string | null;
  recognitionNote: string;
};

const emptyDraft: Draft = {
  title: "",
  titleTouched: false,
  brand: "",
  model: "",
  category: "Другое",
  serialNumber: "",
  store: "",
  purchaseDate: "",
  priceRub: "",
  warrantyMonths: "",
  documentMonths: null,
  manufacturerMonths: null,
  manualUrl: "",
  photoDataUrl: null,
  receiptDataUrl: null,
  recognitionNote: "",
};

export function AddScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [count, setCount] = useState(() => loadDevices().length);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const images = useRef({ photo: null as string | null, receipt: null as string | null });
  const requestId = useRef(0);

  const catalogMatch = useMemo(
    () => matchCatalog(draft.brand, draft.model),
    [draft.brand, draft.model],
  );
  const limitReached = count >= FREE_DEVICE_LIMIT;

  function editDraft(key: "brand" | "model" | "priceRub" | "warrantyMonths", value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => clearError(current, key));
  }

  function removeImage(key: "photoDataUrl" | "receiptDataUrl") {
    if (key === "photoDataUrl") images.current.photo = null;
    else images.current.receipt = null;
    setDraft((current) => ({ ...current, [key]: null }));
    setFieldErrors((current) => clearError(current, key));
    setNotice("");
    const id = requestId.current + 1;
    requestId.current = id;
    const photo = images.current.photo;
    const receipt = images.current.receipt;
    if (!photo && !receipt) {
      setBusy(false);
      return;
    }
    void recognize(photo, receipt, id, key === "photoDataUrl" ? "receiptDataUrl" : "photoDataUrl");
  }

  async function onFile(file: File | undefined, key: "photoDataUrl" | "receiptDataUrl") {
    if (!file) return;
    setFieldErrors((current) => clearError(current, key));
    setNotice("");
    try {
      const dataUrl = await compressImage(file);
      if (key === "photoDataUrl") images.current.photo = dataUrl;
      else images.current.receipt = dataUrl;
      setDraft((current) => ({ ...current, [key]: dataUrl }));
      const id = requestId.current + 1;
      requestId.current = id;
      await recognize(images.current.photo, images.current.receipt, id, key);
    } catch (reason) {
      setFieldErrors({ [key]: reason instanceof Error ? reason.message : "Не удалось загрузить фото" });
    }
  }

  function applyRecognition(result: Recognition, note: string) {
    const match = matchCatalog(result.brand ?? "", result.model ?? "");
    const category = (CATEGORIES as readonly string[]).includes(result.deviceType ?? "")
      ? (result.deviceType as string)
      : match?.category ?? "Другое";
    const months = result.warrantyMonths ?? result.manufacturerMonths ?? match?.warrantyMonths ?? null;
    const parts = [result.notes, !result.warrantyMonths ? result.manufacturerNote : ""].filter(Boolean);
    if ((result.warrantyMonths || result.manufacturerMonths) && !result.purchaseDate) {
      parts.push("Даты покупки на чеке или талоне нет, поэтому напоминание пока не посчитается.");
    }
    if (result.manualUrl) parts.push("Инструкция производителя прикреплена к карточке.");

    setDraft((current) => ({
      ...current,
      brand: result.brand ?? "",
      model: result.model ?? "",
      category,
      serialNumber: result.serialNumber ?? "",
      store: result.store ?? "",
      purchaseDate: result.purchaseDate ?? "",
      priceRub: result.priceRub != null ? String(result.priceRub) : "",
      warrantyMonths: months ? String(months) : "",
      documentMonths: result.warrantyMonths,
      manufacturerMonths: result.warrantyMonths ? null : result.manufacturerMonths,
      manualUrl: result.manualUrl || match?.manualUrl || "",
      recognitionNote: note,
      title: current.titleTouched ? current.title : suggestTitle(category, result.brand, result.model),
    }));
    setNotice(parts.join(" ") || note);
  }

  async function recognize(
    photo: string | null,
    receipt: string | null,
    id: number,
    source: "photoDataUrl" | "receiptDataUrl",
  ) {
    setFieldErrors((current) => clearError(current, source));
    setBusy(true);
    try {
      const response = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceImage: photo,
          receiptImage: receipt,
        }),
      });
      let data: { recognition?: Recognition; error?: string };
      try {
        data = (await response.json()) as { recognition?: Recognition; error?: string };
      } catch {
        throw new Error("Не удалось распознать фото. Попробуйте ещё раз.");
      }
      if (id !== requestId.current) return;
      if (!response.ok || !data.recognition) {
        throw new Error(plainRecognizeError(data.error));
      }
      applyRecognition(data.recognition, "Поля заполнены по фото. Проверьте их перед сохранением.");
    } catch (reason) {
      if (id !== requestId.current) return;
      setFieldErrors({ [source]: plainRecognizeError(reason instanceof Error ? reason.message : undefined) });
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  function save() {
    const nextErrors: Record<string, string> = {};
    if (limitReached) {
      nextErrors.save = "На бесплатном тарифе уже 5 устройств. Удалите одну карточку, чтобы добавить новую.";
    }
    if (!draft.brand.trim()) nextErrors.brand = "Укажите бренд.";
    if (!draft.model.trim()) nextErrors.model = "Укажите модель.";

    const months = parseMonths(draft.warrantyMonths);
    if (draft.warrantyMonths.trim() && months === null) {
      nextErrors.warrantyMonths = "Укажите число месяцев, например 12.";
    }

    let price: number | null = null;
    if (draft.priceRub.trim()) {
      const parsed = Number(draft.priceRub.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        nextErrors.priceRub = "Запишите цену числом.";
      } else {
        price = parsed;
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const device = buildDevice(draft, months, price, catalogMatch);
    try {
      saveDevices([device, ...loadDevices()]);
      setCount((current) => current + 1);
    } catch {
      setFieldErrors({ photoDataUrl: "Браузер не смог сохранить фото. Попробуйте снимок меньшего размера." });
      return;
    }
    router.push("/cabinet");
  }

  if (!loadEmail()) return <AuthScreen mode="login" />;

  const status = (busy ? "Читаем фото…" : "")
    || notice
    || (catalogMatch ? `В каталоге есть ${catalogMatch.brand} ${catalogMatch.model}.` : "");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-4 pt-10">
      <BackLink href="/cabinet" />
      <div className="flex items-end justify-between gap-6">
        <h1 className="font-display text-3xl">Добавить технику</h1>
        {status ? <p className="max-w-xl text-right text-base text-muted">{status}</p> : null}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <UploadBox
            title="Наклейка или техника"
            text="Модель и серийный номер"
            image={draft.photoDataUrl}
            busy={busy}
            onFile={(file) => onFile(file, "photoDataUrl")}
            onRemove={() => removeImage("photoDataUrl")}
            error={fieldErrors.photoDataUrl}
          />
          <UploadBox
            title="Чек или гарантийный талон"
            text="Магазин, дата, цена и срок, если они написаны"
            image={draft.receiptDataUrl}
            busy={busy}
            onFile={(file) => onFile(file, "receiptDataUrl")}
            onRemove={() => removeImage("receiptDataUrl")}
            error={fieldErrors.receiptDataUrl}
          />
        </div>

      <form
        className="panel grid h-full content-start gap-3 p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field label="Название в кабинете">
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value, titleTouched: true })}
            placeholder="Например, стиральная машина на кухне"
          />
        </Field>
        <Field label="Категория">
          <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Бренд" error={fieldErrors.brand}>
          <input value={draft.brand} onChange={(event) => editDraft("brand", event.target.value)} />
        </Field>
        <Field label="Модель" error={fieldErrors.model}>
          <input value={draft.model} onChange={(event) => editDraft("model", event.target.value)} />
        </Field>
        <Field label="Серийный номер">
          <input value={draft.serialNumber} onChange={(event) => setDraft({ ...draft, serialNumber: event.target.value })} />
        </Field>
        <Field label="Магазин">
          <input value={draft.store} onChange={(event) => setDraft({ ...draft, store: event.target.value })} />
        </Field>
        <Field label="Дата покупки">
          <input type="date" max={todayIso()} value={draft.purchaseDate} onChange={(event) => setDraft({ ...draft, purchaseDate: event.target.value })} />
        </Field>
        <Field label="Цена, ₽" error={fieldErrors.priceRub}>
          <input inputMode="decimal" value={draft.priceRub} onChange={(event) => editDraft("priceRub", event.target.value)} />
        </Field>
        <Field label="Гарантия, месяцев" error={fieldErrors.warrantyMonths}>
          <input
            inputMode="numeric"
            value={draft.warrantyMonths}
            onChange={(event) => editDraft("warrantyMonths", event.target.value)}
            placeholder="Только если срок известен"
          />
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary w-full text-base" disabled={limitReached || busy}>
            {limitReached ? "Лимит 5 устройств" : "Сохранить карточку"}
          </button>
          {fieldErrors.save ? <small className="field-error mt-1 block">{fieldErrors.save}</small> : null}
        </div>
      </form>
      </div>
    </div>
  );
}

function UploadBox({
  title,
  text,
  image,
  busy,
  onFile,
  onRemove,
  error,
}: {
  title: string;
  text: string;
  image: string | null;
  busy: boolean;
  error?: string;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className="panel relative p-4">
      <p className="text-xl">{title}</p>
      <p className="mt-1 text-base text-muted">{text}</p>
      <div className="group relative mt-3 h-36">
        <label className="block h-full cursor-pointer">
          {image ? (
            // Local preview of a file the user just picked.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center border border-dashed border-line text-base text-muted">
              Нажмите и выберите снимок
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {busy && image ? (
          <span className="absolute inset-0 grid place-items-center bg-paper/80 text-base">Читаем фото…</span>
        ) : (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-5 bg-ink/45 text-sm text-paper opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <span>Добавить</span>
            {image ? (
              <button type="button" className="pointer-events-auto text-paper/90 hover:text-paper" onClick={onRemove}>
                Удалить
              </button>
            ) : null}
          </span>
        )}
      </div>
      {error ? <small className="field-error mt-1 block">{error}</small> : null}
    </div>
  );
}

function clearError(current: Record<string, string>, key: string) {
  if (!current[key]) return current;
  const next = { ...current };
  delete next[key];
  return next;
}

function plainRecognizeError(message: string | undefined) {
  if (!message || message.length > 240 || /[{}[\]]|\(\d{3}\)|\bfetch\b|\bstatus\b/i.test(message)) {
    return "Не удалось распознать фото. Попробуйте ещё раз.";
  }
  return message;
}

function suggestTitle(category: string, brand: string | null, model: string | null) {
  const name = [brand, model].filter(Boolean).join(" ");
  if (category && category !== "Другое" && name) return `${category}: ${name}`;
  return name || category;
}

function parseMonths(value: string): number | null {
  if (!value.trim()) return null;
  const months = Number(value);
  if (!Number.isInteger(months) || months < 1 || months > 120) return null;
  return months;
}

function sourceFor(draft: Draft, months: number | null, catalog: CatalogModel | null): WarrantySource {
  if (!months) return "unknown";
  if (draft.documentMonths && months === draft.documentMonths) return "document";
  if (draft.manufacturerMonths && months === draft.manufacturerMonths) return "manufacturer";
  if (catalog && months === catalog.warrantyMonths) return "catalog";
  return "user";
}

function buildDevice(
  draft: Draft,
  months: number | null,
  price: number | null,
  catalog: CatalogModel | null,
): Device {
  return {
    id: crypto.randomUUID(),
    title: draft.title.trim() || suggestTitle(draft.category, draft.brand, draft.model),
    brand: draft.brand.trim(),
    model: draft.model.trim(),
    category: draft.category,
    serialNumber: draft.serialNumber.trim(),
    store: draft.store.trim(),
    purchaseDate: draft.purchaseDate,
    priceRub: price,
    warrantyMonths: months,
    warrantySource: sourceFor(draft, months, catalog),
    catalogId: catalog?.id ?? null,
    manualUrl: draft.manualUrl || catalog?.manualUrl || "",
    specs: catalog?.specs ?? [],
    maintenance: catalog?.maintenance ?? [],
    photoDataUrl: draft.photoDataUrl,
    receiptDataUrl: draft.receiptDataUrl,
    recognitionNote: draft.recognitionNote,
    createdAt: new Date().toISOString(),
  };
}
