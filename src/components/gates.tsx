"use client";

import dynamic from "next/dynamic";

const loading = (text: string) => (
  <p className="mx-auto max-w-7xl px-6 py-10 text-muted">{text}</p>
);

export const CabinetGate = dynamic(
  () => import("./CabinetScreen").then((mod) => mod.CabinetScreen),
  { ssr: false, loading: () => loading("Загружаем кабинет…") },
);

export const AddGate = dynamic(
  () => import("./AddScreen").then((mod) => mod.AddScreen),
  { ssr: false, loading: () => loading("Открываем форму…") },
);

export const DeviceGate = dynamic(
  () => import("./DeviceScreen").then((mod) => mod.DeviceScreen),
  { ssr: false, loading: () => loading("Открываем карточку…") },
);

export const LoginGate = dynamic(
  () => import("./AuthScreen").then((mod) => mod.AuthScreen),
  { ssr: false, loading: () => loading("Открываем вход…") },
);

export const RegisterGate = dynamic(
  () => import("./AuthScreen").then((mod) => mod.AuthScreen),
  { ssr: false, loading: () => loading("Открываем регистрацию…") },
);

export const MailGate = dynamic(
  () => import("./MailScreen").then((mod) => mod.MailScreen),
  { ssr: false, loading: () => loading("Открываем письмо…") },
);
