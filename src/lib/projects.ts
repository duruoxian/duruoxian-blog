import data from "@/data/projects.json";

export type ProjectLink = { label: string; href: string };

export type Project = {
  name: string;
  tagline: string;
  status?: string;
  year?: string;
  tags: string[];
  links: ProjectLink[];
  /** 关联文章的 slug 列表,标题由 posts.ts 解析,JSON 里不重复存 */
  posts: string[];
  featured?: boolean;
};

export const projects = data as Project[];

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}

/** 反查:这篇文章属于哪个项目(用于文章页的相关项目胶囊) */
export function getProjectByPost(slug: string): Project | null {
  return projects.find((p) => p.posts.includes(slug)) ?? null;
}
