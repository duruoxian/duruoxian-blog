"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";

// Giscus 评论（基于 GitHub Discussions，免费无广告）。
// 四个配置都填了才会渲染；没配置时整个区块不出现。
// 激活步骤见 docs/使用与维护手册.md「评论系统」一节。
export function Giscus() {
  const g = site.comments;
  const configured = Boolean(
    g?.giscusRepo && g?.giscusRepoId && g?.giscusCategory && g?.giscusCategoryId
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // 跟随站点亮暗主题：观察 <html> 的 class，同步给 giscus iframe
  useEffect(() => {
    if (!configured) return;
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    sync();
    const ob = new MutationObserver(sync);
    ob.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => ob.disconnect();
  }, [configured]);

  useEffect(() => {
    document
      .querySelector<HTMLIFrameElement>("iframe.giscus-frame")
      ?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
  }, [theme]);

  if (!configured) return null;

  return (
    <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">评论</h2>
      <Script
        src="https://giscus.app/client.js"
        data-repo={g.giscusRepo}
        data-repo-id={g.giscusRepoId}
        data-category={g.giscusCategory}
        data-category-id={g.giscusCategoryId}
        data-mapping="pathname"
        data-strict="1"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme={theme}
        data-lang="zh-CN"
        data-loading="lazy"
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
    </section>
  );
}
