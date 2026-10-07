"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  applyCustomBg,
  fileToScaledBlob,
  idbDel,
  idbSet,
  loadStoredCustomBg,
} from "@/lib/customBg";
import { applyBgTheme, type ThemeId } from "@/lib/bgTheme";

// 背景主题选择器：顶栏调色盘按钮 + 弹出色板。
// 选择写入 localStorage.bg 并挂到 <html data-bg>，CSS 变量随之切换
// （背景光斑/纹理 + 全站强调色一起变）。默认 aurora。
// swatch：色板圆点的预览背景（缺省用主题三色渐变）。
// 「自定义」不在 THEMES 里：它是用户本地图片（IndexedDB），单独渲染。
type ThemeDef = { id: ThemeId; label: string; colors: [string, string, string]; swatch?: string };

const THEMES: ThemeDef[] = [
  { id: "aurora", label: "极光", colors: ["#6366f1", "#06b6d4", "#a855f7"] },
  { id: "sakura", label: "樱粉", colors: ["#ec4899", "#f472b6", "#a855f7"] },
  { id: "ocean", label: "深海", colors: ["#0ea5e9", "#22d3ee", "#2563eb"] },
  { id: "forest", label: "森野", colors: ["#10b981", "#84cc16", "#14b8a6"] },
  { id: "dusk", label: "暮橙", colors: ["#f97316", "#f43f5e", "#eab308"] },
  {
    id: "grid",
    label: "方格",
    colors: ["#4f46e5", "#0ea5e9", "#4338ca"],
    swatch:
      "repeating-linear-gradient(0deg,#a1a1aa 0 1px,transparent 1px 5px),repeating-linear-gradient(90deg,#a1a1aa 0 1px,transparent 1px 5px) #fafafa",
  },
  {
    id: "dots",
    label: "波点",
    colors: ["#ec4899", "#38bdf8", "#a78bfa"],
    swatch: "radial-gradient(#a1a1aa 1px,transparent 1.2px) 0 0/5px 5px #fafafa",
  },
  {
    id: "stars",
    label: "星夜",
    colors: ["#8b5cf6", "#c084fc", "#6366f1"],
    swatch:
      "radial-gradient(#fff 0.8px,transparent 1px) 0 0/7px 7px,radial-gradient(#fff9 0.8px,transparent 1px) 3px 3px/9px 9px,linear-gradient(135deg,#4c1d95,#1e1b4b)",
  },
  {
    id: "mist",
    label: "晨雾",
    colors: ["#57534e", "#a8a29e", "#44403c"],
    swatch: "linear-gradient(135deg,#e7e5e4,#d6d3d1 55%,#a8a29e)",
  },
  {
    id: "stripes",
    label: "斜纹",
    colors: ["#dc2626", "#f87171", "#b91c1c"],
    swatch: "repeating-linear-gradient(45deg,#f87171 0 1.5px,transparent 1.5px 5px) #fef2f2",
  },
  {
    id: "spotlight",
    label: "暖阳",
    colors: ["#f59e0b", "#fb923c", "#f97316"],
    swatch: "radial-gradient(circle at 50% 18%,#fde68a,#f97316 70%,#9a3412)",
  },
  { id: "pure", label: "素净", colors: ["#fafafa", "#a1a1aa", "#52525b"], swatch: "linear-gradient(135deg,#fff 40%,#a1a1aa)" },
] satisfies ThemeDef[];

function swatchBg(t: ThemeDef): string {
  return t.swatch ?? `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]} 55%, ${t.colors[2]})`;
}

export function BgPicker() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // 用户自定义背景图（objectURL 预览，Blob 原图在 IndexedDB）
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const customBlobRef = useRef<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  // 图片处理失败提示（如 HEIC 等浏览器解不开的格式）
  const [error, setError] = useState<string | null>(null);

  function setPreviewFromBlob(blob: Blob) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(blob);
    customBlobRef.current = blob;
    setCustomPreview(previewUrlRef.current);
  }
  // 当前主题只在弹层（客户端交互后才渲染）里显示，无 SSR 水合风险
  const [current, setCurrent] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "aurora";
    try {
      const saved = localStorage.getItem("bg") as ThemeId | null;
      if (!saved) return "aurora";
      return saved === "custom" || THEMES.some((t) => t.id === saved) ? saved : "aurora";
    } catch {
      return "aurora";
    }
  });

  // 挂载后恢复自定义背景：刷新页面后若 bg=custom，把图重新挂到 CSS 变量。
  // 存储为空或图是坏的（如旧版存入的 HEIC）：自动清理并回退默认主题，
  // 避免停留在「选了 custom 却没有图」的静默失效状态。
  useEffect(() => {
    let cancelled = false;
    loadStoredCustomBg()
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          if (localStorage.getItem("bg") === "custom") {
            applyBgTheme("aurora");
            setCurrent("aurora");
          }
          return;
        }
        setPreviewFromBlob(blob);
        if (localStorage.getItem("bg") === "custom") applyCustomBg(blob);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: ThemeId) {
    setCurrent(id);
    applyBgTheme(id);
    setOpen(false);
  }

  function openFile() {
    fileRef.current?.click();
  }

  // 点击「自定义」格子：已有图片直接应用，否则打开选图
  function useCustom() {
    const blob = customBlobRef.current;
    if (!blob) {
      openFile();
      return;
    }
    applyCustomBg(blob);
    applyBgTheme("custom");
    setCurrent("custom");
    setOpen(false);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一张
    if (!file) return;
    try {
      const blob = await fileToScaledBlob(file);
      await idbSet("customBg", blob);
      applyCustomBg(blob);
      applyBgTheme("custom");
      setCurrent("custom");
      setPreviewFromBlob(blob);
      setError(null);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "FORMAT_UNSUPPORTED"
          ? "这种图片格式（常见于 iPhone 原图 HEIC）浏览器打不开，请截图或转成 JPG/PNG 再选"
          : "图片处理失败，请换一张 JPG/PNG 试试"
      );
    }
  }

  async function removeCustom() {
    await idbDel("customBg").catch(() => {});
    applyCustomBg(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    customBlobRef.current = null;
    setCustomPreview(null);
    if (current === "custom") {
      applyBgTheme("aurora");
      setCurrent("aurora");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="切换主题背景"
        aria-expanded={open}
        title="切换主题背景"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {/* 调色盘 */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="13.5" cy="6.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="10.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="7.5" r=".9" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12.5" r=".9" fill="currentColor" stroke="none" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-zinc-200 bg-[var(--page)] p-2 shadow-xl shadow-zinc-900/10 backdrop-blur-xl dark:border-zinc-700 dark:shadow-zinc-950/40"
          style={{ animation: "view-in 0.15s ease both" }}
        >
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-zinc-400">主题背景</p>
          <div className="grid grid-cols-3 gap-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                title={t.label}
                aria-label={`主题背景：${t.label}`}
                aria-pressed={current === t.id}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  current === t.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <span
                  className={`h-6 w-6 rounded-full shadow-sm ring-offset-1 transition-shadow ${
                    current === t.id ? "ring-2 ring-zinc-400 dark:ring-zinc-500" : ""
                  }`}
                  style={{ background: swatchBg(t) }}
                />
                <span className="text-[10px] leading-none text-zinc-500 dark:text-zinc-400">
                  {t.label}
                </span>
              </button>
            ))}

            {/* 自定义图片背景（本地 IndexedDB，不上传） */}
            <button
              key="custom"
              type="button"
              onClick={useCustom}
              title={customPreview ? "使用自定义图片背景" : "上传图片作为背景"}
              aria-label="自定义背景图片"
              aria-pressed={current === "custom"}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                current === "custom" ? "bg-zinc-100 dark:bg-zinc-800" : ""
              }`}
            >
              <span
                className={`relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full shadow-sm ring-offset-1 transition-shadow ${
                  current === "custom"
                    ? "ring-2 ring-zinc-400 dark:ring-zinc-500"
                    : "border border-dashed border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {customPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={customPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    aria-hidden
                    className="text-zinc-400"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </span>
              <span className="text-[10px] leading-none text-zinc-500 dark:text-zinc-400">
                自定义
              </span>
            </button>
          </div>

          {error && (
            <p className="mt-1 px-2 text-[11px] leading-relaxed text-rose-500">{error}</p>
          )}

          {customPreview && (
            <div className="mt-1 flex items-center justify-between border-t border-zinc-100 px-2 pt-1.5 dark:border-zinc-800">
              <button
                type="button"
                onClick={openFile}
                className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                更换图片
              </button>
              <button
                type="button"
                onClick={removeCustom}
                className="text-[11px] text-zinc-400 transition-colors hover:text-rose-500"
              >
                移除图片
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
