// 浏览器端 GitHub Contents API 客户端。
// 后台所有读写都用用户自己的 GitHub 令牌在浏览器里直接完成（和 Sveltia 同一套机制）：
// 列文件 → 读文件 → PUT 提交 / DELETE 删除，每次提交都会触发仓库的自动部署。

const REPO_API = "https://api.github.com/repos/duruoxian/duruoxian-blog";
const BRANCH = "main";
const TOKEN_KEY = "admin:token";
// 旧 Sveltia 后台的存储键：里面明文存着登录令牌，首次进入新后台时继承过来，用户无感
const LEGACY_KEY = "sveltia-cms.user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function migrateLegacyToken(): void {
  if (getToken()) return;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null") as
      | { token?: unknown }
      | null;
    if (typeof legacy?.token === "string" && legacy.token.length > 20) {
      localStorage.setItem(TOKEN_KEY, legacy.token);
    }
  } catch {
    // 迁移失败就走手动登录
  }
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${getToken()}`, Accept: "application/vnd.github+json" };
}

export class GithubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${REPO_API}${path}`, {
    cache: "no-store",
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GithubError(res.status, `GitHub API ${res.status}：${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

function decodeBase64Utf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export type DirEntry = { name: string; path: string; sha: string; type: string };

export function listDir(path: string): Promise<DirEntry[]> {
  return api<DirEntry[]>(`/contents/${path}?ref=${BRANCH}`);
}

export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const json = await api<{ content?: string; sha: string }>(`/contents/${path}?ref=${BRANCH}`);
  return { content: decodeBase64Utf8(json.content ?? ""), sha: json.sha };
}

export async function putFile(
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  await api(`/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: encodeBase64Utf8(content),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}

/** 二进制文件（图片）上传：分块转二进制字符串再 base64，避免栈溢出 */
export async function putBinaryFile(
  path: string,
  bytes: Uint8Array,
  message: string,
  sha?: string,
): Promise<void> {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  await api(`/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: btoa(binary),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function deleteFile(path: string, sha: string, message: string): Promise<void> {
  await api(`/contents/${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
}

export function isAuthError(err: unknown): boolean {
  return err instanceof GithubError && (err.status === 401 || err.status === 403);
}
