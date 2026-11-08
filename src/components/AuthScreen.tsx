"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BackLink } from "@/components/BackLink";
import { Field } from "@/components/Field";
import { currentEmail, loginAccount, registerAccount, suggestedEmail } from "@/lib/account";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  useEffect(() => {
    if (currentEmail()) {
      router.replace("/cabinet");
      return;
    }
    if (register) {
      const known = suggestedEmail();
      if (known) setEmail(known);
    }
  }, [register, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Укажите почту, например name@mail.ru.";
    }
    if (password.length < 6) next.password = "Пароль должен быть не короче 6 символов.";
    if (register && confirm !== password) next.confirm = "Пароли не совпадают.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setBusy(true);
    const failure = register ? await registerAccount(email, password) : await loginAccount(email, password);
    setBusy(false);
    if (failure) {
      setErrors({ [failure.field]: failure.message });
      return;
    }
    router.push("/cabinet");
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 py-12">
      <BackLink href="/" />
      <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted">{register ? "Регистрация" : "Вход"}</p>
      <h1 className="mt-3 font-display text-4xl">{register ? "Новый кабинет" : "Вход по почте"}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {register
          ? "Почта станет адресом кабинета: на неё собираются письма о гарантии. Пароль нужен, чтобы войти снова."
          : "Введите почту и пароль, которые указали при регистрации."}
      </p>
      <form noValidate className="mt-8 grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="Почта" error={errors.email}>
          <input
            type="email"
            autoComplete="username"
            value={email}
            placeholder="name@mail.ru"
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: "" }));
            }}
          />
        </Field>
        <PasswordField
          label="Пароль"
          error={errors.password}
          autoComplete={register ? "new-password" : "current-password"}
          value={password}
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: "" }));
          }}
        />
        {register ? (
          <PasswordField
            label="Пароль ещё раз"
            error={errors.confirm}
            autoComplete="new-password"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              setErrors((current) => ({ ...current, confirm: "" }));
            }}
          />
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {register ? "Создать кабинет" : "Войти"}
        </button>
        <Link href={register ? "/login" : "/register"} className="btn btn-primary">
          {register ? "Войти" : "Зарегистрироваться"}
        </Link>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  error,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  error?: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);

  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          className="pr-11"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
          aria-label={shown ? "Скрыть пароль" : "Показать пароль"}
          onClick={() => setShown((current) => !current)}
        >
          <EyeIcon hidden={shown} />
        </button>
      </div>
    </Field>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {hidden ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.7a2 2 0 002.7 2.8" />
          <path d="M9.9 5.2A11 11 0 0112 5c5.2 0 9.2 4 10.4 7a12 12 0 01-2.2 3.4M6.2 6.3C4.3 7.6 2.9 9.4 1.6 12c1 2.7 4.8 7 10.4 7 1.2 0 2.4-.2 3.5-.6" />
        </>
      ) : (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="2.6" />
        </>
      )}
    </svg>
  );
}
