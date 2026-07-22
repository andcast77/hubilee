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

const POS_THEME = "#2563eb";

const metadataBaseUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_POS_URL?.trim();
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
  "Pos: punto de venta, inventario y operación retail del ecosistema Hubilee.";

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  applicationName: "Pos",
  title: {
    default: "Pos",
    template: "%s · Pos",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "es",
    siteName: "Pos",
    title: "Pos",
    description: defaultDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: POS_THEME,
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
          <Toaster
            richColors
            position="top-center"
            closeButton
            duration={4000}
            visibleToasts={3}
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: "z-[100001]",
              },
            }}
            style={{ zIndex: 100001 }}
          />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
