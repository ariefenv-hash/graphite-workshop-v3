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

重新构建后，把 `dist/` 内容推送到 `gh-pages` 分支根目录即可（Pages 数据源 = gh-pages / root）。仓库未配置自动构建工作流，避免 `vite 8 / TS 7` 在 CI 上的隐式漂移。

## 随附文档

- `改动说明.md` — 三轮修正与玩法迭代说明（含实跑验证）
- `玩法问题清单与改进方案.md` — 玩法原型与待调优项

> 上传时两份 ZIP 因平台限制改后缀为 `.txt`，已还原解压后原样入库；源码与构建产物均未经改写。
