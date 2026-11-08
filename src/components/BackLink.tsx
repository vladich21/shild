"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function BackLink({ href, label = "Назад" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}

export function BackButton({ fallback = "/", label = "Назад" }: { fallback?: string; label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
