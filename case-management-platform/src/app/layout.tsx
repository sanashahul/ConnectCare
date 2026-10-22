import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConnectCare Case Management",
  description: "Case management for street medicine outreach teams.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
