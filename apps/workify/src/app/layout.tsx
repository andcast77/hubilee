import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

/** Hub / Hubilee marketing accent (indigo-500) — not Shopflow POS blue */
const WORKIFY_THEME = "#6366f1";

const metadataBaseUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw);
    } catch {
      /* fall through */
    }
  }
  return new URL("http://localhost:3003");
})();

const defaultDescription =
  "Workify: turnos, asistencia y personas para tu empresa. Módulo RRHH del ecosistema Hubilee.";

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  applicationName: "Workify",
  title: {
    default: "Workify",
    template: "%s · Workify",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "es",
    siteName: "Workify",
    title: "Workify",
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Workify",
    description: defaultDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: WORKIFY_THEME,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ServiceInitializer />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
