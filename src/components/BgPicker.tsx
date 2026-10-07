"use client";

import { useEffect, useRef, useState } from "react";

// 背景主题选择器：顶栏调色盘按钮 + 弹出色板。
// 选择写入 localStorage.bg 并挂到 <html data-bg>，CSS 变量随之切换
// （背景光斑 + 全站强调色一起变）。默认 aurora。
const THEMES = [
  { id: "aurora", label: "极光", colors: ["#6366f1", "#06b6d4", "#a855f7"] },
  { id: "sakura", label: "樱粉", colors: ["#ec4899", "#f472b6", "#a855f7"] },
  { id: "ocean", label: "深海", colors: ["#0ea5e9", "#22d3ee", "#2563eb"] },
  { id: "forest", label: "森野", colors: ["#10b981", "#84cc16", "#14b8a6"] },
  { id: "dusk", label: "暮橙", colors: ["#f97316", "#f43f5e", "#eab308"] },
  { id: "pure", label: "素净", colors: ["#fafafa", "#a1a1aa", "#52525b"] },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

// DOM 与 localStorage 写入放在组件外，方便 React 编译器静态检查
function applyBgTheme(id: ThemeId) {
  try {
    localStorage.setItem("bg", id);
  } catch {
    /* 忽略隐私模式异常 */
  }
  const root = document.documentElement;
  if (id === "aurora") {
    delete root.dataset.bg; // aurora 是 CSS 默认值，无需属性
  } else {
    root.dataset.bg = id;
  }
}

export function BgPicker() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // 当前主题只在弹层（客户端交互后才渲染）里显示，无 SSR 水合风险
  const [current, setCurrent] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "aurora";
    try {
      const saved = localStorage.getItem("bg") as ThemeId | null;
      return saved && THEMES.some((t) => t.id === saved) ? saved : "aurora";
    } catch {
      return "aurora";
    }
  });

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: ThemeId) {
    setCurrent(id);
    applyBgTheme(id);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="切换主题背景"
        aria-expanded={open}
        title="切换主题背景"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {/* 调色盘 */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="13.5" cy="6.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r=".9" fill="currentColor" stroke="none" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-zinc-200 bg-[var(--page)] p-2 shadow-xl shadow-zinc-900/10 backdrop-blur-xl dark:border-zinc-700 dark:shadow-zinc-950/40"
          style={{ animation: "view-in 0.15s ease both" }}
        >
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-zinc-400">主题背景</p>
          <div className="grid grid-cols-3 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                title={t.label}
                aria-label={`主题背景：${t.label}`}
                aria-pressed={current === t.id}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  current === t.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <span
                  className={`h-6 w-6 rounded-full shadow-sm ring-offset-1 transition-shadow ${
                    current === t.id ? "ring-2 ring-zinc-400 dark:ring-zinc-500" : ""
                  }`}
                  style={{
                    background:
                      t.id === "pure"
                        ? "linear-gradient(135deg, #fff 40%, #a1a1aa)"
                        : `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]} 55%, ${t.colors[2]})`,
                  }}
                />
                <span className="text-[10px] leading-none text-zinc-500 dark:text-zinc-400">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
