# capacitor-material-you

把 Android 12+ 的 **Material You（Monet）系统动态色** 读进 Capacitor WebView 里的任何前端应用。纯 Web API 拿不到系统动态色，本插件用一小段原生桥接（Java，无需 Kotlin 配置）把完整 MD3 色彩角色一次性交给 JS 侧。

## 特性

- **精确匹配系统配色**：通过 `com.google.android.material.color.DynamicColors` 解析全部 31 个 MD3 色彩角色（`primary` / `onPrimary` / `surfaceContainerHigh` / `inversePrimary` / ...），浅色与深色两套一次返回，与系统设置界面同源，自动尊重用户在「壁纸与样式」里选择的调色风格。
- **旧设备自动降级**：Android 8.1–11 返回壁纸种子色（`WallpaperColors.primaryColor`，免权限），JS 侧可用 `@material/material-color-utilities` 生成完整色板。
- **深色模式状态**：同时回传系统 `uiMode` 深浅色，网页可统一跟随系统。
- **浏览器安全降级**：在普通浏览器中 `getSystemColors()` 返回 `available: false`，业务代码无需分支。
- **零 Kotlin**：原生侧为单个 Java 文件，`npx cap sync` 即装即用。

## 安装

```bash
npm install capacitor-material-you
npx cap sync
```

要求：

- Capacitor 5+
- Android 工程 `com.google.android.material:material >= 1.8.0`（`surfaceContainer*` 角色需要；Capacitor 6+ 模板默认满足，Gradle 自动取更高版本）
- 完整 Monet 色板需要 Android 12+（API 31）真机；8.1–11 只走壁纸种子降级

## 使用

```ts
import { MaterialYou } from 'capacitor-material-you';

const res = await MaterialYou.getSystemColors();

if (res.source === 'monet') {
  // res.light / res.dark: { primary: '#9A5400', onPrimary: '#FFFFFF', ... }
  // 与系统 UI 完全一致的 Material You 色板（浅色 + 深色）
} else if (res.source === 'wallpaper' && res.seedHex) {
  // 旧设备：用 @material/material-color-utilities 从 res.seedHex 生成色板
}

// 深色模式跟随系统
applyDarkMode(res.isDark);
```

**壁纸变化刷新**：系统色只在用户改壁纸后变化，且应用必然先退到后台。在 JS 侧监听回前台事件后重新调用 `getSystemColors()` 即可拿到新色板：

```ts
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) MaterialYou.getSystemColors().then(apply);
});
```

### 类型定义

```ts
export interface MaterialYouColorsPayload {
  available: boolean;            // monet 或 wallpaper 任一可用
  monetAvailable: boolean;       // Android 12+ Monet 是否可用
  source: 'monet' | 'wallpaper' | 'none';
  isDark: boolean;               // 系统深色模式
  sdkInt: number;                // 设备 SDK 版本
  light: Record<string, string> | null;   // 31 个角色，浅色
  dark: Record<string, string> | null;    // 31 个角色，深色
  seedHex: string | null;        // 壁纸种子色（8.1+；monet 可用时也回传作兜底）
}
```

角色 key 与 MD3 官方命名一一对应（camelCase）：`primary, onPrimary, primaryContainer, onPrimaryContainer, secondary, onSecondary, secondaryContainer, onSecondaryContainer, tertiary, onTertiary, tertiaryContainer, onTertiaryContainer, surface, surfaceDim, surfaceBright, surfaceContainerLowest, surfaceContainerLow, surfaceContainer, surfaceContainerHigh, surfaceContainerHighest, onSurface, onSurfaceVariant, inverseSurface, inverseOnSurface, inversePrimary, outline, outlineVariant, error, onError, errorContainer, onErrorContainer`。

## 原理

```
WebView (JS)                     Native (Java, ~40 行有效代码)
getSystemColors() ─────────────► MaterialYouPlugin
                                   DynamicColors.wrapContextIfAvailable(
                                     ContextThemeWrapper(base, Theme_Material3_Light/Dark))
                                   → TypedValue 解析 31 个 color* attr
                                   → WallpaperColors.primaryColor（种子兜底）
              ◄─────────────────  { light, dark, isDark, seedHex, source }
```

- 动态色覆盖层要求宿主 theme 是 Material Components 主题，插件内部自建 `ContextThemeWrapper(Theme_Material3_Light/Dark_NoActionBar)`，**不改宿主 Activity 主题**，对 Capacitor 壳零侵入。
- 读取壁纸「颜色」（非壁纸图片）不需要任何权限。

## 可选：状态栏联动

拿到动态色后把状态栏也染成同色（放你的 MainActivity 或配合其他插件）：

```kotlin
// 在 onResume 里读取插件最近一次解析的 surface/primary
window.statusBarColor = android.graphics.Color.parseColor(surfaceHex)
WindowCompat.getInsetsController(window, window.decorView)
  .isAppearanceLightStatusBars = !isDark
```

## 已知社区方案对比

- `@rdlabo/capacitor-native-ui`：面向 Ionic 的原生控件投影插件，含 Dynamic Color 能力，依赖 Capacitor 8 + Ionic 8/9，适合 Ionic 工程。
- React Native 生态的 `react-native-dynamic-theme` 等仅适用于 RN。
- 本插件不绑定任何 UI 框架：拿到的就是 31 个原始角色 hex，自己决定映射进 CSS 变量、Tailwind theme 或任意 MD3 token 系统。

## License

MIT
