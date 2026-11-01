import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "装备与工具",
  description: "我的系统、终端、编辑器、建站栈与学习装备清单。",
};

export default function UsesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">装备与工具</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        我的折腾清单——写代码、写作和学习用的东西。原则:能用免费的就用免费的,能自己写的就自己写。
      </p>

      <div className="article-content prose prose-zinc mt-8 max-w-none dark:prose-invert">
        <h2>系统与硬件</h2>
        <ul>
          <li><strong>Windows 11 台式机</strong> —— 主力机,写作、开发、打包发布都在这</li>
          <li><strong>Manjaro Linux</strong> —— 另一套常用环境,系统监视器、U-Boot 移植这类实验都在上面做</li>
          <li><strong>安卓手机</strong> —— 随身遥控器:出门在外全靠它远程处理电脑上的事,这个博客的日常维护也不例外</li>
        </ul>

        <h2>终端与开发</h2>
        <ul>
          <li><strong>Windows Terminal + PowerShell</strong> —— 默认工作台,配合 fzf 把"找文件、找历史、选会话"全变成模糊搜索</li>
          <li><strong>ocs(自研)</strong> —— 管理 opencode / claude code / codex 的历史会话,单文件 Python,零依赖</li>
          <li><strong>VS Code + opencode</strong> —— AI 结对编程搭档,主力模型走自己写的 webai2api</li>
          <li><strong>Python / FastAPI</strong> —— 脚本与后端首选;<strong>TypeScript</strong> 写前端;<strong>C / Java</strong> 留给课程和底层实验</li>
        </ul>

        <h2>建站栈</h2>
        <ul>
          <li><strong>Next.js + Tailwind CSS</strong> —— 静态导出,零服务器</li>
          <li><strong>Cloudflare Pages + GitHub Actions</strong> —— git push 即部署,约 2 分钟上线</li>
          <li><strong>自研图形化后台 + Giscus</strong> —— 手机上也能改文章、管友链,评论基于 GitHub Discussions</li>
          <li><strong>总成本:¥0/年</strong> —— 域名都还没买,先把内容写起来</li>
        </ul>

        <h2>学习装备(备考 408)</h2>
        <ul>
          <li><strong><a href="/quiz/">刷题站(自建)</a></strong> —— 920 道选择题分章刷,错题本与进度存本机</li>
          <li><strong><a href="/shuku/">考研书库(自建)</a></strong> —— 124 份资料的手机可读版,标题搜索</li>
          <li><strong><a href="/shuku/mp3">核心单词听力(自建)</a></strong> —— Day1-14 共 1428 词条,通勤当播客听</li>
          <li><strong>双栏密排打印 PDF</strong> —— 自写生成器,屏幕版转打印版省 67% 纸</li>
        </ul>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          清单随折腾更新,最后整理于 2026 年 11 月。
        </p>
      </div>
    </div>
  );
}
