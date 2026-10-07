"use client";

import { useEffect, useState } from "react";

// 文章内图片点击放大：点击正文任意图片进入全屏灯箱，
// 点击任意处 / Esc / 滚轮均可关闭。纯轻量实现，不引入依赖。
export function ImageZoom() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".article-content img"));
    const cleanups: Array<() => void> = [];

    for (const img of images) {
      if (img.closest("a")) continue; // 已被链接包裹的图片不拦截
      img.classList.add("cursor-zoom-in");
      const onClick = () => setSrc(img.currentSrc || img.src);
      img.addEventListener("click", onClick);
      cleanups.push(() => img.removeEventListener("click", onClick));
    }
    return () => cleanups.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSrc(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [src]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-label="查看大图"
      aria-modal
      onClick={() => setSrc(null)}
      className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm"
      style={{ animation: "view-in 0.18s ease both" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full rounded-lg border border-white/10 object-contain shadow-2xl"
      />
      <button
        type="button"
        aria-label="关闭"
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
