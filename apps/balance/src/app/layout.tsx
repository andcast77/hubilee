import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BALANCE_THEME = "#059669";

const metadataBaseUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_BALANCE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw);
    } catch {
      /* fall through */
    }
  }
  return new URL("http://localhost:3005");
})();

const defaultDescription =
  "Balance: contabilidad y gestión financiera del ecosistema Hubilee.";

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  applicationName: "Balance",
  title: {
    default: "Balance",
    template: "%s · Balance",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "es",
    siteName: "Balance",
    title: "Balance",
    description: defaultDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BALANCE_THEME,
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
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
