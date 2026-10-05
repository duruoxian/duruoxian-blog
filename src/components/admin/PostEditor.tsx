"use client";

// 文章编辑器：文档式大标题 + 元信息行 + 带工具栏的 Markdown 编辑区。
// 保存动作由父组件执行，这里只收集和展示。

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { putBinaryFile } from "@/lib/admin/github";
import { parsePost, splitFrontMatter, type PostMeta } from "@/lib/admin/content";
import { ghostBtn, inputClass, labelClass, primaryBtn } from "./ui";

const CATEGORIES = ["技术", "生活", "项目", "工具"];
const MD_EXT = /\.(md|markdown|txt)$/i;

export function PostEditor({
  initial,
  isNew,
  saving,
  onSave,
  onCancel,
  onDirtyChange,
}: {
  initial: PostMeta;
  isNew: boolean;
  saving: boolean;
  onSave: (meta: PostMeta) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [meta, setMeta] = useState<PostMeta>(initial);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const slugError =
    isNew && !/^[a-z0-9][a-z0-9-]*$/.test(meta.slug) ? "只能用小写字母、数字和短横线" : null;

  const html = useMemo(() => (preview ? String(marked.parse(meta.body)) : ""), [preview, meta.body]);

  function patch(part: Partial<PostMeta>) {
    setMeta((m) => ({ ...m, ...part }));
    setDirty(true);
  }

  function handleCancel() {
    if (dirty && !window.confirm("有未保存的修改，确定放弃？")) return;
    onCancel();
  }

  // 有未保存内容时，关闭/刷新页面前提醒
  useEffect(() => {
    if (!dirty) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Ctrl/Cmd+S 直接保存（写文章的肌肉记忆）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && !slugError) onSave(meta);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [meta, saving, slugError, onSave]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  async function upload(file: File, target: "cover" | "body") {
    setUploading(true);
    setUploadError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const name = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "-")}`;
      const path = `public/images/posts/${name}`;
      await putBinaryFile(path, bytes, `后台上传图片：${name}`);
      const url = `/images/posts/${name}`;
      if (target === "cover") {
        patch({ cover: url });
      } else {
        const el = bodyRef.current;
        const at = el?.selectionStart ?? meta.body.length;
        const snippet = `![${file.name.replace(/\.[^.]+$/, "")}](${url})`;
        patch({ body: meta.body.slice(0, at) + snippet + meta.body.slice(at) });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  // 从本地 .md 导入：带 front-matter 的连元信息一起填，没有的取首个一级标题当标题
  function importMd(file: File) {
    void file.text().then((text) => {
      if (meta.body && !window.confirm("导入会覆盖当前正文，确定？")) return;
      const base = file.name.replace(MD_EXT, "");
      const fm = splitFrontMatter(text);

      if (fm) {
        const imported = parsePost(text, base);
        if (isNew) {
          patch({
            title: imported.title,
            date: imported.date || meta.date,
            description: imported.description,
            category: CATEGORIES.includes(imported.category) ? imported.category : meta.category,
            tags: imported.tags,
            series: imported.series,
            body: imported.body,
          });
        } else {
          patch({ body: imported.body });
        }
      } else {
        // 无 front-matter：第一个一级标题当文章标题，其余作为正文
        let body = text.trim();
        let title = meta.title;
        const h1 = /^#\s+(.+)\s*$/.exec(body.split("\n", 1)[0] ?? "");
        if (isNew && !title && h1) {
          title = h1[1].trim();
          body = body.slice(h1[0].length).trim();
        }
        patch(isNew ? { body, title } : { body });
      }

      // 用文件名生成网址建议（仅当还没填）
      if (isNew && !meta.slug) {
        const slug = base
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (slug) patch({ slug });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 文档式大标题 */}
      <input
        className="w-full border-0 bg-transparent px-0 text-2xl font-bold leading-snug outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
        value={meta.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="文章标题…"
      />

      {/* 元信息行：日期 · 分类 · 网址 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
        <input
          type="date"
          className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm outline-none transition-colors focus:border-indigo-500/60"
          value={meta.date.slice(0, 10)}
          onChange={(e) => patch({ date: e.target.value })}
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="分类">
          {(CATEGORIES.includes(meta.category) || !meta.category
            ? CATEGORIES
            : [...CATEGORIES, meta.category]
          ).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => patch({ category: c })}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                meta.category === c
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  : "border border-[var(--border)] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {isNew ? (
          <input
            className={`w-44 rounded-md border bg-transparent px-2 py-1 font-mono text-xs outline-none transition-colors placeholder:text-zinc-400 focus:border-indigo-500/60 ${
              slugError ? "border-red-500/60" : "border-[var(--border)]"
            }`}
            value={meta.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            placeholder="文件名-slug"
            aria-label="文件名（网址）"
          />
        ) : (
          <span className="font-mono text-xs">/{meta.slug}</span>
        )}
      </div>
      {slugError && <p className="text-xs text-red-500">{slugError}</p>}

      <hr className="border-[var(--border)]" />

      <label className="block">
        <span className={labelClass}>摘要（显示在列表和搜索结果里）</span>
        <textarea
          className={`${inputClass} resize-y`}
          rows={2}
          value={meta.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="一句话介绍这篇文章"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>标签（用逗号分隔，可随便加新的）</span>
          <input
            className={inputClass}
            value={meta.tags.join(", ")}
            onChange={(e) =>
              patch({ tags: e.target.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean) })
            }
            placeholder="Python, 工具"
          />
        </label>
        <label className="block">
          <span className={labelClass}>系列（可选）</span>
          <input
            className={inputClass}
            value={meta.series ?? ""}
            onChange={(e) => patch({ series: e.target.value || undefined })}
          />
        </label>
      </div>

      {/* 封面：缩略预览 + 地址 + 上传 */}
      <div>
        <span className={labelClass}>封面图</span>
        <div className="flex items-start gap-3">
          {meta.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.cover}
              alt="封面预览"
              className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-[var(--border)]"
            />
          )}
          <div className="flex flex-1 gap-2">
            <input
              className={`${inputClass} font-mono text-xs`}
              value={meta.cover ?? ""}
              placeholder="/images/posts/xxx.jpg"
              onChange={(e) => patch({ cover: e.target.value || undefined })}
            />
            <label className={`${ghostBtn} shrink-0 cursor-pointer text-xs`}>
              {uploading ? "上传中…" : "上传图片"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 正文：带工具栏的编辑器容器 */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-zinc-50/70 px-3 py-2 dark:bg-zinc-800/40">
          <span className="text-xs font-medium text-zinc-400">正文 · Markdown</span>
          <div className="flex items-center gap-1">
            <label className="cursor-pointer rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-700/60">
              导入 .md
              <input
                type="file"
                accept=".md,.markdown,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importMd(e.target.files[0])}
              />
            </label>
            <label className="cursor-pointer rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-700/60">
              {uploading ? "上传中…" : "插入图片"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "body")}
              />
            </label>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-700/60"
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? "返回编辑" : "预览"}
            </button>
          </div>
        </div>
        {preview ? (
          <div
            className="article-content prose prose-zinc max-w-none min-h-80 p-5 dark:prose-invert"
            // 内容是用户自己写的 Markdown，只在自己浏览器里预览
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <textarea
            ref={bodyRef}
            className="block min-h-80 w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
            value={meta.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="用 Markdown 写正文…"
          />
        )}
      </div>

      {/* 底部：草稿开关 + 操作 */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={meta.draft}
              onChange={(e) => patch({ draft: e.target.checked })}
            />
            <span className="block h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-indigo-600 dark:bg-zinc-700" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
          草稿（不显示在网站上）
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" className={ghostBtn} onClick={handleCancel} disabled={saving}>
            取消
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={saving || Boolean(slugError) || uploading}
            onClick={() => onSave(meta)}
            title="快捷键 Ctrl+S"
          >
            {saving ? "保存中…" : meta.draft ? "保存草稿" : "保存并发布"}
          </button>
        </div>
      </div>

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
    </div>
  );
}
