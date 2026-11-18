# AGENTS.md — Antigravity 工作区入口（索引，不含独立规则）

> 本文件由 Antigravity IDE 自动加载。
> **它不是规范源**：唯一铁律源为 `.trae/rules/project_rules.md`（Antigravity 不会自动加载该文件，**开工前必须先读取**）。
> 铁律、违禁表、标准路径代码与完整规范细则均不在此重复复制，冲突一律以 `.trae/rules/project_rules.md` 为准。

---

## ⚡ 开工前必读与底线

1. **必读唯一铁律源**：`.trae/rules/project_rules.md`（含 6 条铁律、`CANVAS_PRESETS`、组件复用表与 `worldToDesign(x, y, sceneScale)` 标准路径）。
2. **三项最高频红线**：
   - 颜色/字号/坐标/缩放统一来源：`PHYSICS_COLORS` / `SCENE_COLORS` / `CANVAS_COLORS` / `CHART_COLORS` + `withAlpha()`、`font(N)`、`useAnimationViewport` + `AnimationSvgCanvas` + `useSceneScale` + `worldToDesign(x, y, sceneScale)`。
   - 物理层 `src/physics/` 绝对纯净（无 React/DOM/window/Store），看板与场景共享同一实现（`check:single-source`）。
   - 左屏 100% 声明式（`paramMeta` / `controlMeta`），`SidebarExtra` 已清零且**严禁恢复**；基础动画页禁止出现「高考/真题/压轴/母题」字样（`check:exam-isolation`）。

---

## 📋 新建动画页 7 项确认清单

1. **preset**：无图表默认 `full`（840×650）；上下分区 `splitV`（840×325）；左右分区 `splitH`（420×650）；圆周对称 `square`（650×650）。严禁 `wide`/`tall`。
2. **controlsMode**：过程动画 `'timed'`（默认）；永续循环 `'loop'`；纯参数驱动 `'param'`；左屏触发中途定格 `'pause-only'`（`ARCHITECTURE_RULES.md §8.1.4`）。
3. **分层**：`XxxAnimation.tsx`（编排）+ `hooks/useXxxPhysics.ts`（物理）+ `components/XxxScene.tsx`（渲染）。
4. **颜色**：严格按语义选 token，不硬编码、不跨层混用（`PHYSICS_COLORS` ≠ `SCENE_COLORS`）。
5. **坐标与字号**：`useSceneScale` + `worldToDesign(x, y, sceneScale)`；SVG 字号走 `font(N)`；地面/网格用 `vp.designLeft` / `vp.designVisibleW`。
6. **5 处注册**：`data/registries/<domain>.ts` + `data/quantities/<domain>/<topic>.ts` + `data/physicsQuantities.ts` + `data/knowledge/<domain>.ts`（由 `knowledgeTree.ts` 聚合）+ 运行 `node scripts/gen-annotations.mjs`。
7. **复用检查**：先查 `docs/agent-rules/ui/COMPONENT_REGISTRY.md`，有现成组件时禁止手写等效实现。

---

## 📚 按需读取索引

| 触发条件 | 读取文档 |
|---------|---------|
| 唯一铁律、违禁速查、标准路径 | `.trae/rules/project_rules.md` |
| 架构细则 / 目录结构 / 数据协议 / `controlsMode` | `docs/agent-rules/core/ARCHITECTURE_RULES.md` |
| UI 组件 / 颜色语义 / 字号与 barrel 规则 | `docs/agent-rules/ui/02_UI_RULES.md` |
| Canvas/SVG/图表布局与分区方向 | `docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md` |
| 左屏控件、右屏看板、`CenterExtra`、防压字口径 | `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` |
| 公共组件 API 与最小调用 | `docs/agent-rules/ui/COMPONENT_REGISTRY.md` |
| 查询动画入口→场景→物理映射 | `MEMORY.md`（由 `scripts/gen-annotations.mjs` 生成） |
| 提交前验收（10 项静态守卫 + 真机巡检） | `docs/agent-rules/process/CHECKLIST.md` |

---

*最后更新：2026-11-18（去重瘦身，统一指向唯一铁律源 `.trae/rules/project_rules.md`）*
