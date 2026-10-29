/* ============================================================
   主题桥脚本 · 让 /quiz、/shuku 等静态页与博客共享主题
   与 src/app/layout.tsx 的 themeScript、src/lib/customBg.ts 取图逻辑保持一致：
   - localStorage["bg"]   主题 id（aurora = 默认，不设属性）
   - localStorage["theme"] light/dark/system（system 跟随 matchMedia）
   - IndexedDB(duruoxian-blog / kv / "customBg") 自定义背景图 → --bg-custom
   另外把各页自己的明暗变量翻转到与主题一致（页内 @media 只认系统偏好）。
   ============================================================ */
(function () {
  var root = document.documentElement;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  /* 各静态页家族的明暗调色板（与各页 <style> 里的 :root / @media 定义保持同步） */
  var PALETTES = {
    quiz: {
      light: { "--bg": "#f6f7f9", "--card": "#fff", "--ink": "#1f2328", "--sub": "#59636e", "--line": "#d8dee4", "--brand": "#0b57d0", "--ok": "#1a7f37", "--bad": "#c62828", "--okbg": "#e6f4ea", "--badbg": "#fdecea", "--hl": "#eaf1fb" },
      dark: { "--bg": "#101418", "--card": "#1a2129", "--ink": "#e6e8ea", "--sub": "#9aa4ae", "--line": "#2c3540", "--brand": "#6ea8ff", "--ok": "#4caf50", "--bad": "#ef5350", "--okbg": "#12291a", "--badbg": "#2d1517", "--hl": "#1c2a3a" },
    },
    shuku: {
      light: { "--bg": "#f7f8fa", "--card": "#fff", "--ink": "#232830", "--sub": "#6b7683", "--brand": "#0b3c7a", "--line": "#dde3ea" },
      dark: { "--bg": "#0f1318", "--card": "#191f27", "--ink": "#dfe3e8", "--sub": "#96a0ab", "--brand": "#7fb0ee", "--line": "#2a333d" },
    },
  };
  function family() {
    return document.querySelector(".tabs") ? "quiz" : "shuku";
  }

  function apply() {
    var theme = null, bg = null;
    try { theme = localStorage.getItem("theme"); } catch (_) {}
    try { bg = localStorage.getItem("bg"); } catch (_) {}
    var dark = theme ? theme === "dark" : mq.matches;
    root.classList.toggle("dark", dark);
    if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
    if (bg && bg !== "aurora") root.dataset.bg = bg; else delete root.dataset.bg;
    var set = PALETTES[family()][dark ? "dark" : "light"];
    for (var k in set) root.style.setProperty(k, set[k]);
  }

  /* 自定义背景图：与博客共用同一份 IndexedDB 本地图片 */
  function loadCustomBg() {
    try {
      var open = indexedDB.open("duruoxian-blog", 1);
      open.onsuccess = function () {
        var db = open.result;
        try {
          var req = db.transaction("kv", "readonly").objectStore("kv").get("customBg");
          req.onsuccess = function () {
            var v = req.result;
            if (!v) return;
            var url = v instanceof Blob ? URL.createObjectURL(v) : String(v);
            root.style.setProperty("--bg-custom", 'url("' + url + '")');
          };
        } catch (_) {}
        db.close();
      };
    } catch (_) {}
  }

  /* 返回博客悬浮胶囊 */
  function addPill() {
    if (document.querySelector(".site-home-pill")) return;
    var a = document.createElement("a");
    a.className = "site-home-pill";
    a.href = "/";
    a.title = "返回博客";
    a.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>博客';
    document.body.appendChild(a);
  }

  function init() {
    apply();
    addPill();
    loadCustomBg();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
  window.addEventListener("pageshow", apply); /* bfcache 回退时重对齐 */
})();
