export type WarrantySource = "document" | "user" | "catalog" | "manufacturer" | "unknown";

export type Spec = {
  label: string;
  value: string;
};

export type MaintenanceRule = {
  title: string;
  everyMonths: number;
};

export type CatalogModel = {
  id: string;
  brand: string;
  model: string;
  category: string;
  warrantyMonths: number;
  manualUrl: string;
  specs: Spec[];
  maintenance: MaintenanceRule[];
};

export type Device = {
  id: string;
  title: string;
  brand: string;
  model: string;
  category: string;
  serialNumber: string;
  store: string;
  purchaseDate: string;
  priceRub: number | null;
  warrantyMonths: number | null;
  warrantySource: WarrantySource;
  catalogId: string | null;
  manualUrl: string;
  specs: Spec[];
  maintenance: MaintenanceRule[];
  photoDataUrl: string | null;
  receiptDataUrl: string | null;
  recognitionNote: string;
  createdAt: string;
};

export type Recognition = {
  brand: string | null;
  model: string | null;
  deviceType: string | null;
  serialNumber: string | null;
  store: string | null;
  purchaseDate: string | null;
  priceRub: number | null;
  warrantyMonths: number | null;
  manufacturerMonths: number | null;
  manufacturerNote: string;
  manualUrl: string;
  visibleText: string[];
  confidence: number | null;
  notes: string;
};
