// 后台表单控件的统一样式，和博客前端的视觉语言保持一致

export const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-sm outline-none transition-all placeholder:text-zinc-400 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:bg-white/5";

export const labelClass = "mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400";

export const primaryBtn =
  "inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

export const ghostBtn =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800";

// 编辑器/站点信息这类主面板：渐变描边玻璃卡（和资料卡同款）
export const panelClass =
  "gradient-border rounded-xl p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-xl";

// 分组小标题：左侧渐变竖条
export const sectionTitleClass =
  "mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200";

export const sectionBarClass = "h-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500";
