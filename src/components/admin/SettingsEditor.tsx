"use client";

// 站点信息编辑器：对应 src/data/site.json，分「站点 / 作者」两组，
// 文件里的其他键原样保留，保存后整站生效（自动部署）。

import { useEffect, useState } from "react";
import { getFile, putFile } from "@/lib/admin/github";
import { inputClass, labelClass, primaryBtn, sectionBarClass, sectionTitleClass } from "./ui";

const FILE_PATH = "src/data/site.json";

export function SettingsEditor({ onDone }: { onDone: (message: string) => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [sha, setSha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFile(FILE_PATH)
      .then(({ content, sha: fileSha }) => {
        const loaded = JSON.parse(content) as Record<string, unknown>;
        // 兼容旧配置：字段缺失时补齐空结构，避免编辑器报错
        loaded.comments ??= {
          giscusRepo: "",
          giscusRepoId: "",
          giscusCategory: "",
          giscusCategoryId: "",
        };
        loaded.analytics ??= { cloudflareToken: "" };
        setSha(fileSha);
        setData(loaded);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "读取站点信息失败"),
      );
  }, []);

  function patch(path: string[], value: unknown) {
    setData((current) => {
      if (!current) return current;
      const next = structuredClone(current) as Record<string, unknown>;
      let node = next;
      for (const key of path.slice(0, -1)) {
        node = node[key] as Record<string, unknown>;
      }
      node[path[path.length - 1]] = value;
      return next;
    });
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      await putFile(
        FILE_PATH,
        `${JSON.stringify(data, null, 2)}\n`,
        "后台更新站点信息",
        sha,
      );
      onDone("站点信息已保存，约 2 分钟后全站生效");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!data) return <p className="py-10 text-center text-sm text-zinc-400">读取中…</p>;

  const author = data.author as Record<string, unknown>;
  const comments = data.comments as Record<string, unknown>;
  const analytics = data.analytics as Record<string, unknown>;

  return (
    <div className="space-y-7">
      {/* ── 站点 ── */}
      <section>
        <h3 className={sectionTitleClass}>
          <span className={sectionBarClass} />
          站点
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>站点标题</span>
            <input
              className={inputClass}
              value={String(data.title ?? "")}
              onChange={(e) => patch(["title"], e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>建站年份</span>
            <input
              type="number"
              className={inputClass}
              value={Number(data.since ?? 2026)}
              onChange={(e) => patch(["since"], Number(e.target.value))}
            />
          </label>
        </div>
        <label className="mt-5 block">
          <span className={labelClass}>站点简介</span>
          <textarea
            className={`${inputClass} resize-y`}
            rows={2}
            value={String(data.description ?? "")}
            onChange={(e) => patch(["description"], e.target.value)}
          />
        </label>
      </section>

      <hr className="border-[var(--border)]" />

      {/* ── 作者 ── */}
      <section>
        <h3 className={sectionTitleClass}>
          <span className={sectionBarClass} />
          作者
        </h3>
        <div className="flex flex-col gap-5 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(author.avatar ?? "/avatar.jpg")}
            alt="头像预览"
            className="h-20 w-20 shrink-0 self-start rounded-full object-cover ring-2 ring-indigo-500/30"
          />
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>昵称</span>
              <input
                className={inputClass}
                value={String(author.name ?? "")}
                onChange={(e) => patch(["author", "name"], e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>一句话介绍</span>
              <input
                className={inputClass}
                value={String(author.bio ?? "")}
                onChange={(e) => patch(["author", "bio"], e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>邮箱</span>
              <input
                className={inputClass}
                value={String(author.email ?? "")}
                onChange={(e) => patch(["author", "email"], e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>学校</span>
              <input
                className={inputClass}
                value={String(author.school ?? "")}
                onChange={(e) => patch(["author", "school"], e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>专业</span>
              <input
                className={inputClass}
                value={String(author.major ?? "")}
                onChange={(e) => patch(["author", "major"], e.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>所在地</span>
              <input
                className={inputClass}
                value={String(author.location ?? "")}
                onChange={(e) => patch(["author", "location"], e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>GitHub 主页</span>
            <input
              className={inputClass}
              value={String(author.github ?? "")}
              onChange={(e) => patch(["author", "github"], e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>GitHub 用户名（热力图用）</span>
            <input
              className={inputClass}
              value={String(author.githubUser ?? "")}
              onChange={(e) => patch(["author", "githubUser"], e.target.value)}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          换头像不在这里：把新图片替换仓库里的 <code>public/avatar.jpg</code>（或让我来换），
          左侧预览会随之更新。
        </p>
      </section>

      <hr className="border-[var(--border)]" />

      {/* ── 评论（Giscus）── */}
      <section>
        <h3 className={sectionTitleClass}>
          <span className={sectionBarClass} />
          评论（Giscus · 基于 GitHub Discussions）
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-zinc-400">
          四项都填好保存后，每篇文章底部会出现评论区；留空则不显示。获取方式：
          确认仓库为 Public 并在仓库 Settings 勾选 Discussions → 打开{" "}
          <a
            href="https://giscus.app/zh-CN"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            giscus.app/zh-CN
          </a>{" "}
          → 填仓库名并按提示安装 giscus App → 分类选 Announcements →
          把页面生成的 <code>data-repo / data-repo-id / data-category / data-category-id</code>{" "}
          四个值依次抄到下面。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>仓库（owner/repo）</span>
            <input
              className={inputClass}
              placeholder="duruoxian/duruoxian-blog"
              value={String(comments.giscusRepo ?? "")}
              onChange={(e) => patch(["comments", "giscusRepo"], e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>仓库 ID（data-repo-id）</span>
            <input
              className={inputClass}
              placeholder="R_kgDOxxxx"
              value={String(comments.giscusRepoId ?? "")}
              onChange={(e) => patch(["comments", "giscusRepoId"], e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>分类名（data-category）</span>
            <input
              className={inputClass}
              placeholder="Announcements"
              value={String(comments.giscusCategory ?? "")}
              onChange={(e) => patch(["comments", "giscusCategory"], e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>分类 ID（data-category-id）</span>
            <input
              className={inputClass}
              placeholder="DIC_kwDOxxxx"
              value={String(comments.giscusCategoryId ?? "")}
              onChange={(e) => patch(["comments", "giscusCategoryId"], e.target.value)}
            />
          </label>
        </div>
      </section>

      <hr className="border-[var(--border)]" />

      {/* ── 访问统计 ── */}
      <section>
        <h3 className={sectionTitleClass}>
          <span className={sectionBarClass} />
          访问统计（Cloudflare Web Analytics）
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-zinc-400">
          免费、匿名、无 Cookie。**推荐在控制台开启自动注入（见下方），本框请保持留空**——
          两边同时启用会注入两份脚本、造成访问量重复统计。控制台开启方式：Workers 和 Pages →
          `duruoxian-blog` 项目 →「Metrics / 指标」标签页 → Web Analytics 点 Enable
          （注意在 Metrics 里，不是 Settings；启用后 Cloudflare 会在下次部署时自动注入统计脚本，
          无需填任何东西）。也可手动：控制台「分析和日志 → Web Analytics」添加站点，
          把脚本里 <code>token</code> 引号的值粘到下面。
        </p>
        <label className="block">
          <span className={labelClass}>Beacon Token（不填 = 关闭统计）</span>
          <input
            className={inputClass}
            placeholder="粘贴 token，例如 1a2b3c4d5678ef90"
            value={String(analytics.cloudflareToken ?? "")}
            onChange={(e) => patch(["analytics", "cloudflareToken"], e.target.value)}
          />
        </label>
      </section>

      <div className="flex justify-end border-t border-[var(--border)] pt-4">
        <button type="button" className={primaryBtn} onClick={save} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
