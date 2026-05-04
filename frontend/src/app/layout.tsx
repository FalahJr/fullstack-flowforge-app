import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowForge Dashboard",
  description: "Monitoring workflow realtime",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5_0%,_#f8fafc_35%,_#f8fafc_100%)] text-slate-900 antialiased">
        <QueryProvider>
          <div className="relative min-h-screen overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_65%)]" />
            <div className="relative">{children}</div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
