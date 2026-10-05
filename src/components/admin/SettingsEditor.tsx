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
        setSha(fileSha);
        setData(JSON.parse(content) as Record<string, unknown>);
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

      <div className="flex justify-end border-t border-[var(--border)] pt-4">
        <button type="button" className={primaryBtn} onClick={save} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
