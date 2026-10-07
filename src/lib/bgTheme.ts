// 背景主题应用：写入 localStorage 并挂到 <html data-bg>。
// DOM/localStorage 写入放组件外，方便 React 编译器静态检查。

// 与 globals.css 中 html[data-bg="…"] 规则一一对应
export type ThemeId =
  | "aurora"
  | "sakura"
  | "ocean"
  | "forest"
  | "dusk"
  | "grid"
  | "dots"
  | "stars"
  | "mist"
  | "stripes"
  | "spotlight"
  | "pure"
  | "custom";

export function applyBgTheme(id: ThemeId) {
  try {
    localStorage.setItem("bg", id);
  } catch {
    /* 忽略隐私模式异常 */
  }
  const root = document.documentElement;
  if (id === "aurora") {
    delete root.dataset.bg; // aurora 是 CSS 默认值，无需属性
  } else {
    root.dataset.bg = id;
  }
}
