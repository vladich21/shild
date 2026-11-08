export function Nameplate() {
  return (
    <div className="nameplate w-full min-w-0" aria-hidden="true">
      {/* Product photo is a local asset with a transparent background. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/c530.png" alt="" className="mx-auto h-56 w-auto object-contain" />
      <div className="mt-4 flex items-center justify-between text-xs tracking-[0.2em] text-orange">
        <span>ШИЛЬД</span>
        <span>ПАСПОРТ</span>
      </div>
      <p className="mt-4 font-display text-2xl leading-tight text-paper">Капсульная кофемашина</p>
      <p className="mt-1 text-lg text-paper">C530 · BORK</p>
      <dl className="mt-5 space-y-2 text-sm text-paper/80">
        <div className="flex justify-between gap-4">
          <dt>Тип</dt>
          <dd>Капсульная</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Бренд</dt>
          <dd>BORK</dd>
        </div>
        <div className="flex justify-between gap-4 text-orange">
          <dt>Гарантия</dt>
          <dd>24 месяца</dd>
        </div>
      </dl>
    </div>
  );
}
