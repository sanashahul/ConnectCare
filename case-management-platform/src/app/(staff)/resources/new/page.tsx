import { Card, PageHeader } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { saveResource } from "../actions";
import { ResourceForm } from "../resource-form";

export default async function NewResourcePage() {
  await requireSupervisor();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add a resource" back={{ href: "/resources", label: "Resources" }} />
      <Card><ResourceForm action={saveResource.bind(null, null)} /></Card>
    </div>
  );
}
