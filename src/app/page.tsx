import Link from "next/link";
import { Questions, Reveal } from "@/components/HomeMotion";
import { Nameplate } from "@/components/Nameplate";

const steps = [
  { n: "1", title: "Фото", text: "Чек, коробка или наклейка на корпусе." },
  { n: "2", title: "Проверка", text: "Модель предлагает поля. Человек их подтверждает." },
  { n: "3", title: "Паспорт", text: "В карточке лежат модель, серийный номер, чек и инструкция." },
  { n: "4", title: "Напоминание", text: "Шильд показывает, когда кончается гарантия и что пора обслужить." },
];

const tariffs = [
  {
    name: "Бесплатный",
    price: "0 ₽",
    alt: "навсегда",
    pitch: "Уже можно открыть.",
    status: "Открыт",
    mark: "",
    points: ["До 5 устройств", "Фото чека и наклейки", "Модель, серия и цена", "Срок гарантии в карточке", "Напоминание в кабинете"],
    featured: false,
  },
  {
    name: "Premium",
    price: "299 ₽/мес",
    alt: "или 2 990 ₽/год",
    pitch: "Больше пяти устройств.",
    status: "",
    mark: "Основной",
    points: ["Без лимита устройств", "Чтение снимка", "Характеристики из каталога", "Поиск инструкции", "Письмо о конце гарантии"],
    featured: true,
  },
  {
    name: "Family",
    price: "599 ₽/мес",
    alt: "или 5 990 ₽/год",
    pitch: "Несколько человек дома.",
    status: "",
    mark: "Для семьи",
    points: ["До 5 человек", "Общие карточки дома", "Своя техника и общая", "Напоминание каждому", "Один кабинет на семью"],
    featured: false,
  },
  {
    name: "Business",
    price: "1 399 ₽/мес",
    alt: "или 13 990 ₽/год",
    pitch: "Техника всего офиса.",
    status: "",
    mark: "Для офиса",
    points: ["Несколько сотрудников", "Техника офиса", "Кто купил и где лежит", "Общие сроки гарантии", "Экспорт списка"],
    featured: false,
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="hero-wash flex items-center text-paper">
        <div className="hero-wash-light" aria-hidden="true" />
        <div className="hero-wash-light-late" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 items-center gap-10 px-5 py-12 sm:px-6 sm:py-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:gap-16">
          <div className="min-w-0">
            <p className="text-sm tracking-[0.14em] text-orange sm:tracking-[0.18em]">ЛИЧНЫЙ ПАСПОРТ ТЕХНИКИ</p>
            <h1 className="mt-4 font-display text-[1.65rem] leading-tight sm:text-5xl">
              Сфотографировал технику — получил её паспорт
            </h1>
            <p className="mt-5 max-w-xl text-lg text-paper/80">
              Чеки, серийные номера и сроки гарантии больше не остаются на бумажках.
              Шильд собирает их в одну карточку и заранее напоминает, когда срок подходит к концу.
            </p>
            <div className="mt-8">
              <Link href="/cabinet" className="btn btn-primary">
                Открыть кабинет
              </Link>
            </div>
          </div>
          <Nameplate />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-3xl sm:text-4xl">Как это работает</h2>
        <div className="mt-8">
          {steps.map((step) => (
            <Reveal key={step.n}>
              <article className="grid gap-3 border-t border-line py-8 md:grid-cols-[7rem_1fr]">
                <p className="font-display text-5xl text-orange">{step.n}</p>
                <div className="max-w-xl">
                  <h3 className="font-display text-3xl">{step.title}</h3>
                  <p className="mt-3 text-lg leading-8 text-muted">{step.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-3xl sm:text-4xl">Тарифы</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tariffs.map((tariff, index) => (
            <Reveal key={tariff.name} delay={index * 160} className="h-full">
              <article className={`flex h-full flex-col p-5 ${tariff.featured ? "bg-ink text-paper" : "panel"}`}>
                <div className="flex items-center justify-between gap-3">
                  {tariff.status ? (
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-orange">
                      <span className="h-1.5 w-1.5 bg-orange" />
                      {tariff.status}
                    </span>
                  ) : null}
                  {tariff.mark ? (
                    <span className={`text-xs uppercase tracking-[0.14em] ${tariff.featured ? "text-orange" : "text-muted"}`}>{tariff.mark}</span>
                  ) : null}
                </div>
                <h3 className="mt-6 font-display text-2xl">{tariff.name}</h3>
                <p className="mt-4 text-2xl">{tariff.price}</p>
                <p className={`text-sm ${tariff.featured ? "text-paper/60" : "text-muted"}`}>{tariff.alt}</p>
                <p className={`mt-3 text-sm leading-6 ${tariff.featured ? "text-paper/80" : "text-muted"}`}>{tariff.pitch}</p>
                <ul className={`mt-5 space-y-2.5 border-t pt-4 text-sm ${tariff.featured ? "border-white/15" : "border-line"}`}>
                  {tariff.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-orange" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Questions />
    </div>
  );
}
