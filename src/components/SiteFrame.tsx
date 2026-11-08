"use client";

import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-0 w-full flex-1 flex-col overflow-auto bg-paper">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </main>
  );
}
