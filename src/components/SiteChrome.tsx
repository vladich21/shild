"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SESSION_EVENT, currentEmail, logoutAccount } from "@/lib/account";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function useSessionEmail() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const read = () => setEmail(currentEmail());
    read();
    window.addEventListener(SESSION_EVENT, read);
    return () => window.removeEventListener(SESSION_EVENT, read);
  }, []);

  return email;
}

export function SiteHeader() {
  const router = useRouter();
  const email = useSessionEmail();
  const [confirming, setConfirming] = useState(false);

  function logout() {
    logoutAccount();
    setConfirming(false);
    router.push("/login");
  }

  return (
    <header className="border-b-4 border-orange bg-ink text-paper">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center" aria-label="Шильд">
          <img src="/icon.svg" alt="" className="h-10 w-auto invert" />
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {email ? (
            <Link href="/cabinet" className="rounded px-2 py-2 hover:text-orange sm:px-3">
              Кабинет
            </Link>
          ) : null}
          {email === undefined ? null : email ? (
            <button type="button" className="rounded px-2 py-2 hover:text-orange sm:px-3" onClick={() => setConfirming(true)}>
              Выйти
            </button>
          ) : (
            <Link href="/login" className="rounded px-2 py-2 hover:text-orange sm:px-3">
              Войти
            </Link>
          )}
        </nav>
      </div>
      {confirming ? (
        <ConfirmDialog
          title="Выйти?"
          text="Вы уверены, что хотите выйти?"
          confirmLabel="Да, выйти"
          onClose={() => setConfirming(false)}
          onConfirm={logout}
        />
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-orange bg-ink text-paper">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <img src="/icon.svg" alt="Шильд" className="h-10 w-auto invert" />
        <p className="max-w-sm text-sm leading-6 text-paper/70">
          Паспорт техники: модель, серийный номер и срок гарантии.
        </p>
        <Link href="/mail/preview" className="btn btn-light text-sm">
          Как выглядит письмо
        </Link>
      </div>
    </footer>
  );
}
