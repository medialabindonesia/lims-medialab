import type { Metadata } from "next";
import "./globals.css";
import MotionProvider from "@/components/providers/MotionProvider";

export const metadata: Metadata = {
  title: "LIMS-Medialab",
  description: "Laboratory Information Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}