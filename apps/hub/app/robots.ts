import type { MetadataRoute } from "next";
import { buildHubRobotsConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return buildHubRobotsConfig();
}
