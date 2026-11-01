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
