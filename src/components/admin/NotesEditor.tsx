"use client";

// 想法(Notes)速记:admin 首屏的碎片发布器。
// 发布 = 创建 content/notes/YYYY-MM-DD-HHMM.md;删除 = 删除对应文件。构建后自动上线。

import { useEffect, useState } from "react";
import { deleteFile, getFile, listDir, putFile } from "@/lib/admin/github";
import { ghostBtn, inputClass, primaryBtn } from "./ui";

type NoteEntry = { name: string; sha: string; date: string; text: string };
const DIR = "content/notes";

function parseNote(raw: string): { date: string; text: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = m?.[1] ?? "";
  const date = fm.match(/^date:\s*(.+)$/m)?.[1]?.trim() ?? "";
  return { date, text: (m?.[2] ?? raw).trim() };
}

export function NotesEditor({ onDone }: { onDone: (message: string) => void }) {
  const [notes, setNotes] = useState<NoteEntry[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const entries = await listDir(DIR);
    const items: NoteEntry[] = [];
    for (const e of entries.filter((e) => e.type === "file" && e.name.endsWith(".md"))) {
      try {
        const { content } = await getFile(`${DIR}/${e.name}`);
        const { date, text } = parseNote(content);
        items.push({ name: e.name, sha: e.sha, date: date || e.name, text });
      } catch {
        // 单条读取失败不挡整个列表
      }
    }
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    setNotes(items);
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      try {
        if (alive) await refresh();
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "读取失败");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function publish() {
    const text = draft.trim();
    if (!text) {
      setErr("先写点什么再发布。");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      // 本地时区 ISO;文件名带时分秒,同一天可发多条
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      const body = `---\ndate: ${now.toISOString()}\n---\n\n${text}\n`;
      await putFile(`${DIR}/${stamp}.md`, body, `后台发布想法(速记)`);
      setDraft("");
      await refresh();
      onDone("想法已发布,约 2 分钟后上线");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "发布失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(note: NoteEntry) {
    if (!window.confirm("删除这条想法?线上要等下次构建才消失。")) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteFile(`${DIR}/${note.name}`, note.sha, `后台删除想法:${note.text.slice(0, 20)}`);
      await refresh();
      onDone("想法已删除,约 2 分钟后生效");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* 速记输入区 */}
      <textarea
        className={`${inputClass} min-h-20 resize-y`}
        placeholder="一句话的想法、踩坑、灵感…(发布到首页与 /notes)"
        value={draft}
        maxLength={280}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{draft.length}/280</span>
        <button type="button" className={primaryBtn} onClick={publish} disabled={busy || !draft.trim()}>
          {busy ? "发布中…" : "发布想法"}
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}

      {/* 已发布列表 */}
      <h3 className="mt-6 mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        已发布 {notes ? `(${notes.length})` : ""}
      </h3>
      {!notes ? (
        <p className="text-sm text-zinc-400">加载中…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-zinc-400">还没有想法。</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.name}
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="min-w-0">
                <time className="font-mono text-xs text-zinc-400">{n.date.slice(0, 16)}</time>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
                  {n.text}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-500/10"
                onClick={() => remove(n)}
                disabled={busy}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        小贴士:长内容请用「新建文章」;想法正文支持 Markdown 行内语法。
      </p>
      <div className="mt-2">
        <button type="button" className={ghostBtn} onClick={() => void refresh()} disabled={busy}>
          刷新列表
        </button>
      </div>
    </div>
  );
}
