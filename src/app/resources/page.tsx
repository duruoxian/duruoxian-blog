import type { Metadata } from "next";
import iconManifest from "@/data/link-icons.json";
import linksJson from "@/data/links.json";
import { SiteIcon } from "@/components/SiteIcon";

export const metadata: Metadata = { title: "资源", description: "整理收集的软件、工具与资料" };

type LinkItem = { name: string; url: string; desc: string; tag: string };
type Resource = { title: string; desc: string; href: string; tag: string };

// ★ 工具站收藏（后台 admin「工具站」可增删，图标由构建脚本自动抓取到 /links-icons/）
const linkManifest = iconManifest as Record<string, string>;
const linkItems = linksJson as LinkItem[];

// ★ 站内工具（刷题 / 书库 / 听力）
const tools: Resource[] = [
  {
    title: "408 刷题库",
    desc: "920 道选择题（数据结构/计组/操作系统/计网/数学），分章刷题、错题本与进度保存在本机。",
    href: "/quiz/",
    tag: "刷题",
  },
  {
    title: "考研书库",
    desc: "全库资料手机可读版，按区分组、标题搜索，深色模式自适应。",
    href: "/shuku/",
    tag: "书库",
  },
  {
    title: "核心单词听力",
    desc: "核心单词 Day 1-14，每条英文读音 + 中文释义，通勤循环听。",
    href: "/shuku/mp3",
    tag: "听力",
  },
];

// ★ 在这里维护你的外部资源清单即可
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

      <h2 className="mb-3 text-lg font-semibold">工具站收藏</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {linkItems.map((l) => {
          let host = l.url;
          try {
            host = new URL(l.url).hostname;
          } catch {
            // 非法 URL 走默认无图标
          }
          return (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-glow flex items-center gap-3 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <SiteIcon src={linkManifest[host]} name={l.name} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium">{l.name}</h3>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {l.tag}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{l.desc}</p>
              </div>
            </a>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-semibold">站内工具</h2>
      <div className="mb-8 space-y-3">
        {tools.map((r) => (
          <a
            key={r.href}
            href={r.href}
            className="block rounded-xl border border-blue-200 bg-blue-50/60 p-5 transition-colors hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:border-blue-700"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{r.title}</h2>
              <span className="shrink-0 rounded-full border border-blue-300 px-2.5 py-0.5 text-xs text-blue-600 dark:border-blue-800 dark:text-blue-400">
                {r.tag}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.desc}</p>
          </a>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">外部资源</h2>
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
