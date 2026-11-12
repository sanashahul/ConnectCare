import Link from "next/link";
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
      {client.profile.healthInBox && !phiInBox() && (
        <p className="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          This client&apos;s HIPAA information is kept in their Box folder. Leave the health questions (disability,
          accommodations, insurance, PCP, LGBTQ+ care, urgent need, additional information) blank and write those details in
          Box instead. <Link href="/help/hipaa" className="underline">What counts as HIPAA information?</Link>
        </p>
      )}
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
          hide={phiInBox() ? "identifying" : undefined}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
