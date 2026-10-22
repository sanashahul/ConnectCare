import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayName, listClientsForUser } from "@/lib/clients";
import { todayIso } from "@/lib/followups";
import { todoItemsFor } from "@/lib/todos";
import { TodoList } from "../dashboard/todo-list";

/** Every open item in one place, grouped by priority, for when the dashboard summary isn't enough. */
export default async function TasksPage() {
  const user = await requireUser();
  const [items, clients] = await Promise.all([todoItemsFor(user), listClientsForUser(user, { statuses: ["active"] })]);
  const mine = clients.filter((c) => c.assignedToId === user.id);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="All tasks"
        subtitle="Everything open across your clients, plus your own tasks. Set priorities and order here; the dashboard shows just today."
        back={{ href: "/dashboard", label: "Dashboard" }}
      />
      <Card>
        <TodoList items={items} clients={mine.map((c) => ({ id: c.id, name: displayName(c.profile) }))} today={todayIso()} />
      </Card>
    </div>
  );
}
