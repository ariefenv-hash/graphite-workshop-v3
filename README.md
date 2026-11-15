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

重新构建后，把 `dist/` 内容推送到 `gh-pages` 分支根目录即可（Pages 数据源 = gh-pages / root）。仓库未配置**网页**自动构建/部署工作流，避免 `vite 8 / TS 7` 在 CI 上的隐式漂移；另有一条完全独立的 Android APK 工作流，见下节，不触碰 `gh-pages` 与站点。

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

`android/` 工程**不入库**，由固定版本 CLI 现场生成，保证可复现；需要二次原生开发时下载 `android-project.tar.gz` 用 Android Studio 打开即可。

**已知边界（首版未定制，不影响运行）**

- 返回键沿用 Capacitor 默认行为，单页应用可能直接退出；如需栈内回退，可在工程里加 `@capacitor/app` 的 `backButton` 监听
- 启动图标 / 启动屏为 Capacitor 默认资源，未生成专属图标
- Google Fonts 外链在联网时正常，离线时回退 `system-ui`（与网页版一致）
- 应用 ID `com.ariefenv.graphite` 一经发布不可更改，自用阶段可先在 `capacitor.config.json` 调整
