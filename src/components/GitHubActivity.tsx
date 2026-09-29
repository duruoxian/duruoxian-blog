"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

type Day = { date: string; count: number; level: number };
type ApiResponse = {
  total?: Record<string, number>;
  contributions?: Day[];
};

// 0~4 级的配色（浅色 / 深色），仿 GitHub 绿色系
const LEVEL_CLASS = [
  "bg-[#ebedf0] dark:bg-[#161b22]",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
];

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 把按天排列的数据切成「周」的列，第一列用 null 补齐到周日开头
function buildWeeks(days: Day[]): (Day | null)[][] {
  if (days.length === 0) return [];
  const weeks: (Day | null)[][] = [];
  let week: (Day | null)[] = [];
  const firstDow = parseDate(days[0].date).getDay();
  for (let i = 0; i < firstDow; i++) week.push(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

// 每月第一次出现时，在该列上方标注月份
function buildMonthLabels(weeks: (Day | null)[][]): string[] {
  let last = -1;
  return weeks.map((week) => {
    const first = week.find((d): d is Day => d !== null);
    if (!first) return "";
    const month = parseDate(first.date).getMonth();
    if (month === last) return "";
    last = month;
    return MONTHS[month];
  });
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function GitHubActivity() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`https://github-contributions-api.jogruber.de/v4/${site.author.githubUser}?y=last`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiResponse>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const weeks = buildWeeks(data?.contributions ?? []);
  const labels = buildMonthLabels(weeks);
  const total = data?.total?.lastYear ?? 0;

  return (
    <section className="rounded-xl border border-zinc-200 bg-[var(--card)] p-5 dark:border-zinc-800">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <GitHubIcon />
        GitHub 活跃度
      </h2>

      {status === "loading" && (
        <div className="mt-4 h-[110px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      )}

      {status === "error" && (
        <p className="mt-4 text-sm text-zinc-500">
          暂时无法加载 GitHub 活跃度，可直接
          <a
            href={site.author.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            前往 GitHub 查看
          </a>
          。
        </p>
      )}

      {status === "ok" && (
        <>
          <div className="mt-4 overflow-x-auto pb-1">
            <div className="inline-flex flex-col gap-1">
              <div className="flex gap-[3px]">
                {labels.map((label, i) => (
                  <div
                    key={i}
                    className="w-[10px] shrink-0 whitespace-nowrap text-[10px] leading-none text-zinc-400"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        title={day ? `${day.date}：${day.count} 次贡献` : undefined}
                        className={`h-[10px] w-[10px] rounded-[2px] ${
                          day ? LEVEL_CLASS[Math.min(4, Math.max(0, day.level))] : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span>过去一年共 {total} 次贡献</span>
            <span className="flex items-center gap-1.5">
              <span>少</span>
              {LEVEL_CLASS.map((cls, i) => (
                <span key={i} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
              ))}
              <span>多</span>
            </span>
          </div>

          <a
            href={site.author.github}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            在 GitHub 上查看 ↗
          </a>
        </>
      )}
    </section>
  );
}
