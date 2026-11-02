"use client";

import { useEffect, useState } from "react";

// 建站日：2026-10-02 上线（来自项目沿革），写死在这里即可
const LAUNCH = new Date("2026-10-02T00:00:00+08:00");

// 页脚的「建站第 N 天」。静态导出下天数会随构建时间冻结，
// 所以放客户端渲染，每分钟就近刷新。
export function SiteDays() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const update = () =>
      setDays(Math.max(1, Math.floor((Date.now() - LAUNCH.getTime()) / 86400000) + 1));
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (days === null) return null; // 水合前不占位，避免闪烁
  return <span className="tabular-nums"> · 建站第 {days} 天</span>;
}
