"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink } from "@/components/BackLink";
import { DeviceCard } from "@/components/DeviceCard";
import { loadDevices, loadEmail } from "@/lib/storage";

export function CabinetScreen() {
  const router = useRouter();
  const [devices] = useState(() => loadDevices());
  const [email] = useState(() => loadEmail());

  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  if (!email) return <p className="mx-auto max-w-7xl px-6 py-10 text-muted">Открываем вход…</p>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <BackLink href="/" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="min-w-0 font-display text-3xl leading-tight sm:text-4xl">Моя техника</h1>
        <Link href="/add" className="btn btn-primary">
          Добавить устройство
        </Link>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Стиральная машина, наушники и ноутбук уже лежат в кабинете на любом компьютере. Своё устройство можно добавить рядом: оно сохранится в этом браузере.
      </p>

      {devices.length === 0 ? (
        <div className="panel mt-8 p-6">
          <p>В кабинете пока пусто. Добавьте первое устройство.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
