import type { CatalogModel } from "./types";

export const CATEGORY_GROUPS = [
  {
    label: "Кухня",
    items: [
      "Холодильник",
      "Морозильник",
      "Винный шкаф",
      "Посудомоечная машина",
      "Плита",
      "Варочная панель",
      "Духовой шкаф",
      "Вытяжка",
      "Микроволновка",
      "Мультиварка",
      "Хлебопечка",
      "Аэрогриль",
      "Кофемашина",
      "Кофеварка",
      "Чайник",
      "Тостер",
      "Блендер",
      "Миксер",
      "Мясорубка",
      "Соковыжималка",
      "Кухонный комбайн",
    ],
  },
  {
    label: "Стирка и уборка",
    items: [
      "Стиральная машина",
      "Сушильная машина",
      "Пылесос",
      "Робот-пылесос",
      "Пароочиститель",
      "Утюг",
      "Отпариватель",
      "Швейная машина",
    ],
  },
  {
    label: "Климат и вода",
    items: [
      "Кондиционер",
      "Обогреватель",
      "Тепловентилятор",
      "Увлажнитель воздуха",
      "Очиститель воздуха",
      "Вентилятор",
      "Водонагреватель",
      "Фильтр для воды",
    ],
  },
  {
    label: "Телевизор и звук",
    items: ["Телевизор", "Саундбар", "Колонка", "Музыкальный центр", "Проектор"],
  },
  {
    label: "Компьютеры и связь",
    items: [
      "Ноутбук",
      "Системный блок",
      "Моноблок",
      "Монитор",
      "Планшет",
      "Смартфон",
      "Телефон",
      "Умные часы",
      "Наушники",
      "Роутер",
      "Принтер",
      "МФУ",
      "Игровая приставка",
      "Фотоаппарат",
    ],
  },
  {
    label: "Уход",
    items: ["Фен", "Электробритва", "Эпилятор", "Зубная щётка"],
  },
] as const;

export const CATEGORIES = CATEGORY_GROUPS.flatMap((group) => [...group.items]);

export function listedCategory(value: string | null | undefined) {
  const key = value?.trim().toLowerCase() ?? "";
  if (!key || key === "другое") return "";
  return CATEGORIES.find((item) => item.toLowerCase() === key) ?? "";
}

export function categoryFromReading(deviceType: string | null | undefined, catalogCategory?: string | null) {
  const listed = listedCategory(deviceType);
  if (listed) return listed;
  if (catalogCategory) return catalogCategory;
  const custom = deviceType?.trim() ?? "";
  if (custom && custom.toLowerCase() !== "другое") return custom;
  return "";
}

export const FREE_DEVICE_LIMIT = 5;

export const CATALOG: CatalogModel[] = [
  {
    id: "bosch-wau28t40",
    brand: "Bosch",
    model: "WAU28T40",
    category: "Стиральная машина",
    warrantyMonths: 24,
    manualUrl: "https://www.bosch-home.com/ru/ru/service/get-support/instruction-manuals",
    specs: [
      { label: "Загрузка", value: "8 кг" },
      { label: "Отжим", value: "1400 об/мин" },
      { label: "Двигатель", value: "инверторный" },
    ],
    maintenance: [{ title: "Очистить сливной фильтр", everyMonths: 2 }],
  },
  {
    id: "samsung-ww70",
    brand: "Samsung",
    model: "WW70T",
    category: "Стиральная машина",
    warrantyMonths: 12,
    manualUrl: "https://www.samsung.com/ru/support/",
    specs: [
      { label: "Загрузка", value: "7 кг" },
      { label: "Отжим", value: "1200 об/мин" },
      { label: "Тип", value: "с фронтальной загрузкой" },
    ],
    maintenance: [{ title: "Промыть лоток для порошка", everyMonths: 1 }],
  },
  {
    id: "samsung-rb34",
    brand: "Samsung",
    model: "RB34",
    category: "Холодильник",
    warrantyMonths: 12,
    manualUrl: "https://www.samsung.com/ru/support/",
    specs: [
      { label: "Тип", value: "с нижней морозилкой" },
      { label: "Разморозка", value: "No Frost" },
      { label: "Объём", value: "около 340 л" },
    ],
    maintenance: [{ title: "Протереть уплотнители дверей", everyMonths: 3 }],
  },
  {
    id: "samsung-ms23",
    brand: "Samsung",
    model: "MS23",
    category: "Микроволновка",
    warrantyMonths: 12,
    manualUrl: "https://www.samsung.com/ru/support/",
    specs: [
      { label: "Объём", value: "23 л" },
      { label: "Мощность", value: "800 Вт" },
    ],
    maintenance: [{ title: "Протереть камеру изнутри", everyMonths: 1 }],
  },
  {
    id: "xiaomi-s10",
    brand: "Xiaomi",
    model: "Robot Vacuum S10",
    category: "Пылесос",
    warrantyMonths: 12,
    manualUrl: "https://www.mi.com/ru/support/",
    specs: [
      { label: "Тип", value: "робот-пылесос" },
      { label: "Уборка", value: "сухая и влажная" },
    ],
    maintenance: [{ title: "Очистить контейнер и щётки", everyMonths: 1 }],
  },
  {
    id: "dyson-v15",
    brand: "Dyson",
    model: "V15 Detect",
    category: "Пылесос",
    warrantyMonths: 24,
    manualUrl: "https://www.dyson.com.ru/support",
    specs: [
      { label: "Тип", value: "беспроводной" },
      { label: "Питание", value: "аккумулятор" },
    ],
    maintenance: [{ title: "Промыть фильтр", everyMonths: 1 }],
  },
  {
    id: "philips-hd9350",
    brand: "Philips",
    model: "HD9350",
    category: "Чайник",
    warrantyMonths: 24,
    manualUrl: "https://www.philips.ru/c-w/support-home.html",
    specs: [
      { label: "Объём", value: "1,7 л" },
      { label: "Мощность", value: "2200 Вт" },
    ],
    maintenance: [{ title: "Удалить накипь", everyMonths: 1 }],
  },
  {
    id: "haier-as25",
    brand: "Haier",
    model: "AS25",
    category: "Кондиционер",
    warrantyMonths: 12,
    manualUrl: "https://haier.ru/",
    specs: [
      { label: "Тип", value: "сплит-система" },
      { label: "Компрессор", value: "инверторный" },
    ],
    maintenance: [{ title: "Промыть фильтры внутреннего блока", everyMonths: 1 }],
  },
  {
    id: "tefal-fv2837",
    brand: "Tefal",
    model: "FV2837",
    category: "Утюг",
    warrantyMonths: 24,
    manualUrl: "https://www.tefal.ru/support",
    specs: [
      { label: "Подошва", value: "керамическая" },
      { label: "Пар", value: "есть" },
    ],
    maintenance: [{ title: "Слить воду и очистить подошву", everyMonths: 1 }],
  },
  {
    id: "macbook-air-13",
    brand: "Apple",
    model: "MacBook Air 13",
    category: "Ноутбук",
    warrantyMonths: 12,
    manualUrl: "https://support.apple.com/ru-ru/mac",
    specs: [
      { label: "Экран", value: "13 дюймов" },
      { label: "Тип", value: "ноутбук" },
    ],
    maintenance: [{ title: "Проверить обновления системы", everyMonths: 3 }],
  },
  {
    id: "redmibook-15",
    brand: "Xiaomi",
    model: "RedmiBook 15",
    category: "Ноутбук",
    warrantyMonths: 12,
    manualUrl: "https://www.mi.com/ru/support/",
    specs: [
      { label: "Экран", value: "15,6 дюйма" },
      { label: "Тип", value: "ноутбук" },
    ],
    maintenance: [{ title: "Очистить клавиатуру и решётки", everyMonths: 3 }],
  },
  {
    id: "samsung-g5",
    brand: "Samsung",
    model: "Odyssey G5",
    category: "Монитор",
    warrantyMonths: 12,
    manualUrl: "https://www.samsung.com/ru/support/",
    specs: [
      { label: "Диагональ", value: "27 дюймов" },
      { label: "Тип", value: "игровой монитор" },
    ],
    maintenance: [{ title: "Проверить кабели и крепление", everyMonths: 6 }],
  },
  {
    id: "samsung-a55",
    brand: "Samsung",
    model: "Galaxy A55",
    category: "Смартфон",
    warrantyMonths: 12,
    manualUrl: "https://www.samsung.com/ru/support/",
    specs: [
      { label: "Память", value: "128 ГБ" },
      { label: "Тип", value: "смартфон" },
    ],
    maintenance: [{ title: "Проверить обновление системы", everyMonths: 3 }],
  },
  {
    id: "samsung-buds-fe",
    brand: "Samsung",
    model: "Galaxy Buds FE",
    category: "Наушники",
    warrantyMonths: 12,
    manualUrl: "https://www.samsung.com/ru/support/",
    specs: [
      { label: "Тип", value: "беспроводные" },
      { label: "Кейс", value: "с зарядкой" },
    ],
    maintenance: [{ title: "Очистить сеточки и контакты кейса", everyMonths: 2 }],
  },
];

export function matchCatalog(brand: string, model: string): CatalogModel | null {
  const haystack = `${brand} ${model}`.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "");
  if (!haystack) return null;

  let best: { item: CatalogModel; score: number } | null = null;

  for (const item of CATALOG) {
    const modelKey = item.model.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const brandKey = item.brand.toLowerCase();
    let score = 0;

    if (modelKey.length >= 4 && haystack.includes(modelKey)) score += 4;
    if (brand.toLowerCase().includes(brandKey)) score += 1;

    for (const token of item.model.toLowerCase().split(/\s+/)) {
      const compact = token.replace(/[^a-z0-9]/g, "");
      if (compact.length >= 4 && haystack.includes(compact)) score += 2;
    }

    if (score >= 4 && (!best || score > best.score)) {
      best = { item, score };
    }
  }

  return best?.item ?? null;
}
