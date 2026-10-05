"use client";

// 站点信息编辑器：对应 src/data/site.json，只暴露经常改的字段，
// 文件里的其他键原样保留，保存后整站生效（自动部署）。

import { useEffect, useState } from "react";
import { getFile, putFile } from "@/lib/admin/github";
import { inputClass, labelClass, primaryBtn } from "./ui";

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
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>站点标题</label>
          <input
            className={inputClass}
            value={String(data.title ?? "")}
            onChange={(e) => patch(["title"], e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>建站年份</label>
          <input
            type="number"
            className={inputClass}
            value={Number(data.since ?? 2026)}
            onChange={(e) => patch(["since"], Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>站点简介</label>
        <textarea
          className={`${inputClass} resize-y`}
          rows={2}
          value={String(data.description ?? "")}
          onChange={(e) => patch(["description"], e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {(
          [
            ["name", "昵称"],
            ["bio", "一句话介绍"],
            ["email", "邮箱"],
            ["school", "学校"],
            ["major", "专业"],
            ["location", "所在地"],
            ["github", "GitHub 主页"],
            ["githubUser", "GitHub 用户名（热力图用）"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className={labelClass}>{label}</label>
            <input
              className={inputClass}
              value={String(author[key] ?? "")}
              onChange={(e) => patch(["author", key], e.target.value)}
            />
          </div>
        ))}
      </div>

      <div>
        <label className={labelClass}>头像地址</label>
        <input
          className={`${inputClass} font-mono`}
          value={String(author.avatar ?? "")}
          onChange={(e) => patch(["author", "avatar"], e.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-400">
          一般保持 /avatar.jpg 不动；换头像直接替换 public/avatar.jpg 文件（或让我来换）。
        </p>
      </div>

      <div className="flex justify-end">
        <button type="button" className={primaryBtn} onClick={save} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
