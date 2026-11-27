# ROADMAP — 高中物理交互动画学习软件

> 最后更新：2026-11-27

---

## 📦 历史规划归档声明（只读）

> `[M0]`–`[M4]` 建站期里程碑规划已基本完成，**`docs/agent-rules/roadmap/` 目录现保留为只读历史记录**。
> - 日常待办、缺口核销与遗留技术债统一维护于 [`process/TODO_deferred.md`](../process/TODO_deferred.md)
> - 近期改动与验证记录以 `git log` 为准（历史流水账已归档于 [`process/PROCESS_LOG.md`](../process/PROCESS_LOG.md)）
> - AI Agent **不再需要**每次任务读取或回写本文件。

---

## 📊 里程碑总览

| 里程碑 | 名称 | 状态 | 依赖 | 子文件 |
|--------|------|------|------|--------|
| [M0] | 技术基础架构 | ✅ 已完成 | — | `roadmap/ROADMAP_M0_FOUNDATION.md` |
| [M1] | 力学模块（全8章） | ✅ 已完成 | [M0] | `roadmap/ROADMAP_M1_MECHANICS.md` |
| [M2] | 力学完善 + 导航系统 | ✅ 已完成 | [M1] | `roadmap/ROADMAP_M2_POLISH.md` |
| [M3] | 真题训练系统 | ✅ 已完成 | [M1] | `roadmap/ROADMAP_M3_EXAM.md` |
| [M4] | 电磁/热/光/原子模块 | ✅ 主体完成（零星补缺已收拢至 `TODO_deferred.md`） | [M2] | `roadmap/ROADMAP_M4_PHYSICS.md` |

**状态标记**：⏳ 待开始 / 🚧 进行中 / ✅ 已完成 / ⛔ 阻塞

---

## 🎯 当前活跃任务

> 只保留当前基线快照，日常待办与技术债请直接查看 `process/TODO_deferred.md`。

- **当前阶段**：建站期主里程碑已收口，进入持续修缮、题库补录与局部模型增强阶段（历史交付记录见 `git log` 与已归档的 [`process/PROCESS_LOG.md`](../process/PROCESS_LOG.md)）。
- **当前现状**：全仓已注册 **134 个动画**（覆盖力学/电磁/热学/光学/振动/近代物理），实验专题 **12/12 全闭环**，横向基座（`CharacteristicCurve` / `EnergyFlowBars` / `ChainCircuitBuilder`）已全部落地，且架构门禁已升级为 11 项（`npm run check:architecture`）。
- **后续焦点与挂账**：统一以 [`process/TODO_deferred.md`](../process/TODO_deferred.md) 为准（含 2025 真题其余题目补录、少量专题细化与低优先级技术债）。

---

## 🏗️ 整体架构速查

```
技术栈：React 19 + Vite 6 + TypeScript 5.5 + TailwindCSS 4
状态管理：Zustand | 路由：HashRouter | 公式：KaTeX（离线）
渲染：SVG（教学）/ Canvas（高频）/ PixiJS（候选，当前未引入）
存储：IndexedDB（主）+ LocalStorage（配置）≤ 200MB
打包：浏览器优先，后期 Electron；base: './'，禁止运行时 CDN
```

> 完整架构约束见 `core/ARCHITECTURE_RULES.md`，UI规范见 `ui/02_UI_RULES.md`

---

## 📋 全局约束（所有里程碑适用）

| 约束 | 规则 |
|------|------|
| 路由 | 强制 HashRouter |
| 离线 | KaTeX/图标/题库全部打包，禁止运行时 CDN |
| 坐标 | 新页面统一走 `useAnimationViewport` + `useSceneScale` + `worldToDesign`（`src/utils/coordinate.ts` 仅用于存量维护） |
| 动画 | 所有动画必须通过 `src/utils/animation.ts` |
| 纯函数 | `src/physics/` `src/math/` 不得依赖 DOM/React/window |
| 依赖 | 新增 npm 包须同步更新 `core/ARCHITECTURE_RULES.md §11.1` 依赖清单 |
| 数据 | 知识数据存 `src/data/knowledge/`，题目存 `src/data/problems/` |

---

## 📁 文档索引

| 文件 | 用途 |
|------|------|
| `core/ARCHITECTURE_RULES.md` | 技术架构细则（唯一铁律源为 `.trae/rules/project_rules.md`） |
| `ui/02_UI_RULES.md` | 视觉与交互规范 |
| `roadmap/ROADMAP_PROGRESS.md` | **本文件**：历史规划归档（只读） |
| `roadmap/ROADMAP_M0_FOUNDATION.md` | [M0] 技术基础详细任务 |
| `roadmap/ROADMAP_M1_MECHANICS.md` | [M1] 力学全知识点 + 组件清单 |
| `roadmap/ROADMAP_M2_POLISH.md` | [M2] 力学完善 + 导航系统任务 |
| `roadmap/ROADMAP_M3_EXAM.md` | [M3] 真题系统全任务 |
| `roadmap/ROADMAP_M4_PHYSICS.md` | [M4] 电磁/热/光/原子全知识点 |
| `process/PROCESS_LOG.md` | 历史工程日志（只读归档） |
