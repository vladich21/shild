"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { BackLink } from "@/components/BackLink";
import { CategoryField } from "@/components/CategoryField";
import { Field } from "@/components/Field";
import { fetchBrand } from "@/lib/brandClient";
import { categoryFromReading, FREE_DEVICE_LIMIT, matchCatalog } from "@/lib/catalog";
import { formatPriceInput, todayIso } from "@/lib/dates";
import { compressImage } from "@/lib/image";
import { modelsMatch } from "@/lib/recognition";
import { isDemoDevice } from "@/lib/seed";
import { loadDevices, loadEmail, saveDevices } from "@/lib/storage";
import type { CatalogModel, Device, Recognition, WarrantySource } from "@/lib/types";

type Draft = {
  title: string;
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
  brand: "",
  model: "",
  category: "",
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
  const [count, setCount] = useState(() => loadDevices().filter((item) => !isDemoDevice(item)).length);
  const [reading, setReading] = useState<"photoDataUrl" | "receiptDataUrl" | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const images = useRef({ photo: null as string | null, receipt: null as string | null });
  const plateRef = useRef<PlateFacts | null>(null);
  const paperRef = useRef<PaperFacts | null>(null);
  const touched = useRef({ title: false, category: false });
  const requestId = useRef(0);

  const catalogMatch = useMemo(
    () => matchCatalog(draft.brand, draft.model),
    [draft.brand, draft.model],
  );
  const limitReached = count >= FREE_DEVICE_LIMIT;

  function editDraft(key: "brand" | "model" | "priceRub" | "warrantyMonths", value: string) {
    const next = key === "priceRub" ? formatPriceInput(value) : value;
    setDraft((current) => ({ ...current, [key]: next }));
    setFieldErrors((current) => clearError(current, key));
  }

  async function fillBrandFromModel(raw: string) {
    const model = raw.trim();
    if (model.length < 4) return;
    const brand = await fetchBrand(model);
    if (!brand) return;
    setDraft((current) => {
      if (current.brand.trim() || current.model.trim() !== model) return current;
      return {
        ...current,
        brand,
        title: touched.current.title ? current.title : suggestTitle(brand, current.model),
      };
    });
  }

  function removeImage(key: "photoDataUrl" | "receiptDataUrl") {
    if (key === "photoDataUrl") {
      images.current.photo = null;
      plateRef.current = null;
    } else {
      images.current.receipt = null;
      paperRef.current = null;
    }
    requestId.current += 1;
    setReading(null);
    setFieldErrors((current) => clearError(current, key));
    mergeFacts("");
  }

  async function onFile(file: File | undefined, key: "photoDataUrl" | "receiptDataUrl") {
    if (!file) return;
    setFieldErrors((current) => clearError(current, key));
    setNotice("");
    const id = requestId.current + 1;
    requestId.current = id;
    setReading(key);
    try {
      const dataUrl = await compressImage(file);
      if (id !== requestId.current) return;
      if (key === "photoDataUrl") images.current.photo = dataUrl;
      else images.current.receipt = dataUrl;
      setDraft((current) => ({ ...current, [key]: dataUrl }));
      if (key === "photoDataUrl") await readNameplate(dataUrl, id);
      else await readReceipt(dataUrl, id);
    } catch (reason) {
      if (id !== requestId.current) return;
      setFieldErrors({ [key]: plainRecognizeError(reason instanceof Error ? reason.message : undefined) });
    } finally {
      if (id === requestId.current) setReading(null);
    }
  }

  async function readNameplate(image: string, id: number) {
    const result = await requestRecognition(
      { image, kind: "nameplate", enrich: true },
      id,
      "photoDataUrl",
    );
    if (!result) return;
    plateRef.current = {
      brand: result.brand ?? "",
      model: result.model ?? "",
      serialNumber: result.serialNumber ?? "",
      deviceType: result.deviceType ?? "",
      manufacturerMonths: result.manufacturerMonths,
      manufacturerNote: result.manufacturerNote,
      manualUrl: result.manualUrl,
    };
    mergeFacts("Поля заполнены по фото. Проверьте их перед сохранением.");
  }

  async function readReceipt(image: string, id: number) {
    const plate = plateRef.current;
    const result = await requestRecognition(
      {
        image,
        kind: "receipt",
        known: {
          brand: plate?.brand ?? "",
          model: plate?.model ?? "",
          serialNumber: plate?.serialNumber ?? "",
        },
        enrich: !(plate?.brand && plate.model),
      },
      id,
      "receiptDataUrl",
    );
    if (!result) return;
    paperRef.current = {
      brand: result.brand ?? "",
      model: result.model ?? "",
      serialNumber: result.serialNumber ?? "",
      deviceType: result.deviceType ?? "",
      store: result.store ?? "",
      purchaseDate: result.purchaseDate ?? "",
      priceRub: result.priceRub != null ? formatPriceInput(String(result.priceRub)) : "",
      warrantyMonths: result.warrantyMonths,
      notes: result.notes,
      manufacturerMonths: result.manufacturerMonths,
      manufacturerNote: result.manufacturerNote,
      manualUrl: result.manualUrl,
    };
    mergeFacts("Поля заполнены по фото. Проверьте их перед сохранением.");
  }

  async function requestRecognition(
    body: {
      image: string;
      kind: "nameplate" | "receipt";
      known?: { brand: string; model: string; serialNumber: string };
      enrich: boolean;
    },
    id: number,
    source: "photoDataUrl" | "receiptDataUrl",
  ) {
    const response = await fetch("/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: { recognition?: Recognition; error?: string };
    try {
      data = (await response.json()) as { recognition?: Recognition; error?: string };
    } catch {
      if (id !== requestId.current) return null;
      setFieldErrors({ [source]: "Не удалось распознать фото. Попробуйте ещё раз." });
      return null;
    }
    if (id !== requestId.current) return null;
    if (!response.ok || !data.recognition) {
      setFieldErrors({ [source]: plainRecognizeError(data.error) });
      return null;
    }
    return data.recognition;
  }

  function mergeFacts(extraNote: string) {
    const plate = plateRef.current;
    const paper = paperRef.current;
    const plateModel = plate?.model ?? "";
    const paperModel = paper?.model ?? "";
    const same = !plateModel || !paperModel || modelsMatch(plateModel, paperModel);
    const mismatch = Boolean(plateModel && paperModel && !same);
    const brand = (plate?.brand || (same ? paper?.brand : "") || "").trim();
    const model = (plateModel || (same ? paperModel : "")).trim();
    const catalog = matchCatalog(brand, model);
    const deviceType = plate?.deviceType || (same ? paper?.deviceType ?? "" : "");
    const category = categoryFromReading(deviceType, catalog?.category);
    const documentMonths = same ? paper?.warrantyMonths ?? null : null;
    const manufacturerMonths = plate?.manufacturerMonths ?? (same ? paper?.manufacturerMonths ?? null : null);
    const months = documentMonths ?? manufacturerMonths ?? catalog?.warrantyMonths ?? null;
    const purchaseDate = same ? paper?.purchaseDate ?? "" : "";
    const manualUrl = plate?.manualUrl || (same ? paper?.manualUrl ?? "" : "") || catalog?.manualUrl || "";
    const manufacturerNote = documentMonths ? "" : plate?.manufacturerNote || (same ? paper?.manufacturerNote ?? "" : "");
    const parts = [extraNote];
    if (mismatch) {
      parts.push("На чеке или талоне другая модель, поэтому бренд, магазин, дату и цену оттуда не взял.");
    } else if (paper?.notes) {
      parts.push(paper.notes);
    }
    if (manufacturerNote) parts.push(manufacturerNote);
    if ((documentMonths || manufacturerMonths) && !purchaseDate) {
      parts.push("Даты покупки на чеке или талоне нет, поэтому напоминание пока не посчитается.");
    }
    if (manualUrl) parts.push("Инструкция производителя прикреплена к карточке.");
    const note = parts.filter(Boolean).join(" ");

    setDraft((current) => {
      const nextBrand = brand || current.brand;
      const nextModel = model || current.model;
      return {
        ...current,
        brand: nextBrand,
        model: nextModel,
        category: touched.current.category ? current.category : category,
        serialNumber: plate?.serialNumber || (same ? paper?.serialNumber ?? "" : "") || current.serialNumber,
        store: same ? paper?.store || current.store : current.store,
        purchaseDate: purchaseDate || current.purchaseDate,
        priceRub: same ? paper?.priceRub || current.priceRub : current.priceRub,
        warrantyMonths: months ? String(months) : current.warrantyMonths,
        documentMonths,
        manufacturerMonths: documentMonths ? null : manufacturerMonths,
        manualUrl,
        recognitionNote: note,
        title: touched.current.title ? current.title : suggestTitle(nextBrand, nextModel),
        photoDataUrl: images.current.photo,
        receiptDataUrl: images.current.receipt,
      };
    });
    setNotice(note);
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

  const status = (reading === "photoDataUrl" ? "Читаем наклейку…" : reading === "receiptDataUrl" ? "Читаем чек…" : "")
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
            busy={reading === "photoDataUrl"}
            onFile={(file) => onFile(file, "photoDataUrl")}
            onRemove={() => removeImage("photoDataUrl")}
            error={fieldErrors.photoDataUrl}
          />
          <UploadBox
            title="Чек или гарантийный талон"
            text="Магазин, дата, цена и срок, если они написаны"
            image={draft.receiptDataUrl}
            busy={reading === "receiptDataUrl"}
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
            onChange={(event) => {
              touched.current.title = true;
              setDraft({ ...draft, title: event.target.value });
            }}
            placeholder="Например, Bosch KGN49XI20R"
          />
        </Field>
        <CategoryField
          value={draft.category}
          onChange={(value) => {
            touched.current.category = true;
            setDraft({ ...draft, category: value });
          }}
        />
        <Field label="Бренд" error={fieldErrors.brand}>
          <input value={draft.brand} onChange={(event) => editDraft("brand", event.target.value)} />
        </Field>
        <Field label="Модель" error={fieldErrors.model}>
          <input
            value={draft.model}
            onChange={(event) => editDraft("model", event.target.value)}
            onBlur={(event) => void fillBrandFromModel(event.target.value)}
          />
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
          <input inputMode="numeric" value={draft.priceRub} onChange={(event) => editDraft("priceRub", event.target.value)} />
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
          <button type="submit" className="btn btn-primary w-full text-base" disabled={limitReached || reading !== null}>
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

function suggestTitle(brand: string | null, model: string | null) {
  return [brand, model].map((part) => part?.trim()).filter(Boolean).join(" ");
}

type PlateFacts = {
  brand: string;
  model: string;
  serialNumber: string;
  deviceType: string;
  manufacturerMonths: number | null;
  manufacturerNote: string;
  manualUrl: string;
};

type PaperFacts = PlateFacts & {
  store: string;
  purchaseDate: string;
  priceRub: string;
  warrantyMonths: number | null;
  notes: string;
};

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
    title: draft.title.trim() || suggestTitle(draft.brand, draft.model),
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
