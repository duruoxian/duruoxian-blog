"use client";

import { useEffect } from "react";

// 把文章里的 .mermaid-block 占位结构渲染成 SVG 图表。
// 正文是 dangerouslySetInnerHTML 的静态 HTML，所以和 CodeCopy 一样挂载后操作 DOM。
// mermaid 很大（约 1MB），只在页面真的含 mermaid 块时才动态 import；
// 深浅色切换时用 MutationObserver 监听 <html> class 变化并重渲染。
export function Mermaid() {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>(".mermaid-block"));
    if (blocks.length === 0) return;
    // 首渲染会用 innerHTML 覆盖整个块（含 .mermaid-src），所以源码必须现在缓存，
    // 深浅色重渲染时读缓存而不是再查 DOM
    const sources = blocks.map((b) => b.querySelector(".mermaid-src")?.textContent ?? "");

    let cancelled = false;
    let disconnect: (() => void) | undefined;
    let seq = 0;
    // 只用得到这两个 API；mermaid 包的类型导出形状怪异，自定义最小接口最稳
    type MermaidInstance = {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, text: string) => Promise<{ svg: string }>;
    };

    const render = async (mermaid: MermaidInstance) => {
      const dark = document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: dark ? "dark" : "default",
        themeVariables: { background: "transparent", fontFamily: "inherit" },
      });
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        try {
          const { svg } = await mermaid.render(`mmd-${seq++}`, sources[i]);
          block.classList.add("mermaid-ok");
          block.innerHTML = svg;
        } catch {
          // 渲染失败：回退成普通代码块，至少源码可读
          block.classList.remove("mermaid-ok");
          block.innerHTML = "";
          const pre = document.createElement("pre");
          pre.className = "mermaid-error";
          pre.textContent = sources[i];
          block.appendChild(pre);
        }
      }
    };

    (async () => {
      // 运行时是标准 default 导出；?? 兜底兼容互操作形态差异
      const mod = (await import("mermaid")) as unknown as {
        default: MermaidInstance;
      } & MermaidInstance;
      const mermaid = mod.default ?? mod;
      if (cancelled) return;
      await render(mermaid);
      if (cancelled) return;
      const obs = new MutationObserver(() => {
        void render(mermaid);
      });
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-bg"],
      });
      disconnect = () => obs.disconnect();
    })().catch(() => {});

    return () => {
      cancelled = true;
      disconnect?.();
    };
  }, []);

  return null;
}
