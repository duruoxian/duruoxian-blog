"use client";

import { useEffect, useRef } from "react";

// 顶部阅读进度条：随滚动从左到右填充，表示当前文章阅读进度。
// 用 transform: scaleX 而不是改宽度，滚动时不会触发重排。
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div aria-hidden className="reading-progress">
      <div ref={barRef} />
    </div>
  );
}
