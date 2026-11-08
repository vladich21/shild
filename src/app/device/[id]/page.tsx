import { DeviceGate } from "@/components/gates";

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeviceGate id={id} />;
}
