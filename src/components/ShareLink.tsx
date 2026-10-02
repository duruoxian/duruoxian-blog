"use client";

import { useState } from "react";

// 文章分享按钮：手机上走系统原生分享，桌面端退化为复制链接。
export function ShareLink({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // 用户取消了系统分享面板，不算失败，也不必再弹复制
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用（如非安全上下文），静默忽略
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M11.5 6a2.5 2.5 0 1 0-2.45-2H6.95a2.5 2.5 0 1 0 0 1h2.1A2.5 2.5 0 0 0 11.5 6Zm0 0c0 .71-.3 1.35-.77 1.8M4.5 10a2.5 2.5 0 1 0 2.45 2h2.1a2.5 2.5 0 0 0 1.68-4.2M4.5 10c0-.71.3-1.35.77-1.8m0 0L9.28 5.8m-4 2.4 4.01 2.4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      {copied ? "链接已复制" : "分享本文"}
    </button>
  );
}
