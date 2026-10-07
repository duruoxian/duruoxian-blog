"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

// giscus 的 iframe 只在 ready 之后才收得到主题消息。
// 组件挂载时 iframe 往往还没加载完，直接在 effect 里 postMessage 会丢失，
// 所以这里「发一次 + 收到 giscus 消息后再补发」，保证暗色下不会残留亮色面板。
type GiscusTheme = "light" | "dark";

function postTheme(theme: GiscusTheme) {
  document
    .querySelector<HTMLIFrameElement>("iframe.giscus-frame")
    ?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, "https://giscus.app");
}

// Giscus 评论（基于 GitHub Discussions，免费无广告）。
// 四个配置都填了才会渲染；没配置时整个区块不出现。
// 激活步骤见 docs/使用与维护手册.md「评论系统」一节。
export function Giscus() {
  const g = site.comments;
  const configured = Boolean(
    g?.giscusRepo && g?.giscusRepoId && g?.giscusCategory && g?.giscusCategoryId
  );
  const [theme, setTheme] = useState<GiscusTheme>("light");
  const themeRef = useRef<GiscusTheme>("light");

  // 跟随站点亮暗主题：观察 <html> 的 class 变化
  useEffect(() => {
    if (!configured) return;
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    sync();
    const ob = new MutationObserver(sync);
    ob.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => ob.disconnect();
  }, [configured]);

  // 主题变化时同步给 iframe，并记录当前值
  useEffect(() => {
    if (!configured) return;
    themeRef.current = theme;
    postTheme(theme);
  }, [configured, theme]);

  // giscus 加载完成后会主动 postMessage，此时补发一次主题（修复首屏丢失）
  useEffect(() => {
    if (!configured) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://giscus.app") return;
      postTheme(themeRef.current);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [configured]);

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
