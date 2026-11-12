import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { phiInBox } from "@/lib/box";
import { displayName, getClientForUser } from "@/lib/clients";
import { updateClient } from "../../actions";
import { ClientForm } from "../../client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const client = await getClientForUser(user, id);
  if (!client) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${displayName(client.profile)}`} back={{ href: `/clients/${id}`, label: "Back to client" }} />
      <Card>
        <ClientForm
          action={updateClient.bind(null, id)}
          defaults={{
            ...client.profile,
            // The app fills in the client ID when no name is stored; don't save that back as a name.
            firstName: client.profile.firstName === client.clientCode ? "" : client.profile.firstName,
            city: client.city,
            needs: client.needs,
            urgent: client.urgent,
          }}
          hide={phiInBox() ? "identifying" : client.profile.healthInBox ? "health" : undefined}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
