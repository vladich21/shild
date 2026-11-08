"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const questions = [
  {
    q: "Что лежит в карточке?",
    a: "Модель, серийный номер, магазин, дата покупки, цена и срок гарантии. Если есть фото чека или наклейки, оно остаётся рядом с полями.",
  },
  {
    q: "Когда Шильд напомнит о гарантии?",
    a: "За 10 дней до конца дата в карточке подсвечивается красным. Когда гарантия закончилась, на почту кабинета уходит уведомление с моделью и датой.",
  },
  {
    q: "Где хранится кабинет?",
    a: "Вход по почте и паролю открывает свои карточки. У другого человека список пустой, пока он не добавит технику.",
  },
  {
    q: "Можно ли поправить поля?",
    a: "Да. После чтения снимка поля нужно проверить. В карточке их можно изменить в любой момент, пока устройство лежит в кабинете.",
  },
];

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold: 0.45, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-on" : ""} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

export function Questions() {
  const [open, setOpen] = useState(0);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <Reveal>
        <h2 className="max-w-xl font-display text-3xl leading-tight sm:text-4xl">Коротко о кабинете</h2>
      </Reveal>
      <div className="mt-8">
        {questions.map((item, index) => {
          const on = open === index;
          return (
            <Reveal key={item.q} delay={index * 140}>
            <div className={`border-b border-line ${index === 0 ? "border-t" : ""}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
                aria-expanded={on}
                onClick={() => setOpen(on ? -1 : index)}
              >
                <span className="min-w-0 font-display text-xl leading-tight sm:text-2xl">{item.q}</span>
                <span className="text-2xl leading-none text-orange">{on ? "–" : "+"}</span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="max-w-2xl pb-5 text-base leading-7 text-muted">{item.a}</p>
                </div>
              </div>
            </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
