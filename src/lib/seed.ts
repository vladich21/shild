import { CATALOG } from "./catalog";
import type { Device } from "./types";

function fromCatalog(id: string) {
  const item = CATALOG.find((model) => model.id === id);
  if (!item) throw new Error(`В каталоге нет ${id}`);
  return item;
}

const washer = fromCatalog("bosch-wau28t40");
const buds = fromCatalog("samsung-buds-fe");
const laptop = fromCatalog("macbook-air-13");

export const SEED: Device[] = [
  {
    id: "seed-washer",
    title: "Стиральная машина на кухне",
    brand: washer.brand,
    model: washer.model,
    category: washer.category,
    serialNumber: "4839201746",
    store: "М.Видео",
    purchaseDate: "2026-03-12",
    priceRub: 49990,
    warrantyMonths: washer.warrantyMonths,
    warrantySource: "catalog",
    catalogId: washer.id,
    manualUrl: washer.manualUrl,
    specs: washer.specs,
    maintenance: washer.maintenance,
    photoDataUrl: null,
    receiptDataUrl: null,
    recognitionNote: "Учебная карточка для демонстрации",
    createdAt: "2026-03-12T10:00:00.000Z",
  },
  {
    id: "seed-buds",
    title: "Наушники",
    brand: buds.brand,
    model: buds.model,
    category: buds.category,
    serialNumber: "RFAW40K2",
    store: "DNS",
    purchaseDate: "2025-12-10",
    priceRub: 4990,
    warrantyMonths: buds.warrantyMonths,
    warrantySource: "catalog",
    catalogId: buds.id,
    manualUrl: buds.manualUrl,
    specs: buds.specs,
    maintenance: buds.maintenance,
    photoDataUrl: null,
    receiptDataUrl: null,
    recognitionNote: "Пример из документа: чек на наушники",
    createdAt: "2025-12-10T10:00:00.000Z",
  },
  {
    id: "seed-laptop",
    title: "Ноутбук для учёбы",
    brand: laptop.brand,
    model: laptop.model,
    category: laptop.category,
    serialNumber: "C02YL0EXAMPLE",
    store: "re:Store",
    purchaseDate: "2026-09-01",
    priceRub: 129990,
    warrantyMonths: laptop.warrantyMonths,
    warrantySource: "catalog",
    catalogId: laptop.id,
    manualUrl: laptop.manualUrl,
    specs: laptop.specs,
    maintenance: laptop.maintenance,
    photoDataUrl: null,
    receiptDataUrl: null,
    recognitionNote: "Учебная карточка для демонстрации",
    createdAt: "2026-09-01T10:00:00.000Z",
  },
];
