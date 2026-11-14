import { Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isShiftGuest } from "@/lib/shift-guest";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const user = await requireUser({ allowPasswordChange: true, allowClinicalManager: true });
  // The shared shift-code account has no password of its own; letting someone set one would turn a
  // one-day code into a permanent login.
  if (isShiftGuest(user)) redirect("/shift");
  return (
    <div className="max-w-md">
      <PageHeader
        title={user.mustChangePassword ? "Choose your password" : "Change password"}
        subtitle={`At least ${MIN_PASSWORD_LENGTH} characters. A short sentence is easy to remember and hard to guess.`}
      />
      <Card><PasswordForm /></Card>
    </div>
  );
}
