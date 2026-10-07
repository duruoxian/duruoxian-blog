// 后台上传图片的前端预处理：压到最长边 1920 并转 WebP，
// 上传体积平均省 60% 以上，站点也统一了图片格式。
// 解不开/转换失败时回退原图，保证「能传上去」永远优先。

const MAX_EDGE = 1920;

/** 返回要上传的 Blob 与文件扩展名（含点） */
export async function fileToUploadBlob(
  file: File
): Promise<{ blob: Blob; ext: string }> {
  const originalExt = file.name.match(/\.[^.]+$/)?.[0] ?? "";
  // GIF 动图转静态会丢动画，SVG 是矢量文本，都保持原样
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { blob: file, ext: originalExt };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 不可用");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    if (!blob || blob.size === 0) throw new Error("编码失败");
    // 双重确认产物可解码（个别浏览器 toBlob(webp) 会静默降级成别的格式）
    const check = await createImageBitmap(blob);
    check.close();
    const ext = blob.type === "image/webp" ? ".webp" : ".png";
    return { blob, ext };
  } catch {
    // 解码/转换失败：回退原图，不阻塞上传
    return { blob: file, ext: originalExt };
  }
}
