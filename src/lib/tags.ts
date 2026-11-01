// 标签的语义分组:29 个标签按内容域归组,标签页/标签详情页共用。
// 新增标签时:放进合适的组;没归组的会自动落到标签页末尾的「其他」。
export const TAG_GROUPS: { name: string; tags: string[] }[] = [
  {
    name: "嵌入式实验",
    tags: ["嵌入式", "U-Boot", "Linux内核", "设备树", "根文件系统", "eMMC", "网卡驱动", "命令行"],
  },
  {
    name: "AI 与逆向",
    tags: ["AI", "Python", "opencode", "FastAPI", "逆向"],
  },
  {
    name: "Linux 与折腾",
    tags: ["Linux", "Windows", "终端", "fzf", "Manjaro", "开源"],
  },
  {
    name: "Web 全栈",
    tags: ["前端", "Vue", "Spring Boot", "全栈", "CSS"],
  },
  {
    name: "记录与学习",
    tags: ["博客", "随笔", "考研", "408", "课程设计"],
  },
];

/** 查一个标签所属的组与同组标签(用于详情页的横向切换);未归组返回 null */
export function getTagGroup(tag: string): { name: string; siblings: string[] } | null {
  for (const g of TAG_GROUPS) {
    if (g.tags.includes(tag)) return { name: g.name, siblings: g.tags };
  }
  return null;
}
