"use client";

// 友链编辑器:读写 src/data/friendLinks.json(GitHub Contents API)。
// 与 LinksEditor(工具站收藏)同构:加载 → 行内编辑 → 一次提交。

import { useEffect, useState } from "react";
import { getFile, putFile } from "@/lib/admin/github";
import { ghostBtn, inputClass, primaryBtn } from "./ui";

type FriendLink = { name: string; url: string; desc: string; avatar: string };
const PATH = "src/data/friendLinks.json";

export function FriendsEditor({ onDone }: { onDone: (message: string) => void }) {
  const [items, setItems] = useState<FriendLink[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        const { content } = await getFile(PATH);
        if (alive) setItems(JSON.parse(content) as FriendLink[]);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "读取失败");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function update(i: number, key: keyof FriendLink, value: string) {
    setItems((prev) => prev!.map((it, j) => (j === i ? { ...it, [key]: value } : it)));
  }

  async function save() {
    if (!items) return;
    const bad = items.find((it) => !it.name.trim() || !it.url.trim());
    if (bad) {
      setErr("有友链缺名称或 URL,补全后再保存。");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await putFile(
        PATH,
        JSON.stringify(items, null, 2) + "\n",
        `后台更新友链(共 ${items.length} 条)`,
      );
      onDone(`友链已保存(${items.length} 条),约 2 分钟后上线`);
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
        头像留空则显示首字母色块。对方若要求下架,删除条目保存即可。保存会提交到 GitHub 并触发部署。
      </p>

      <div className="space-y-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
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
                placeholder="头像图片地址(可留空)"
                value={it.avatar}
                onChange={(e) => update(i, "avatar", e.target.value)}
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
          onClick={() => setItems([...items, { name: "", url: "https://", desc: "", avatar: "" }])}
        >
          ＋ 添加一条
        </button>
        <button type="button" className={primaryBtn} onClick={save} disabled={saving}>
          {saving ? "保存中…" : `保存全部(${items.length} 条)`}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
    </div>
  );
}
