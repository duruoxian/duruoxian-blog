// 自定义背景图片：用户在调色盘选本地图片作为页面背景。
// 图片经过压边压缩后以 dataURL 存入 IndexedDB（纯本地，不上传服务器），
// 应用时写到 <html> 的 --bg-custom CSS 变量，由 globals.css 的
// html[data-bg="custom"] 规则铺到页面底色上（带柔光遮罩保证可读性）。

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

export async function idbGet(key: string): Promise<string | undefined> {
  const db = await openDb();
  try {
    return await new Promise<string | undefined>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function idbSet(key: string, value: string): Promise<void> {
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

/** 把用户图片压到最长边 maxEdge 内，转 dataURL（PNG 保留透明，其余转 JPEG 减体积） */
export async function fileToScaledDataUrl(file: File, maxEdge = 1920): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 不可用");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    return canvas.toDataURL(type, 0.86);
  } catch {
    // 位图解码失败（如 SVG），原样读为 dataURL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

/** 把图片写入/清除页面背景变量 */
export function applyCustomBg(dataUrl: string | null) {
  const root = document.documentElement;
  if (dataUrl) {
    root.style.setProperty("--bg-custom", `url("${dataUrl}")`);
  } else {
    root.style.removeProperty("--bg-custom");
  }
}
