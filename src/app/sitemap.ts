import type { MetadataRoute } from "next";
import { getAllCategories, getAllPosts, getAllSeries, getAllTags } from "@/lib/posts";
import { site } from "@/lib/site";

// 静态导出模式要求这类元数据路由显式声明为静态
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/posts", "/categories", "/tags", "/series", "/resources", "/about"].map(
    (path) => ({
      url: `${site.url}${path}`,
      lastModified: new Date(),
    })
  );

  const posts = getAllPosts().map((post) => ({
    url: `${site.url}/posts/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  const categories = getAllCategories().map((c) => ({
    url: `${site.url}/categories/${encodeURIComponent(c.name)}`,
  }));
  const tags = getAllTags().map((t) => ({
    url: `${site.url}/tags/${encodeURIComponent(t.name)}`,
  }));
  const series = getAllSeries().map((s) => ({
    url: `${site.url}/series/${encodeURIComponent(s.name)}`,
  }));

  return [...staticRoutes, ...posts, ...categories, ...tags, ...series];
}
