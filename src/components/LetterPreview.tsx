"use client";

import { useMemo, useState } from "react";
import { BackButton } from "@/components/BackLink";
import { addMonths, todayIso } from "@/lib/dates";
import type { Device } from "@/lib/types";
import { warrantyLetter } from "@/lib/warrantyMail";

const SCENES = [
  { id: "active", label: "Ещё действует" },
  { id: "soon", label: "Осталось 8 дней" },
  { id: "over", label: "Срок закончился" },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

export function LetterPreview() {
  const [scene, setScene] = useState<SceneId>("soon");
  const letter = useMemo(() => warrantyLetter(sampleDevice(scene), "name@mail.ru"), [scene]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <BackButton />
      <h1 className="mt-6 text-2xl font-medium tracking-tight">Письмо на почту</h1>
      <p className="mt-2 text-sm text-muted">Так оно выглядит в ящике. Ниже три срока гарантии.</p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {SCENES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === scene ? "text-orange underline underline-offset-4" : "text-ink hover:text-orange"}
            onClick={() => setScene(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">{letter.subject}</p>
      <iframe title="Письмо о гарантии" className="mt-3 h-[920px] w-full border border-line bg-white" srcDoc={letter.html} />
    </div>
  );
}

function sampleDevice(scene: SceneId): Device {
  const today = todayIso();
  const end =
    scene === "soon" ? shiftDays(today, 8) : scene === "over" ? shiftDays(today, -20) : addMonths(today, 4) ?? today;
  const purchaseDate = addMonths(end, -12) ?? today;
  return {
    id: "demo-letter",
    title: "LG 55UJ630V-ZA",
    brand: "LG",
    model: "55UJ630V-ZA",
    category: "Телевизор",
    serialNumber: "710RAGK05583",
    store: "М.Видео",
    purchaseDate,
    priceRub: 54990,
    warrantyMonths: 12,
    warrantySource: "document",
    catalogId: null,
    manualUrl: "",
    specs: [],
    maintenance: [],
    photoDataUrl: null,
    receiptDataUrl: null,
    recognitionNote: "",
    createdAt: `${today}T00:00:00.000Z`,
  };
}

function shiftDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
