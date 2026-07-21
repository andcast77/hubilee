import type { MetadataRoute } from "next";
import { buildHubWebAppManifest } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return buildHubWebAppManifest();
}
