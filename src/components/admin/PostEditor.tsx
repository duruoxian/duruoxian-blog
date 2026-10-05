"use client";

// 文章编辑器：字段与 front-matter 一一对应，正文支持 Markdown 源码和预览切换。
// 保存动作由父组件执行，这里只收集和展示。

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { putBinaryFile } from "@/lib/admin/github";
import type { PostMeta } from "@/lib/admin/content";
import { ghostBtn, inputClass, labelClass, primaryBtn } from "./ui";

const CATEGORIES = ["技术", "生活", "项目", "工具"];

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
    isNew && !/^[a-z0-9][a-z0-9-]*$/.test(meta.slug) ? "文件名只能用小写字母、数字和短横线" : null;

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

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>文件名（网址，创建后不可改）</label>
          <input
            className={`${inputClass} font-mono`}
            value={meta.slug}
            disabled={!isNew}
            onChange={(e) => patch({ slug: e.target.value })}
            placeholder="my-new-post"
          />
          {slugError && <p className="mt-1 text-xs text-red-500">{slugError}</p>}
        </div>
        <div>
          <label className={labelClass}>日期</label>
          <input
            type="date"
            className={inputClass}
            value={meta.date.slice(0, 10)}
            onChange={(e) => patch({ date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>标题</label>
        <input
          className={inputClass}
          value={meta.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </div>

      <div>
        <label className={labelClass}>摘要（显示在列表和搜索里）</label>
        <textarea
          className={`${inputClass} resize-y`}
          rows={2}
          value={meta.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={labelClass}>分类</label>
          <select
            className={inputClass}
            value={meta.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>标签（用逗号分隔）</label>
          <input
            className={inputClass}
            value={meta.tags.join(", ")}
            onChange={(e) =>
              patch({ tags: e.target.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean) })
            }
            placeholder="Python, 工具"
          />
        </div>
        <div>
          <label className={labelClass}>系列（可选）</label>
          <input
            className={inputClass}
            value={meta.series ?? ""}
            onChange={(e) => patch({ series: e.target.value || undefined })}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>封面图</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={meta.cover ?? ""}
            placeholder="/images/posts/xxx.jpg"
            onChange={(e) => patch({ cover: e.target.value || undefined })}
          />
          <label className={`${ghostBtn} shrink-0 cursor-pointer`}>
            {uploading ? "上传中…" : "上传"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")}
            />
          </label>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            正文（Markdown）
          </label>
          <div className="flex items-center gap-2">
            <label className={`${ghostBtn} cursor-pointer text-xs`}>
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
              className={`${ghostBtn} text-xs`}
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? "编辑" : "预览"}
            </button>
          </div>
        </div>
        {preview ? (
          <div
            className="article-content prose prose-zinc max-w-none min-h-80 rounded-lg border border-[var(--border)] p-4 dark:prose-invert"
            // 内容是用户自己写的 Markdown，只在自己浏览器里预览
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <textarea
            ref={bodyRef}
            className={`${inputClass} resize-y font-mono leading-relaxed`}
            rows={16}
            value={meta.body}
            onChange={(e) => patch({ body: e.target.value })}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={meta.draft}
            onChange={(e) => patch({ draft: e.target.checked })}
            className="h-4 w-4 accent-indigo-600"
          />
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
