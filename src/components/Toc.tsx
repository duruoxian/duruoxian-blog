"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

// 目录：滚动时高亮当前所在章节（scroll-spy）
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="目录" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">目录</p>
      <ul className="space-y-1.5 border-l border-zinc-200 dark:border-zinc-800">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} style={{ paddingLeft: Math.max(0, item.depth - 2) * 12 + 12 }}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`-ml-3 block truncate border-l pl-3 transition-colors ${
                  isActive
                    ? "border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
