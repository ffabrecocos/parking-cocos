import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cocos Parking",
  description: "Reservá tu cochera en la oficina",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/cocos-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "Cocos Parking",
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
      <body>{children}</body>
    </html>
  );
}
