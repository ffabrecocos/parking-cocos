import type { Metadata, Viewport } from "next";
import { OAuthCallbackHandler } from "@/components/auth/OAuthCallbackHandler";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cocos Parking Admin",
  description: "Administración de cocheras",
};

export const viewport: Viewport = {
  themeColor: "#004795",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <OAuthCallbackHandler />
        {children}
      </body>
    </html>
  );
}
