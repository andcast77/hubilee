import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ServiceInitializer } from "@/components/providers/ServiceInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SHOPFLOW_THEME = "#2563eb";

const metadataBaseUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_SHOPFLOW_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw);
    } catch {
      /* fall through */
    }
  }
  return new URL("http://localhost:3002");
})();

const defaultDescription =
  "Shopflow: punto de venta, inventario y operación retail del ecosistema Hubilee.";

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  applicationName: "Shopflow",
  title: {
    default: "Shopflow",
    template: "%s · Shopflow",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "es",
    siteName: "Shopflow",
    title: "Shopflow",
    description: defaultDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: SHOPFLOW_THEME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <QueryProvider>
          <ServiceInitializer />
          <Toaster richColors position="top-center" closeButton />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
