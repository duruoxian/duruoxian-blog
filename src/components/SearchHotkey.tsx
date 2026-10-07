"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 全局搜索快捷键：Ctrl+K（Mac 为 ⌘K）直接跳到搜索页。
// 搜索页输入框已自动聚焦，跳过去即可直接输入。
export function SearchHotkey() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
