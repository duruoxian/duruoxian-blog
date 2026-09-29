// 在「构建时」抓取 GitHub 贡献数据，把结果烘焙进静态页面。
// 好处：访客浏览器不再跨域请求第三方 API，国内访问不会卡；
// 代价：数据在每次重新构建（push 自动部署）时刷新。

export type ContributionDay = { date: string; count: number; level: number };

export type Contributions = {
  totalLastYear: number;
  days: ContributionDay[];
};

type ApiResponse = {
  total?: Record<string, number>;
  contributions?: ContributionDay[];
};

export async function getContributions(username: string): Promise<Contributions | null> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse;
    if (!json.contributions || json.contributions.length === 0) return null;

    // 让图表从某个月的 1 号开始：否则第一列可能只包含上月末尾的几天，
    // 导致相邻两个月份标签只隔一列、挤在一起（例如 9月/10月）。
    let days = json.contributions;
    if (!days[0].date.endsWith("-01")) {
      const firstOfMonth = days.findIndex((d) => d.date.endsWith("-01"));
      if (firstOfMonth > 0) days = days.slice(firstOfMonth);
    }

    // 总数按实际显示的天数重新累加，保证与格子一致
    const totalLastYear = days.reduce((sum, d) => sum + d.count, 0);
    return { totalLastYear, days };
  } catch {
    // 构建环境网络不稳时不要让整个构建失败
    return null;
  }
}
