import { currentEmail, loadAccountDevices, writeAccountDevices } from "./account";
import type { Device } from "./types";

export function loadDevices(): Device[] {
  const email = currentEmail();
  if (!email) return [];
  return loadAccountDevices(email);
}

export function saveDevices(devices: Device[]) {
  const email = currentEmail();
  if (!email) return;
  writeAccountDevices(email, devices);
}

export function updateDevice(id: string, patch: Partial<Device>): Device | null {
  const devices = loadDevices();
  const index = devices.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const next = { ...devices[index], ...patch, id };
  const copy = devices.slice();
  copy[index] = next;
  saveDevices(copy);
  return next;
}

export function loadEmail(): string {
  return currentEmail() ?? "";
}
