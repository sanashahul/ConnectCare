import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/ui";
import { audit } from "@/lib/audit";
import { requireSupervisor } from "@/lib/auth";
import { todayIso } from "@/lib/followups";
import { HomeMain, loadHome, OwnTodos } from "../../dashboard/home";

/** A supervisor's read-only view of a case manager's Home, exactly as they see it. */
export default async function TeamMemberHome({ params }: { params: Promise<{ id: string }> }) {
  const supervisor = await requireSupervisor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const member = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!member) notFound();
  const today = todayIso();
  const home = await loadHome(member, today);
  await audit({ userId: supervisor.id, action: "team.viewed_home", detail: { targetUserId: id } });
  const first = member.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/team", label: "Team" }}
        title={`${member.name}'s Home`}
        subtitle={`${home.cards.length} client${home.cards.length === 1 ? "" : "s"}${home.attention ? ` · ${home.attention} need${home.attention === 1 ? "s" : ""} attention` : ""}. View only: this is what ${first} sees.`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <HomeMain data={home} today={today} readOnly ownerName={first} />
        </div>
        <div className="space-y-6">
          <OwnTodos data={home} today={today} readOnly />
        </div>
      </div>
    </div>
  );
}
