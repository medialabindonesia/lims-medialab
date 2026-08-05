import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@daypicker/react/style.css";
import MotionProvider from "@/components/providers/MotionProvider";

export const metadata: Metadata = {
  title: {
    default: "LIMS Medialab",
    template: "%s | LIMS Medialab",
  },
  description:
    "Laboratory Information Management System Medialab Indonesia untuk workflow laboratorium yang terhubung dan terlacak.",
  applicationName: "LIMS Medialab",
};

export const viewport: Viewport = {
  themeColor: "#072B6B",
  colorScheme: "light",
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
