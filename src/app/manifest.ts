import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// PWA 清单：让网站可以「添加到主屏幕」，像 App 一样全屏打开。
// 静态导出模式需显式声明为静态，构建时会生成 /manifest.webmanifest。
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.author.name,
    description: site.description,
    lang: "zh-CN",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f8",
    theme_color: "#f7f7f8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
