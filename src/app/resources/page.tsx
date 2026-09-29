import type { Metadata } from "next";

export const metadata: Metadata = { title: "资源", description: "整理收集的软件、工具与资料" };

type Resource = { title: string; desc: string; href: string; tag: string };

// ★ 在这里维护你的资源清单即可
const resources: Resource[] = [
  {
    title: "示例资源：Next.js 官方文档",
    desc: "本站所使用框架的官方文档，学习 Next.js 的最佳入口。",
    href: "https://nextjs.org/docs",
    tag: "前端",
  },
  {
    title: "示例资源：Tailwind CSS",
    desc: "原子化 CSS 框架，用来快速搭建好看的界面。",
    href: "https://tailwindcss.com/docs",
    tag: "样式",
  },
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">资源</h1>

      <div className="space-y-3">
        {resources.map((r) => (
          <a
            key={r.href}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-zinc-200 bg-[var(--card)] p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{r.title}</h2>
              <span className="shrink-0 rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500 dark:border-zinc-700">
                {r.tag}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
