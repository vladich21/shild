import { withDemoDevices } from "@/lib/seed";
import type { Device } from "@/lib/types";

const DEMO_EMAIL = "vladkoval039@gmail.com";

const ACCOUNTS_KEY = "shild.accounts.v1";
const SESSION_KEY = "shild.session.v1";
const LEGACY_DEVICES_KEY = "shild.devices.v1";
const LEGACY_EMAIL_KEY = "shild.email.v1";

export const SESSION_EVENT = "shild-session";

type StoredAccount = {
  salt: string;
  hash: string;
  devices: Device[];
  demoReady?: boolean;
};

type Accounts = Record<string, StoredAccount>;

export type AuthFailure = {
  field: "email" | "password";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function currentEmail(): string | null {
  try {
    const email = normalizeEmail(localStorage.getItem(SESSION_KEY) ?? "");
    if (!email || !readAccounts()[email]) {
      if (email) localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return email;
  } catch {
    return null;
  }
}

export function suggestedEmail() {
  try {
    return normalizeEmail(localStorage.getItem(LEGACY_EMAIL_KEY) ?? "");
  } catch {
    return "";
  }
}

export function loadAccountDevices(email: string): Device[] {
  const accounts = readAccounts();
  const account = accounts[email];
  if (!account) return [];
  if (!account.demoReady) {
    account.devices = withDemoDevices(account.devices);
    account.demoReady = true;
    writeAccounts(accounts);
  }
  return account.devices;
}

export function writeAccountDevices(email: string, devices: Device[]) {
  const accounts = readAccounts();
  const account = accounts[email];
  if (!account) return;
  account.devices = devices;
  writeAccounts(accounts);
}

export async function registerAccount(email: string, password: string): Promise<AuthFailure | null> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    return { field: "email", message: "Укажите почту, например name@mail.ru." };
  }
  if (password.length < 6) {
    return { field: "password", message: "Пароль должен быть не короче 6 символов." };
  }
  const accounts = readAccounts();
  if (accounts[normalized]) {
    return { field: "email", message: "Такой кабинет уже есть. Войдите с этой почтой." };
  }
  let hash: { salt: string; hash: string };
  try {
    hash = await secret(password);
  } catch {
    return { field: "password", message: "Откройте Шильд через localhost, чтобы сохранить пароль." };
  }
  accounts[normalized] = { ...hash, devices: startingDevices(normalized), demoReady: true };
  writeAccounts(accounts);
  startSession(normalized);
  return null;
}

export async function loginAccount(email: string, password: string): Promise<AuthFailure | null> {
  const normalized = normalizeEmail(email);
  const account = readAccounts()[normalized];
  if (!account) return { field: "password", message: "Неверная почта или пароль." };
  try {
    const next = await hashPassword(password, account.salt);
    if (next !== account.hash) return { field: "password", message: "Неверная почта или пароль." };
  } catch {
    return { field: "password", message: "Откройте Шильд через localhost, чтобы войти." };
  }
  startSession(normalized);
  return null;
}

export function logoutAccount() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function startSession(email: string) {
  localStorage.setItem(SESSION_KEY, email);
  localStorage.removeItem(LEGACY_EMAIL_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function startingDevices(email: string): Device[] {
  const legacy = email === DEMO_EMAIL ? claimLegacyDevices() : null;
  return withDemoDevices(legacy ?? []);
}

function claimLegacyDevices(): Device[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_DEVICES_KEY);
    if (!raw) return null;
    localStorage.removeItem(LEGACY_DEVICES_KEY);
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Device[]) : null;
  } catch {
    return null;
  }
}

function readAccounts(): Accounts {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Accounts;
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function secret(password: string) {
  const salt = randomSalt();
  return { salt, hash: await hashPassword(password, salt) };
}

async function hashPassword(password: string, salt: string) {
  if (!crypto.subtle) throw new Error("no-subtle");
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
