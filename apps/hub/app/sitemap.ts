import type { MetadataRoute } from "next";
import {
  buildHubSitemapEntries,
  resolveHubMetadataBaseUrl,
} from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildHubSitemapEntries(resolveHubMetadataBaseUrl());
}
