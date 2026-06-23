import type { Metadata, Viewport } from "next";
import { OAuthCallbackHandler } from "@/components/auth/OAuthCallbackHandler";
import { SafeAreaTop } from "@/components/layout/SafeAreaTop";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parking Cocos",
  applicationName: "Parking Cocos",
  description: "Reservá tu cochera en la oficina",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "ParkingCocos",
    statusBarStyle: "black",
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
        <SafeAreaTop />
        <OAuthCallbackHandler />
        {children}
      </body>
    </html>
  );
}
