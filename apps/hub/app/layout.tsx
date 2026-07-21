import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import {
  buildHubRootMetadata,
  resolveHubMetadataBaseUrl,
} from "@/lib/seo";
import "../src/globals.css";

export const metadata: Metadata = buildHubRootMetadata(
  resolveHubMetadataBaseUrl(),
);

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
