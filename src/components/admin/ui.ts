// 后台表单控件的统一样式，和博客前端的视觉语言保持一致

export const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500/60";

export const labelClass = "mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300";

export const primaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const ghostBtn =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800";

export const cardClass =
  "rounded-xl border border-zinc-200 bg-[var(--card)] p-5 backdrop-blur-xl dark:border-zinc-800";
