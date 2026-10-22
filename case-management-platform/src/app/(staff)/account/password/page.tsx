import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
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
