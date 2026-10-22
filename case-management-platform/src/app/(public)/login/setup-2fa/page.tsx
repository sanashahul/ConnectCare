import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/ui";
import { readSession } from "@/lib/session";
import { otpauthUrl } from "@/lib/totp";
import { ensurePendingTotpSecret } from "@/lib/two-factor";
import { confirmSetup, logout } from "../actions";
import { CodeForm } from "../code-form";

export const dynamic = "force-dynamic";

export default async function SetupTwoFactorPage() {
  const s = await readSession();
  if (!s) redirect("/login");
  if (s.user.totpEnabled) redirect(s.session.stage === "full" ? "/dashboard" : "/login/verify");
  const secret = await ensurePendingTotpSecret(s.user.id, s.user.totpSecretEnc, s.user.totpEnabled);
  if (!secret) redirect("/login/verify");
  const url = otpauthUrl(secret, s.user.email, process.env.TOTP_ISSUER ?? "ConnectCare");
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220 });
  const grouped = secret.match(/.{1,4}/g)?.join(" ");

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Set up two-step verification</h1>
        <p className="mb-4 text-sm text-stone-600">
          Client information is protected by a code from your phone each time you sign in.
        </p>
        <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-stone-700">
          <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator, Duo, or 1Password).</li>
          <li>In the app, add an account and scan this code.</li>
        </ol>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code for your authenticator app" width={220} height={220} className="mx-auto mb-3 rounded border" />
        <p className="mb-5 text-center text-xs text-stone-500">
          Can&apos;t scan? Enter this key: <code className="font-mono text-stone-800">{grouped}</code>
        </p>
        <p className="mb-2 text-sm text-stone-700">3. Enter the 6-digit code the app shows.</p>
        <CodeForm action={confirmSetup} label="Turn on and continue" />
        <form action={logout} className="mt-4 text-center">
          <button className="text-sm text-stone-500 underline">Cancel</button>
        </form>
      </div>
    </PublicShell>
  );
}
