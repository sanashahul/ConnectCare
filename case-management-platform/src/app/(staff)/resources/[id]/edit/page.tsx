import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { getResource } from "@/lib/resources";
import { saveResource } from "../../actions";
import { ResourceForm } from "../../resource-form";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSupervisor();
  const { id } = await params;
  const r = await getResource(id);
  if (!r) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${r.name}`} back={{ href: `/resources/${id}`, label: "Back" }} />
      <Card><ResourceForm action={saveResource.bind(null, id)} r={r} /></Card>
    </div>
  );
}
