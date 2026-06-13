import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIMS-Medialab",
  description: "Laboratory Information Management System Medialab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* suppressHydrationWarning: ekstensi browser (Grammarly/ColorZilla)
          menyuntik atribut ke <body> sebelum React hydrate, memicu mismatch
          yang tidak berbahaya. Ini hanya menekan warning di level <body>. */}
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
