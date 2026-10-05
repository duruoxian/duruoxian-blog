"use client";

// 博客后台主界面：登录 → 文章列表 → 编辑器 / 站点信息。
// 视觉完全复用前端样式（顶栏/底栏/极光由根布局提供），数据操作走 GitHub API。

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PostEditor } from "./PostEditor";
import { SettingsEditor } from "./SettingsEditor";
import { ghostBtn, inputClass, panelClass, primaryBtn } from "./ui";
import { site } from "@/lib/site";
import {
  clearToken,
  deleteFile,
  getToken,
  GithubError,
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

// 文章列表的本地缓存：打开后台先用缓存秒开，再后台同步 GitHub 最新数据
const CACHE_KEY = "admin:cache:posts";

function readPostsCache(): Entry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writePostsCache(entries: Entry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // 本地存储异常不影响主流程
  }
}

export function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [editorDirty, setEditorDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const entriesRef = useRef<Entry[] | null>(null);

  // 统一入口：更新列表的同时写本地缓存，下次打开直接秒开
  const applyEntries = useCallback((next: Entry[]) => {
    entriesRef.current = next;
    setEntries(next);
    writePostsCache(next);
  }, []);

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
      // 按 sha 对比：内容没变的文件直接沿用本地解析结果，只拉有变化的——
      // 仓库没更新时整次同步只有 1 个请求（列目录），打开速度不再受逐篇拉取拖累
      const prev = new Map<string, Entry>(
        (entriesRef.current ?? []).map((e) => [`${e.meta.slug}.md`, e]),
      );
      const loaded = await Promise.all(
        mdFiles.map(async (f) => {
          const unchanged = prev.get(f.name);
          if (unchanged && unchanged.sha === f.sha) return unchanged;
          const { content, sha } = await getFile(f.path);
          return { meta: parsePost(content, f.name.replace(/\.mdx?$/, "")), sha };
        }),
      );
      loaded.sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));
      applyEntries(loaded);
    } catch (err) {
      handleErr(err);
    }
  }, [applyEntries, handleErr]);

  // 首次挂载：继承旧后台令牌 → 恢复登录态 → 用缓存秒开 → 后台按 sha 同步。
  // 先 await 让出同步栈，避免在 effect 内同步 setState（react-hooks/set-state-in-effect）。
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      migrateLegacyToken();
      const token = getToken();
      setAuthed(Boolean(token));
      setReady(true);
      if (!token) return;
      // 上次打开时存过列表就用它立即渲染（0 网络），后台再同步 GitHub
      const cached = readPostsCache();
      if (cached && cached.length > 0) {
        applyEntries(cached);
        setSyncing(true);
      }
      await loadPosts();
      setSyncing(false);
    })();
  }, [applyEntries, loadPosts]);

  async function savePost(meta: PostMeta, sha?: string) {
    setBusy(true);
    setError(null);
    try {
      const exists = Boolean(sha);
      const newSha = await putFile(
        `content/posts/${meta.slug}.md`,
        serializePost(meta),
        `${exists ? "后台更新文章" : "后台新建文章"}：${meta.title}`,
        sha,
      );
      setNotice(exists ? "文章已更新，约 2 分钟后上线" : "文章已发布，约 2 分钟后上线");
      setEditorDirty(false);
      // 保存接口直接返回新 sha，就地更新列表，不再整单重新拉取
      const others = (entriesRef.current ?? []).filter((e) => e.meta.slug !== meta.slug);
      applyEntries(
        [...others, { meta, sha: newSha }].sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1)),
      );
      setView({ kind: "list" });
    } catch (err) {
      if (err instanceof GithubError && err.status === 409) {
        setError("这篇文章在 GitHub 上刚有更新，请返回列表刷新后再保存。");
      } else {
        handleErr(err);
      }
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
      applyEntries((entriesRef.current ?? []).filter((e) => e.meta.slug !== entry.meta.slug));
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
        <div className="view-in">
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

          {entries === null && (
            <div aria-busy="true" className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 dark:border-zinc-800"
                >
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {entries !== null && entries.length === 0 && (
            <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              还没有文章，点右上角「新建文章」开始写作。
            </p>
          )}

          {entries !== null && entries.length > 0 && (
            <>
              <p className="mb-3 text-xs text-zinc-400">
                共 {entries.length} 篇
                {entries.some((e) => e.meta.draft) &&
                  ` · 草稿 ${entries.filter((e) => e.meta.draft).length} 篇`}
                {syncing && " · 正在同步最新…"}
              </p>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.meta.slug}
                    className="card-glow flex items-center gap-4 rounded-xl border border-zinc-200 bg-[var(--card)] p-4 backdrop-blur-xl dark:border-zinc-800"
                  >
                    {entry.meta.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.meta.cover}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    )}
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
            </>
          )}
        </div>
      )}

      {view.kind === "edit" && (
        <div className="view-in">
          <button
            type="button"
            className="mb-5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={() => {
              if (editorDirty && !window.confirm("有未保存的修改，确定放弃？")) return;
              setEditorDirty(false);
              setView({ kind: "list" });
            }}
          >
            ← 返回列表
          </button>
          <div className={panelClass}>
            <PostEditor
              initial={view.entry.meta}
              isNew={view.isNew}
              saving={busy}
              onSave={(meta) => savePost(meta, view.isNew ? undefined : view.entry.sha)}
              onCancel={() => setView({ kind: "list" })}
              onDirtyChange={setEditorDirty}
            />
          </div>
        </div>
      )}

      {view.kind === "settings" && (
        <div className="view-in">
          <button
            type="button"
            className="mb-5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
            onClick={() => setView({ kind: "list" })}
          >
            ← 返回列表
          </button>
          <div className={panelClass}>
            <h2 className="mb-5 text-lg font-semibold">站点信息</h2>
            <SettingsEditor
              onDone={(message) => {
                setNotice(message);
                setView({ kind: "list" });
              }}
            />
          </div>
        </div>
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={site.author.avatar}
        alt=""
        className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-indigo-500/30"
      />
      <h1 className="gradient-text mt-4 text-xl font-bold">{site.author.name} 的后台</h1>
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
