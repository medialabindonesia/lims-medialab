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
      <body>{children}</body>
    </html>
  );
}