import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import "../src/globals.css";

export const metadata: Metadata = {
  title: "Hubilee Hub",
  description:
    "Hubilee Hub — plataforma unificada para gestión de módulos",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
