// 自定义背景图片：用户在调色盘选本地图片作为页面背景。
// 图片压缩后以 Blob 存入 IndexedDB（纯本地，不上传服务器），
// 应用时用 objectURL 写到 <html> 的 --bg-custom CSS 变量，
// 由 globals.css 的 html[data-bg="custom"] 规则铺到页面底色上（带柔光遮罩）。
// 注意：HEIC 等浏览器解不开的格式会在压缩阶段直接抛错，绝不存入坏图。

const DB_NAME = "duruoxian-blog";
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 读取任意已存值（新版为 Blob，旧版可能是 dataURL 字符串） */
export async function idbGet(key: string): Promise<Blob | string | undefined> {
  const db = await openDb();
  try {
    return await new Promise<Blob | string | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as Blob | string | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function idbSet(key: string, value: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** 验证一张图浏览器真的能解码（HEIC 等会失败） */
async function assertDecodable(blob: Blob): Promise<void> {
  const bitmap = await createImageBitmap(blob);
  bitmap.close();
}

/**
 * 压缩用户图片到最长边 maxEdge 内，返回 Blob。
 * 浏览器解不开的格式（如 iPhone HEIC）直接抛 FORMAT_UNSUPPORTED，
 * 绝不把坏图写进存储——否则背景会一直静默失效。
 */
export async function fileToScaledBlob(file: File, maxEdge = 1920): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("FORMAT_UNSUPPORTED");
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("ENCODE_FAILED");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.86)
  );
  if (!blob || blob.size === 0) throw new Error("ENCODE_FAILED");
  await assertDecodable(blob); // 产物必须能再解码才算成功
  return blob;
}

/** 读取存储里的背景图并规范成 Blob；旧 dataURL 或坏图会被清理并返回 null */
export async function loadStoredCustomBg(): Promise<Blob | null> {
  let saved: Blob | string | undefined;
  try {
    saved = await idbGet("customBg");
  } catch {
    return null;
  }
  if (!saved) return null;
  try {
    let blob: Blob;
    if (typeof saved === "string") {
      if (!saved) return null;
      blob = await (await fetch(saved)).blob(); // 旧版 dataURL 转 Blob
    } else {
      blob = saved;
    }
    await assertDecodable(blob);
    return blob;
  } catch {
    await idbDel("customBg").catch(() => {}); // 坏图清掉，避免每次加载都静默失败
    return null;
  }
}

let currentUrl: string | null = null;

/** 把图片挂到/清出页面背景变量（objectURL 比超大 dataURL 更省内存） */
export function applyCustomBg(blob: Blob | null) {
  const root = document.documentElement;
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  if (blob) {
    currentUrl = URL.createObjectURL(blob);
    root.style.setProperty("--bg-custom", `url("${currentUrl}")`);
  } else {
    root.style.removeProperty("--bg-custom");
  }
}
