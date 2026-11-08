import { MailGate } from "@/components/gates";

export default async function MailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MailGate id={id} />;
}
