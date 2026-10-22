import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { todayIso } from "@/lib/followups";
import { todoItemsFor } from "@/lib/todos";
import { WeekList } from "./week-list";

/** Everything open across your clients plus your own to-dos, by when it's due. */
export default async function ThisWeekPage() {
  const user = await requireUser();
  const items = await todoItemsFor(user);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="This week"
        subtitle="Everything open for your clients and your own to-dos, by when it's due. Home shows just the most pressing ones."
        back={{ href: "/dashboard", label: "Home" }}
      />
      <Card>
        <WeekList items={items} today={todayIso()} />
      </Card>
    </div>
  );
}
