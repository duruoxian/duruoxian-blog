import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "关于", description: "关于我和这个博客" };

export default function AboutPage() {
  const a = site.author;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.avatar}
          alt={a.name}
          className="h-20 w-20 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
        />
        <div>
          <h1 className="text-2xl font-bold">{a.name}</h1>
          <p className="text-sm text-zinc-500">{a.bio}</p>
        </div>
      </div>

      <div className="article-content prose prose-zinc mt-8 max-w-none dark:prose-invert">
        <h2>你好，我是 {a.name} 👋</h2>
        <p>
          我是{a.school}{a.major}专业的一名学生，这里是我的个人博客，
          用来记录学习笔记、踩坑记录和一些技术折腾过程。
        </p>

        <h2>关于这个博客</h2>
        <p>
          本站使用 <strong>Next.js + TypeScript + Tailwind CSS</strong> 搭建，
          文章以 Markdown 编写，代码开源思路清晰，方便持续更新。
        </p>

        <h2>联系我</h2>
        <ul>
          <li>
            邮箱：<a href={`mailto:${a.email}`}>{a.email}</a>
          </li>
          <li>
            GitHub：<a href={a.github}>{a.github}</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
