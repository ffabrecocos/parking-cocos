import type { Metadata, Viewport } from "next";
import { OAuthCallbackHandler } from "@/components/auth/OAuthCallbackHandler";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cocos Parking",
  description: "Reservá tu cochera en la oficina",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Parking Cocos",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#004795",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
