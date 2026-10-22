import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, PageHeader } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";
import { todayIso } from "@/lib/followups";
import { todoItemsFor } from "@/lib/todos";
import { TodoList } from "../../dashboard/todo-list";

/** A supervisor's view-only look at a case manager's Action items, in their order and priorities. */
export default async function TeamMemberActionItems({ params }: { params: Promise<{ id: string }> }) {
  const supervisor = await requireSupervisor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const member = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!member) notFound();
  const items = await todoItemsFor(member);
  await audit({ userId: supervisor.id, action: "team.viewed_action_items", detail: { targetUserId: id } });
  const counts = { urgent: 0, high: 0, medium: 0 };
  for (const i of items) counts[i.priority]++;
  const overdue = items.filter((i) => i.dueDate && i.dueDate < todayIso()).length;

  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: "/dashboard", label: "Dashboard" }}
        title={`${member.name}'s action items`}
        subtitle={`${items.length} open · ${counts.urgent} urgent · ${counts.high} high · ${counts.medium} medium${overdue ? ` · ${overdue} overdue` : ""}. View only, in the order ${member.name.split(" ")[0]} arranged them.`}
      />
      <Card>
        <TodoList items={items} clients={[]} today={todayIso()} readOnly />
      </Card>
    </div>
  );
}
