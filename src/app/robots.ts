import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// 静态导出模式要求这类元数据路由显式声明为静态
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
