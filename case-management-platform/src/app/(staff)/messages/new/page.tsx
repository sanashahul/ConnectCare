import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listClientsForUser } from "@/lib/clients";
import { caseManagers } from "@/lib/followups";
import { NewMessageForm } from "./form";

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const user = await requireUser();
  const supervisor = user.role === "supervisor";
  const clients = await listClientsForUser(user, { statuses: ["new", "active"] });
  const cms = supervisor ? await caseManagers() : [];
  const clientParam = (await searchParams).client;
  const linked = clients.find((c) => c.id === clientParam);
  return (
    <div className="max-w-2xl">
      <PageHeader title={supervisor ? "Message a case manager" : "Message a supervisor"} back={{ href: "/messages", label: "Messages" }} />
      <Card>
        <NewMessageForm
          supervisor={supervisor}
          caseManagers={cms.map((c) => ({ id: c.id, name: c.name }))}
          clients={clients.map((c) => ({ id: c.id, code: c.clientCode }))}
          defaultClientId={linked?.id}
          defaultCaseManagerId={linked?.assignedToId ?? undefined}
        />
      </Card>
    </div>
  );
}
