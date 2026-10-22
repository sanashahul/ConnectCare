import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "../actions";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  const user = await requireUser();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New client"
        back={{ href: "/clients", label: "Clients" }}
        subtitle={
          user.role === "case_manager"
            ? "This client will be assigned to you."
            : "This client will go to the intake queue for assignment."
        }
      />
      <Card>
        <p className="mb-4 rounded-md bg-stone-50 p-3 text-sm text-stone-700">
          Before saving, tell the client what you are writing down and why, and that only the case management team can see it.
        </p>
        <ClientForm action={createClient} submitLabel="Save client" />
      </Card>
    </div>
  );
}
