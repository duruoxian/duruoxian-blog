"use client";

// 博客后台主界面：登录 → 文章列表 → 编辑器 / 站点信息。
// 视觉完全复用前端样式（顶栏/底栏/极光由根布局提供），数据操作走 GitHub API。

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PostEditor } from "./PostEditor";
import { SettingsEditor } from "./SettingsEditor";
import { cardClass, ghostBtn, inputClass, primaryBtn } from "./ui";
import {
  clearToken,
  deleteFile,
  getToken,
  isAuthError,
  listDir,
  getFile,
  migrateLegacyToken,
  putFile,
  setToken,
} from "@/lib/admin/github";
import { parsePost, serializePost, type PostMeta } from "@/lib/admin/content";

type Entry = { meta: PostMeta; sha: string };
type View = { kind: "list" } | { kind: "edit"; entry: Entry; isNew: boolean } | { kind: "settings" };

function newPost(): PostMeta {
  return {
    slug: "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: "技术",
    tags: [],
    draft: true,
    body: "",
    extra: {},
  };
}

export function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleErr = useCallback((err: unknown) => {
    if (isAuthError(err)) {
      clearToken();
      setAuthed(false);
      setError("登录已过期，请重新输入令牌。");
    } else {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const files = await listDir("content/posts");
      const mdFiles = files.filter((f) => f.type === "file" && /\.(mdx?)$/.test(f.name));
      const loaded = await Promise.all(
        mdFiles.map(async (f) => {
          const { content, sha } = await getFile(f.path);
          return { meta: parsePost(content, f.name.replace(/\.mdx?$/, "")), sha };
        }),
      );
      loaded.sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));
      setEntries(loaded);
    } catch (err) {
      handleErr(err);
    }
  }, [handleErr]);

  // 首次挂载：继承旧后台令牌 → 恢复登录态 → 拉取文章列表。
  // 先 await 让出同步栈，避免在 effect 内同步 setState（react-hooks/set-state-in-effect）。
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      migrateLegacyToken();
      const token = getToken();
      setAuthed(Boolean(token));
      setReady(true);
      if (token) await loadPosts();
    })();
  }, [loadPosts]);

  async function savePost(meta: PostMeta, sha?: string) {
    setBusy(true);
    setError(null);
    try {
      const exists = Boolean(sha);
      await putFile(
        `content/posts/${meta.slug}.md`,
        serializePost(meta),
        `${exists ? "后台更新文章" : "后台新建文章"}：${meta.title}`,
        sha,
      );
      setNotice(exists ? "文章已更新，约 2 分钟后上线" : "文章已发布，约 2 分钟后上线");
      await loadPosts();
      setView({ kind: "list" });
    } catch (err) {
      handleErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function removePost(entry: Entry) {
    if (!window.confirm(`确定删除《${entry.meta.title}》？该文件将从仓库移除。`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteFile(
        `content/posts/${entry.meta.slug}.md`,
        entry.sha,
        `后台删除文章：${entry.meta.title}`,
      );
      setNotice("文章已删除，约 2 分钟后生效");
      await loadPosts();
    } catch (err) {
      handleErr(err);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="py-24 text-center text-sm text-zinc-400">加载中…</p>;
  }
  if (!authed) {
    return <LoginCard onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {notice && (
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
          {error}
        </div>
      )}

      {view.kind === "list" && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">后台管理</h1>
            <div className="flex gap-2">
              <button
                type="button"
                className={ghostBtn}
                onClick={() => setView({ kind: "settings" })}
                disabled={busy}
              >
                站点信息
              </button>
              <button
                type="button"
                className={primaryBtn}
                onClick={() => setView({ kind: "edit", entry: { meta: newPost(), sha: "" }, isNew: true })}
                disabled={busy}
              >
                新建文章
              </button>
            </div>
          </div>

          {entries === null && <p className="py-16 text-center text-sm text-zinc-400">加载中…</p>}

          {entries !== null && entries.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              还没有文章，点右上角「新建文章」开始写作。
            </p>
          )}

          {entries !== null && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.meta.slug}
                  className="card-glow flex items-center gap-4 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-medium">{entry.meta.title}</h2>
                      {entry.meta.draft && (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                          草稿
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {entry.meta.date.slice(0, 10)} · {entry.meta.category} · /{entry.meta.slug}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => setView({ kind: "edit", entry, isNew: false })}
                    disabled={busy}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-500 transition-colors hover:bg-red-500/10"
                    onClick={() => removePost(entry)}
                    disabled={busy}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view.kind === "edit" && (
        <>
          <button
            type="button"
            className="mb-5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={() => setView({ kind: "list" })}
          >
            ← 返回列表
          </button>
          <div className={cardClass}>
            <PostEditor
              initial={view.entry.meta}
              isNew={view.isNew}
              saving={busy}
              onSave={(meta) => savePost(meta, view.isNew ? undefined : view.entry.sha)}
              onCancel={() => setView({ kind: "list" })}
            />
          </div>
        </>
      )}

      {view.kind === "settings" && (
        <>
          <button
            type="button"
            className="mb-5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={() => setView({ kind: "list" })}
          >
            ← 返回列表
          </button>
          <div className={cardClass}>
            <h2 className="mb-5 text-lg font-semibold">站点信息</h2>
            <SettingsEditor
              onDone={(message) => {
                setNotice(message);
                setView({ kind: "list" });
              }}
            />
          </div>
        </>
      )}

      <p className="mt-10 text-center text-xs text-zinc-400">
        保存的改动会自动提交到 GitHub 并部署上线 ·{" "}
        <Link href="/" className="hover:text-zinc-600 dark:hover:text-zinc-200">
          查看网站
        </Link>
      </p>
    </div>
  );
}

function LoginCard({ onLogin }: { onLogin: () => void }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    setErr(null);
    setToken(value);
    try {
      await listDir("content/posts");
      onLogin();
    } catch {
      clearToken();
      setErr("令牌无效或没有仓库权限，请检查后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gradient-border mx-auto max-w-sm rounded-xl p-8 text-center shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
      <h1 className="gradient-text text-xl font-bold">博客后台</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        请输入 GitHub 令牌登录（只需一次，之后自动保持登录）
      </p>
      <input
        type="password"
        className={`${inputClass} mt-6 text-center`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="粘贴你的 GitHub 令牌"
        autoFocus
      />
      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
      <button type="button" className={`${primaryBtn} mt-4 w-full`} onClick={submit} disabled={busy}>
        {busy ? "验证中…" : "登录"}
      </button>
      <p className="mt-4 text-xs text-zinc-400">
        还没有令牌？到 GitHub → Settings → Developer settings → Personal access tokens
        生成一个，勾选本仓库的 Contents 读写权限即可。
      </p>
    </div>
  );
}
