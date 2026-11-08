import Link from "next/link";
import { daysUntil, daysWord, formatDate, formatMoney } from "@/lib/dates";
import type { Device } from "@/lib/types";
import { warrantyEnd } from "@/lib/warranty";

export function DeviceCard({ device }: { device: Device }) {
  const end = warrantyEnd(device);
  const days = end ? daysUntil(end) : null;
  const modelLine = [device.brand, device.model].filter(Boolean).join(" ");
  const urgent = days !== null && days >= 0 && days <= 10;
  const over = days !== null && days < 0;

  return (
    <Link
      href={`/device/${device.id}`}
      className={`block border bg-card p-4 transition hover:-translate-y-0.5 ${urgent || over ? "border-[#c4341d]" : "border-line"}`}
    >
      {device.photoDataUrl ? (
        // User photos are local data URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={device.photoDataUrl} alt="" className="mb-4 h-56 w-full bg-[#ececec] object-contain" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{device.category}</p>
        <WarrantyMark days={days} end={end} urgent={urgent} over={over} />
      </div>
      <h2 className="mt-2 font-display text-xl leading-tight">{device.title}</h2>
      {modelLine && !device.title.toLowerCase().includes(modelLine.toLowerCase()) ? (
        <p className="mt-1 text-sm">{modelLine}</p>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        {device.purchaseDate ? `Куплено ${formatDate(device.purchaseDate)}` : "Дата покупки не указана"}
        {device.priceRub ? ` · ${formatMoney(device.priceRub)}` : ""}
      </p>
    </Link>
  );
}

function WarrantyMark({
  days,
  end,
  urgent,
  over,
}: {
  days: number | null;
  end: string | null;
  urgent: boolean;
  over: boolean;
}) {
  if (!end || days === null) return <span className="badge badge-muted">Срок не указан</span>;
  if (over) return <span className="badge badge-danger">Закончилась</span>;
  if (urgent) return <span className="badge badge-danger">Ещё {days} {daysWord(days)}</span>;
  return <span className="badge badge-dark">до {formatDate(end)}</span>;
}
