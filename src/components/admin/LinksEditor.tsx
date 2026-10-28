"use client";

// 工具站收藏编辑器：读写 src/data/links.json（GitHub Contents API）。
// 图标不用手动管：保存后下一次构建，fetch-links-icons.mjs 会自动抓新站点的 favicon。

import { useEffect, useState } from "react";
import { getFile, putFile } from "@/lib/admin/github";
import { ghostBtn, inputClass, primaryBtn } from "./ui";

type LinkItem = { name: string; url: string; desc: string; tag: string };
const PATH = "src/data/links.json";

export function LinksEditor({ onDone }: { onDone: (message: string) => void }) {
  const [items, setItems] = useState<LinkItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const { content } = await getFile(PATH);
        if (alive) setItems(JSON.parse(content) as LinkItem[]);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "读取失败");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function update(i: number, key: keyof LinkItem, value: string) {
    setItems((prev) => prev!.map((it, j) => (j === i ? { ...it, [key]: value } : it)));
  }

  async function save() {
    if (!items) return;
    const bad = items.find((it) => !it.name.trim() || !it.url.trim());
    if (bad) {
      setErr("有链接缺名称或 URL，补全后再保存。");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await putFile(
        PATH,
        JSON.stringify(items, null, 2) + "\n",
        `后台更新工具站收藏（共 ${items.length} 条）`,
      );
      onDone(`工具站收藏已保存（${items.length} 条），约 2 分钟后上线，新站图标会在构建时自动抓取`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (err && !items) return <p className="text-sm text-red-500">{err}</p>;
  if (!items) return <p className="text-sm text-zinc-400">加载中…</p>;

  return (
    <div>
      <p className="mb-4 text-xs text-zinc-400">
        图标会按域名自动抓取 favicon（下次构建时生效，抓不到的显示首字母色块）。保存会提交到
        GitHub 并触发部署。
      </p>

      <div className="space-y-4">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">#{i + 1}</span>
              <button
                type="button"
                className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-500 transition-colors hover:bg-red-500/10"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                删除
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="名称"
                value={it.name}
                onChange={(e) => update(i, "name", e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="标签（如：效率 / 文档 / AI）"
                value={it.tag}
                onChange={(e) => update(i, "tag", e.target.value)}
              />
            </div>
            <input
              className={`${inputClass} mt-2`}
              placeholder="https://…"
              value={it.url}
              onChange={(e) => update(i, "url", e.target.value)}
            />
            <input
              className={`${inputClass} mt-2`}
              placeholder="一句话描述"
              value={it.desc}
              onChange={(e) => update(i, "desc", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className={ghostBtn}
          onClick={() =>
            setItems([...items, { name: "", url: "https://", desc: "", tag: "效率" }])
          }
        >
          ＋ 添加一条
        </button>
        <button type="button" className={primaryBtn} onClick={save} disabled={saving}>
          {saving ? "保存中…" : `保存全部（${items.length} 条）`}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
    </div>
  );
}
