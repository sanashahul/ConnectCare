import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getClientForUser } from "@/lib/clients";
import { updateClient } from "../../actions";
import { ClientForm } from "../../client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${client.clientCode}`} back={{ href: `/clients/${id}`, label: "Back to client" }} />
      <Card>
        <ClientForm
          action={updateClient.bind(null, id)}
          defaults={{ ...client.profile, city: client.city, needs: client.needs, urgent: client.urgent }}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
