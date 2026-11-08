"use client";

import { useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { BackLink } from "@/components/BackLink";
import { loadDevices, loadEmail } from "@/lib/storage";
import { warrantyLetter } from "@/lib/warrantyMail";
import { warrantyEnd } from "@/lib/warranty";

export function MailScreen({ id }: { id: string }) {
  const [letter] = useState(() => {
    const device = loadDevices().find((item) => item.id === id);
    if (!device || !warrantyEnd(device)) return null;
    return warrantyLetter(device, loadEmail());
  });

  if (!loadEmail()) return <AuthScreen mode="login" />;

  const backHref = loadDevices().some((item) => item.id === id) ? `/device/${id}` : "/cabinet";

  if (!letter) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <BackLink href={backHref} />
        <h1 className="mt-6 font-display text-3xl">Письмо пока не из чего собрать</h1>
        <p className="mt-3 text-muted">Нужны дата покупки и срок гарантии в карточке.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <BackLink href={backHref} />
      <h1 className="mt-6 text-2xl font-medium tracking-tight">{letter.subject}</h1>
      <iframe
        title="Письмо о гарантии"
        className="mt-6 h-[920px] w-full border border-line bg-white"
        srcDoc={letter.html}
      />
    </div>
  );
}
