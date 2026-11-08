import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { SiteFrame } from "@/components/SiteFrame";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Шильд — паспорт техники",
    template: "%s — Шильд",
  },
  description:
    "Личный паспорт техники: фото чека или наклейки, карточка устройства, гарантия и напоминания.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="flex h-full min-h-full flex-col font-sans">
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
