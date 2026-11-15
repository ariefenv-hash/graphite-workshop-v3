# 石墨工坊 · Material You 手机主题集成指南

> 目标：混合开发（Capacitor 壳 + WebView 加载本项目）时，前端**不做任何 Kotlin 移植**，直接读到手机壁纸的 Material You（Monet）动态色并自动应用为第 4 套主题「手机主题 · Material You」。

---

## 1. 结论与原理

**纯网页在 WebView 里没有任何 Web API 能读到系统动态色**——`prefers-color-scheme` 只能给深浅色，Monet 色板拿不到。所以任何方案都必然包含一小块原生代码，这正是"插件"的含义：原生代码只存在于**插件包**里（一个约 230 行的 Java 文件，`npx cap sync` 即装），你的前端工程本体零改动、零 Kotlin。

```
WebView (React + TS)                    Android (插件 capacitor-material-you)
─────────────────────                   ──────────────────────────────────────
monetStore.probe() ──────────────────►  MaterialYouPlugin.getSystemColors()
                                          DynamicColors.wrapContextIfAvailable(
                                            ContextThemeWrapper(base,
                                              Theme_Material3_Light/Dark_NoActionBar))
                                          → 逐个 TypedValue 解析 31 个 color* attr
                                          → WallpaperColors.primaryColor（种子兜底）
buildMonetScheme(roles/seed) ◄────────  { light, dark, isDark, seedHex, source }
（缺角色用种子色补齐，着色器通道推导）
ThemeContext.scheme → 全 UI 生效
```

原生侧自建 `ContextThemeWrapper` 并套动态色覆盖层，**不改宿主 Activity 主题**，对 Capacitor 壳零侵入；读取壁纸"颜色"（非壁纸图片）**不需要任何权限**。

## 2. 三级降级链路

| 环境 | 来源 | 效果 | 用户动作 |
| --- | --- | --- | --- |
| Capacitor + Android 12+ | `source='monet'`：原生解析的完整 31 角色色板 | **与系统 UI 完全同源**（尊重「壁纸与样式」里选的调色风格） | 无，全自动 |
| Capacitor + Android 8.1–11 | `source='wallpaper'`：壁纸种子色 → `@material/material-color-utilities` 生成色板 | 与系统 Monet 同算法家族，接近但不逐像素相同 | 无，全自动 |
| 纯浏览器 / 老设备 | `source='screenshot'`：canvas 截图取色（QuantizerCelebi + Score，与系统同一取色管线） | 从壁纸截图提取种子色生成色板 | 顶栏循环到「手机主题」时自动弹出截图选择器 |

深浅色模式独立于色板来源：默认跟随系统（原生 `uiMode` 上报 / 浏览器 `prefers-color-scheme`），顶栏开关为手动覆盖，覆盖值持久化在 `localStorage.graphite_dark_override_v1`。

## 3. 本次改动清单

**新增（项目内）**

```
local_modules/capacitor-material-you/          # 可复用 npm 插件包（含构建好的 dist/）
  ├─ android/src/main/java/com/materialyou/capacitor/MaterialYouPlugin.java
  ├─ android/build.gradle                      # 仅依赖 capacitor-android + material 1.12.0
  ├─ src/definitions.ts / index.ts / web.ts    # TS 客户端 + 浏览器 stub
  ├─ dist/                                     # tsc 构建产物
  └─ README.md / LICENSE / package.json

src/aosp/systemTheme/
  ├─ materialYouTypes.ts        # 桥接载荷类型（与插件包结构一致，独立声明）
  ├─ colorMath.ts               # hex → 0..1 浮点 RGB 工具
  ├─ monetScheme.ts             # 核心：角色/种子 → Md3ColorScheme（含着色器通道推导）
  ├─ capacitorClient.ts         # 惰性加载原生桥；纯浏览器返回 null
  ├─ screenshotSeed.ts          # canvas 截图取色（QuantizerCelebi + Score）
  ├─ monetStore.ts              # 全局外部 store（probe/refresh/截图种子）
  └─ useMonetTheme.ts           # useSyncExternalStore 订阅 + 挂载时探测
```

**修改（项目内）**

| 文件 | 改动 |
| --- | --- |
| `src/aosp/md3Tokens.ts` | `ThemeId` 增加 `'monet'`；`MD3_SCHEMES` 增加 monet 占位色板（graphite 基线，探测完成前防首帧残缺） |
| `src/aosp/ThemeContext.tsx` | scheme 选择支持 monet 运行时色板；`darkMode = 手动覆盖 ?? monet.isDark`；新增 `darkFollowsSystem / resetDarkModeOverride / applyScreenshotSeed` 上下文 |
| `src/App.tsx` | 主题循环加入第 4 主题；壳环境就绪后自动覆盖（见 §5）；浏览器环境循环到 monet 时打开截图选择器；新增隐藏 `<input type="file">` |
| `package.json` | 新增 `@material/material-color-utilities ^0.4.0`、`capacitor-material-you file:local_modules/...` |
| `改动说明.md` | 追加第九轮说明 |

**未动**：AOSP 涟漪/EdgeEffect/弹簧动效层、全部 Md3* 组件、游戏 store 与存档格式（旧档含 `themeId:'monet'` 可正常 hydrate）。

## 4. Capacitor 壳工程接入步骤

```bash
# 1) 前端工程（本项目）
npm install
npm run build            # 产出 dist/

# 2) Capacitor 壳工程
npm install capacitor-material-you      # 或私有源：npm install <你的仓库地址>
npx cap add android                     # 已有壳则跳过
npx cap sync android
npx cap open android
```

原生工程要求：

- `com.google.android.material:material >= 1.8.0`（`surfaceContainer*` 角色需要；Capacitor 6+ 模板默认满足，插件声明 1.12.0，Gradle 自动取更高版本）
- 完整 Monet 需 Android 12+ 真机；8.1–11 走壁纸种子降级；8.0 及以下两级降级都不可用，自动落到截图取色或占位色板
- 无需任何权限声明，无需改 MainActivity，无需 Kotlin 配置

## 5. 自动覆盖策略（一处可调）

`src/App.tsx` 中：

```ts
// 手机主题自动覆盖：原生桥 / 壁纸种子就绪且用户未手动选过主题时，自动切到 monet。
useEffect(() => {
  if (monet.status === 'ready' && (monet.source === 'monet' || monet.source === 'wallpaper')
      && !manualThemeRef.current && themeId !== 'monet') { ... }
}, [...]);
```

- 当前实现：**每次冷启动**探测就绪后自动切到「手机主题」；用户手动循环到其它主题后，**本会话内不再覆盖**（保留三套内置主题的可玩性）。
- 想要"强覆盖、不给选择机会"：删掉 `!manualThemeRef.current` 条件即可。
- 壁纸变更：系统色只在改壁纸后变化且应用必然退到后台；`monetStore` 已监听 `visibilitychange` / `focus`，回前台自动重探，新色板即时生效（有 200ms 级的 scheme 平滑过渡）。

## 6. 真机验证清单

1. `npx cap sync android && npx cap run android`（Android 12+ 真机）
2. 启动即见 snackbar「已自动应用手机主题：跟随手机壁纸 · Material You」，顶栏漆色显示为动态色名
3. 系统设置 → 壁纸与样式 → 换一个调色风格 → 回到应用：色板自动更新
4. 系统深浅色切换：默认跟随；点顶栏月亮/太阳后变为手动覆盖，重启应用仍保持覆盖
5. 顶栏主题循环：cedar → graphite → prussian → 手机主题 → cedar
6. （可选）`adb logcat | grep MaterialYou`：桥接方法调用无异常

## 7. 可选：状态栏联动

让系统状态栏也跟随动态色（放壳工程 MainActivity，或用 `@capacitor/status-bar`）：

```kotlin
override fun onResume() {
    super.onResume()
    val ctx = MaterialColors.getColor-context...
    // 读取插件最近一次 surface/isDark 后：
    window.statusBarColor = android.graphics.Color.parseColor(surfaceHex)
    WindowCompat.getInsetsController(window, window.decorView)
        .isAppearanceLightStatusBars = !isDark
}
```

（网页内的 `meta[name="theme-color"]` 已由 ThemeContext 同步为 `scheme.surface`，PWA 场景无需额外处理。）

## 8. 复用 npm 包到其他项目

`capacitor-material-you` 与本项目的 React/MD3 体系**完全解耦**，任何 Capacitor 工程可直接用：

```ts
import { MaterialYou } from 'capacitor-material-you';

const res = await MaterialYou.getSystemColors();
if (res.source === 'monet') {
  cssVars(res.light);  // { primary: '#...', onPrimary: '#...', ... } 31 个角色
  cssVars(res.dark);
}
applyDark(res.isDark);
```

发布到你的仓库：

```bash
cd capacitor-material-you
npm run build          # tsc 产出 dist/
npm pack               # capacitor-material-you-0.1.0.tgz（已随包提供）
# 私有仓库：改 package.json 的 name 加 scope，npm publish
```

- 包内 `capacitor` 字段指向 `android/`，`npx cap sync` 自动注册
- 角色命名与 MD3 官方一致，可映射进 CSS 变量、Tailwind theme、Material Web Components 等
- 浏览器环境 `getSystemColors()` 返回 `{ available:false, isDark: <prefers-color-scheme> }`，调用方无需分支

## 9. 与社区现成方案对比

| 方案 | 适用性 |
| --- | --- |
| `@rdlabo/capacitor-native-ui` | Ionic 生态的原生控件投影插件，含 Dynamic Color 能力，要求 Capacitor 8 + Ionic 8/9；对自绘 MD3 React 项目过重 |
| `react-native-dynamic-theme` 等 | 仅 React Native，不适用于 WebView 混合开发 |
| **本插件 `capacitor-material-you`** | 无框架绑定：直接返回 31 个原始角色 hex，映射逻辑自己掌控；浅/深两套一次返回；8.1+ 壁纸种子兜底 |

## 10. 故障排查

| 现象 | 原因与处理 |
| --- | --- |
| `source` 一直是 `none`（真机） | 设备 < Android 12 且 ROM 屏蔽了 `WallpaperColors`；走截图取色路径 |
| 部分角色缺失（如 `surfaceContainerHigh`） | 宿主 material < 1.8.0：升级依赖；JS 侧已用种子色自动补齐，不致崩溃 |
| 构建报 `DynamicColors` 符号找不到 | 插件未 sync：`npx cap sync android`；或宿主未包含 material 依赖（见 §4） |
| 浏览器里主题没有变化 | 预期行为：纯浏览器无原生桥，循环到「手机主题」会弹截图选择器 |
| 深色模式"不听话" | 用户覆盖优先于系统：`resetDarkModeOverride()` 或清 `localStorage.graphite_dark_override_v1` |
| OEM ROM 色板异常（个别国产 ROM） | 厂商覆写主题导致 `wrapContextIfAvailable` 返回原始 context：表现为占位色板，属 ROM 限制，可反馈 issue |

## 11. API 速查（本项目侧）

```ts
// ThemeContext 新增
const { monet, darkFollowsSystem, resetDarkModeOverride, applyScreenshotSeed } = useMd3Theme();
monet.status;        // 'idle' | 'checking' | 'ready'
monet.source;        // 'monet' | 'wallpaper' | 'screenshot' | 'none'
monet.isDark;        // 系统深浅色（深色跟随的默认值）
monet.lightScheme;   // Md3ColorScheme | null（运行时生成）
monet.darkScheme;    // Md3ColorScheme | null
monet.seedHex;       // 种子色（含截图取色结果）

// 独立使用（不经过 ThemeContext）
import { monetStore } from 'src/aosp/systemTheme/monetStore';
await monetStore.probe();                       // 幂等
await monetStore.refresh();                     // 回前台自动触发
await monetStore.applyScreenshotSeed(file);     // 内置降级
monetStore.getSnapshot();                       // 同步读取
```
