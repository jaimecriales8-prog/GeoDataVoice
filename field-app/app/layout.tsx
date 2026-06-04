import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import FieldProviders from "./providers";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoDataVoice Campo",
  description: "App de campo para encuestadores",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GDV Campo" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e3a5f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 text-slate-900 antialiased">
        <FieldProviders>{children}</FieldProviders>
      </body>
    </html>
  );
}
