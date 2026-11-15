# 石墨工坊 · Graphite & Cedar（v3）

Material Design 3 Expressive 铅笔文具制造与全球贸易模拟游戏。AOSP 原生涟漪（RippleShader）、StretchEdgeEffect、Expressive 弹簧物理与 M3 组件直接移植。

- **线上站点**：https://ariefenv-hash.github.io/graphite-workshop-v3/
- **源码**：本分支 `main`（Vite 8 + React 19 + TypeScript + Tailwind 4）
- **部署产物**：`gh-pages` 分支，内容即 `dist/`（已用 `base: './'` 构建，资源为相对路径，适配项目子路径）

## 本地运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 产出 dist/
npm run lint     # tsc --noEmit
```

## 重新部署

重新构建后，把 `dist/` 内容推送到 `gh-pages` 分支根目录即可（Pages 数据源 = gh-pages / root）。仓库未配置**网页专用**构建/部署工作流，避免 `vite 8 / TS 7` 在 CI 上的隐式漂移；Android APK 工作流会在构建成功后把同一份 `dist/` 同步到 `gh-pages`，保证网页与 APK 永远同版。

## 随附文档

- `改动说明.md` — 三轮修正与玩法迭代说明（含实跑验证）
- `玩法问题清单与改进方案.md` — 玩法原型与待调优项

> 上传时两份 ZIP 因平台限制改后缀为 `.txt`，已还原解压后原样入库；源码与构建产物均未经改写。

## Android APK（混合开发 · 自用）

用 Capacitor 把同一份 `dist/` 打进 Android WebView，**源码与网页产物均未改写**。`vite.config.ts` 已是 `base: './'`，相对资源在 WebView 本地加载不会白屏；项目纯前端 + `localStorage` 存档，装完可完全离线运行。

**下载安装**

- 固定直链：https://github.com/ariefenv-hash/graphite-workshop-v3/releases/download/apk-latest/graphite-workshop-v3-debug.apk
- 或到 Actions → `Build Android APK` → 最新 run 的 `graphite-workshop-v3-debug.apk` 产物

debug 签名，下载后允许「未知来源」直接安装。Release 资产页提供 sha256，可自行校验。

> **注意**：CI 每次在全新 runner 上生成新的 debug keystore，重跑工作流后签名会变，**不能直接覆盖安装**，需先卸载旧版。若要长期覆盖升级，另配固定 keystore 做 release 签名。

**工作流做什么**

`.github/workflows/build-apk.yml` 在 `main` 相关源码变更或手动 `workflow_dispatch` 时运行：

1. Node 22 + JDK 21 + Android SDK 35，工具链版本全部钉死
2. `npm install`（仓库刻意不提交 `package-lock.json`，沿用既有约定）+ Capacitor `7.4.2`
3. `npm run build` → `npx cap add android` → `npx cap sync android`
4. `./gradlew assembleDebug` → 上传 APK + 去中间产物的 `android-project.tar.gz`
5. 发布/覆盖 `apk-latest` Release
6. 把同一份 `dist/`（含 `.nojekyll`）同步到 `gh-pages`，Pages 自动重新部署

`android/` 工程**不入库**，由固定版本 CLI 现场生成，保证可复现；需要二次原生开发时下载 `android-project.tar.gz` 用 Android Studio 打开即可。

**已知边界（首版未定制，不影响运行）**

- 返回键沿用 Capacitor 默认行为，单页应用可能直接退出；如需栈内回退，可在工程里加 `@capacitor/app` 的 `backButton` 监听
- 启动图标 / 启动屏为 Capacitor 默认资源，未生成专属图标
- 字体已全部本地化（思源宋体 + 显示/等宽字重），零外部请求；设置页可上传自定义字体
- 应用 ID `com.ariefenv.graphite` 一经发布不可更改，自用阶段可先在 `capacitor.config.json` 调整

## v3.1 · APK 白屏修复与个性化设置

**白屏根因与修复**：`index.html` 原本用阻塞式 `<link rel="stylesheet">` 加载 Google Fonts。实测外链在 WebView 中若 TLS 握手挂起（而非快速失败，开代理也可能出现），会一直阻塞后面的 `type="module"` 脚本，React 永远不挂载 → 纯白屏。对照实验：外链快速失败/9 秒后失败均正常渲染（非白像素 63%），**永久挂起则 rootLen=0、白屏**。

三处同时加固：

1. **字体全部本地化** —— `public/fonts/` 内 9 个唯一 woff2 + `fonts.css`（不同字重共用同一子集文件），零外部请求。中文默认 **思源宋体 Noto Serif SC**（源码全字符 ∪ GB2312 一级字，按批子集化并自造 `unicode-range`，浏览器按需只加载命中批次）；标题拉丁字形 Bricolage Grotesque、等宽 JetBrains Mono。
2. **产物语法降级** —— `vite.config.ts` 加 `build.target: 'es2020'`。默认产物含 `??=` 等 ES2021 语法（acorn 按 ecmaVersion 2020 解析失败），老 Android System WebView 会直接 SyntaxError 白屏。
3. **白屏兜底** —— `index.html` 内联脚本捕获 `error` / `unhandledrejection`，并在 4 秒后检测 `#root` 是否为空；异常时把错误信息、UA、href 画到页面上，便于截图定位，不再是纯白。

**设置页**（顶栏齿轮图标）：壁纸上传 / 模糊半径 / 背景压暗 / 从壁纸自动提取主色并应用到强调色 / 手动改色 / 上传自定义字体 / 界面字号 / 交互音量（主增益节点）/ 震动 / 深色模式 / 跟随系统深浅色 / 减弱动效 / 抑制强闪光 / 漆色主题 / 清空个性化数据。配置走 localStorage，壁纸与字体走 IndexedDB，与游戏存档隔离。

> **系统动态主题色**：纯网页没有 Web 标准接口，按约定跳过；APK 内由随仓库的 `capacitor-material-you` 原生插件读取 Android 12+ Monet 角色（8.1+ 回退壁纸种子色），详见 `MaterialYou集成指南.md`。深浅色跟随系统由 ThemeContext 单一真源管理。

> 图标沿用 lucide 的 JSX `<svg>`，React 自动绑定 `http://www.w3.org/2000/svg` 命名空间，避免老 WebView 动态创建 SVG 不显示。

## 涟漪采样档位（细腻 vs 省电）

旧实现把噪声 uv 按 `in_noiseScale`（≈2.1 CSS px）做 `mod` 量化，再用 `step()` 硬阈值点亮 —— 采样点数少、省 GPU，但每个亮胞就是一个硬方块，**颗粒感很强**，失去粒子飘散的细腻感。

现在默认走**细腻档**：连续高频双尺度粒子场（≈2.5px / ≈1.0px 格），逐格哈希定位 + `fwidth` 抗锯齿软圆 + 随时间漂移与呼吸；SystemUI 航道金粉去掉 `floor(v_fragCoord/dpr)` 量化，走同款粒子场。DPR 上限从 2.5 提到 3。Canvas2D 降级路径（无 WebGL2 的 WebView）也补了确定性细粒子，不再只是一个实心圆。

**设置 → 显示与交互 → 细腻粒子飘散** 可切回省电档（旧块状采样）。`u_fineQuality` 在两份 shader 里做 `mix`，双档共用同一套程序，切换零重编译。


## 第十轮：MD3 视觉统一 + StretchEdge 全应用 + Material You 接进设置

- **设置页全面改用移植组件**：`Md3Dialog` / `Md3Switch` / `Md3Slider` / `Md3Button` /
  `Md3SegmentedButton`，移除原生 `<input type="range">` 与自绘 46×26 开关。
- **StretchEdge 不再只服务木料仓**：`Md3StretchContainer` 新增 `mode='scroll'`（对话框 /
  设置页内容滚动）与 `mode='window'`（页面级前级滑动），三种模式共用 AOSP
  `EdgeEffect` 欠阻尼弹簧，仅视觉强度不同；静止时不写 transform，避免影响绝对定位。
- **Material You 进设置**：本版集成的 `capacitor-material-you` 插件在设置页可直接
  「应用手机主题 / 壁纸截图取色 / 重新探测」，深浅色跟随系统由 ThemeContext 单一真源管理。
  上传壁纸若开启自动取色，会走与系统同款的 QuantizerCelebi 管线生成完整浅/深色板。
- **涟漪细腻档**：默认连续亚像素粒子场（逐格哈希 + fwidth 抗锯齿 + 漂移呼吸），
  取代旧 `mod(uv, in_noiseScale)` + `step()` 的块状量化采样；设置页可切回省电档。
- 白屏修复保留：字体全本地、构建目标 es2020、内联错误兜底页。

## 十一、涟漪去颗粒感：删除块状量化档，改为密度可调

在第十轮基础上继续。用户反馈「采样优化后颗粒感非常强，没有原先粒子飘散的细腻感」，
根因是 Framework / SystemUI 两条 shader 仍保留 `mod(uv, in_noiseScale)` + `step()`
的量化方块路径作为「省电档」，任何落到该档的情况都会变成硬边颗粒。

- 删除 `coarseSparkles` / `coarseSystemUISparkles` 与 `u_fineQuality` 布尔档；
  `sparkleField` 唯一路径改为**三尺度连续亚像素粒子场**（逐格哈希定位、fwidth 软边、
  相位漂移 + 呼吸），密度参与 GLSL 门控。
- Canvas2D 降级恒走粒子场，粒子半径缩小、数量随密度缩放、不再有「只有一个实心圆」。
- `setRippleFineQuality` 保留为兼容别名，但 false 只把密度降到 0.55，**绝不回退方块**。
- 设置页「细腻粒子飘散」开关改为「金粉飘散密度 35%–200%」滑块；旧存档
  `rippleFine` 自动映射，深浅色仍由 ThemeContext 单一真源管理。
- `Md3Slider` 补上 AOSP Framework 涟漪与越界 `EdgeEffect` 拉伸（手柄拖过 min/max
  时同一套阻尼弹簧回弹），与第十轮的 `mode='window'` 页面级拉伸、`mode='scroll'`
  对话框拉伸形成三层覆盖。
- 插件包补 `"type": "module"`；APK 工作流新增插件注册校验，保留原有 `tsc --noEmit`。
- 中文字体保持思源宋体（第十轮基底误回退到 Noto Sans SC，已纠正）。

## 十二、CI 收口：插件落地与网页同版

连续失败的根因逐层定位并修复（每步都由工作流把日志尾部回显，不再盲猜）：

1. 工作流里多行 Python heredoc 顶格 → YAML 解析失败，run 连 job 都不生成；改成单行 `python -c`。
2. `vite build` 报 `Rolldown failed to resolve import "capacitor-material-you"` → 插件包自己的
   `dist/` 6 个编译产物被 `.gitignore` 的 `dist/` 误伤、从未入库；已补推并把规则收窄为 `/dist/`。
3. 同一模块名在 Vite 侧加 alias 指向 `local_modules/.../dist/index.js`，不依赖 npm 安装形态。
4. `local_modules/.../dist/index.js` 缺失导致 `UNLOADABLE_DEPENDENCY`，随 ② 一并解决。
5. `Gradle assembleDebug` 报 3 个 `cannot find symbol`：Material Components 1.12.0 没有
   `colorInverseSurface` / `colorInverseOnSurface` / `colorInversePrimary` 三个 `R.attr`；
   从原生桥移除，Web 侧 `monetScheme.ts` 用种子色色板自动补齐这三项。
6. 顺手修正 `public/fonts/fonts.css` 里多写一层 `./fonts/` 的 url 路径（CSS 与 woff2 同目录）。

最终 run `43691968830` 19 步全绿：APK 8,460,834 B（sha256 `2487d6cf…`）、
`gh-pages` 同步 18 文件（`deploy: sync v3 UI (1e1b86f)`）。本地无头 Chromium 载入已部署站点，
`#root` 渲染出完整 DOM（80,364 字符，含「制造车间」），白屏兜底未触发。
