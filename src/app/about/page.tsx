import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getFeaturedProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "关于",
  description: "我是谁、现在在做什么、这个博客用什么搭的、以及怎么联系我。",
};

export default function AboutPage() {
  const a = site.author;
  const featured = getFeaturedProjects();

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
        <h2>现在在做</h2>
        <ul>
          <li>
            <strong>备考 408</strong>:目标 985/211 软件工程专硕,统考 408 + 数一 + 英一,
            为此给自己建了<a href="/quiz/">在线刷题库</a>和<a href="/shuku/">考研书库</a>。
          </li>
          <li>
            <strong>维护 <a href="https://github.com/duruoxian/webai2api" target="_blank" rel="noopener noreferrer">webai2api</a></strong>
            :把四个大模型网页版反向代理成 OpenAI 兼容 API 的 Windows 工具,迭代中。
          </li>
          <li>
            <strong>折腾 <a href="https://github.com/duruoxian/ocs" target="_blank" rel="noopener noreferrer">ocs</a></strong>
            :给 AI 编程终端写的历史会话选择器,跨 Linux / Windows。
          </li>
        </ul>

        <h2>关于这个博客</h2>
        <p>
          本站用 <strong>Next.js + TypeScript + Tailwind CSS</strong> 从零搭建、静态导出后部署在
          Cloudflare Pages,文章全是 Markdown。除了写文章,还有几个自己造的子系统:
          <a href="/quiz/">刷题库</a>(920 题,错题本存本机)、<a href="/shuku/">书库</a>、
          <a href="/resources/">资源页</a>,以及一个图形化写作后台。
          建站过程完整记录在
          <a href="/posts/nextjs-blog-from-scratch/">《从零到上线》</a>里。
        </p>

        <h2>技能画像</h2>
        <p>
          主力 Python 和 TypeScript,能写 C 和 Java;
          折腾方向是 Linux / Windows 双修、终端工具链、协议逆向和自托管——
          这个博客本身就是最大的折腾成品。
        </p>

        <h2>我做过什么</h2>
        <p>
          开源工具、课程设计和站内子系统都收在<a href="/projects/">项目页</a>,
          当前精选:
        </p>
        <ul>
          {featured.map((p) => (
            <li key={p.name}>
              <Link href="/projects">{p.name}</Link> —— {p.tagline.split(/[:：。]/)[0]}
            </li>
          ))}
        </ul>

        <h2>联系我</h2>
        <ul>
          <li>
            邮箱:<a href={`mailto:${a.email}`}>{a.email}</a>
          </li>
          <li>
            GitHub:<a href={a.github} target="_blank" rel="noopener noreferrer">{a.github}</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
