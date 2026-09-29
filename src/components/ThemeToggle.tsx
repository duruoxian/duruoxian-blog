"use client";

// 三态主题：跟随系统 → 亮色 → 暗色 循环。
// 直接操作 DOM（不依赖 React state），保证首屏不闪烁、不产生 hydration 不一致。
// 当前处于哪一态，由 <html data-theme> 决定，图标显隐在 globals.css 里控制。
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const order = ["system", "light", "dark"] as const;
    const current = (root.dataset.theme as (typeof order)[number]) || "system";
    const next = order[(order.indexOf(current) + 1) % order.length];

    if (next === "system") {
      delete root.dataset.theme;
      try {
        localStorage.removeItem("theme");
      } catch {
        /* 忽略隐私模式异常 */
      }
    } else {
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* 忽略隐私模式异常 */
      }
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", next === "dark" || (next === "system" && prefersDark));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换主题（跟随系统 / 亮色 / 暗色）"
      title="切换主题：跟随系统 / 亮色 / 暗色"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {/* 跟随系统 */}
      <svg
        className="theme-icon theme-icon-system"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>

      {/* 亮色：太阳 */}
      <svg
        className="theme-icon theme-icon-light"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>

      {/* 暗色：月亮 */}
      <svg
        className="theme-icon theme-icon-dark"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
