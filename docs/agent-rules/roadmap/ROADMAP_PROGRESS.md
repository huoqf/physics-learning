# ROADMAP — 高中物理交互动画学习软件

> 最后更新：2026-06-07

---

## ⚡ AI Agent 执行规则（每次任务必读）

1. **先读本文件**，确认当前里程碑状态与活跃任务
2. **再读对应子文件**，获取该里程碑的完整知识点列表与组件任务
3. **严格按子文件的任务清单执行**，完成后更新对应子文件中的 `[x]` 状态
4. **禁止跨里程碑超前实现**（除非本文件明确标注 can-start）
5. **任务结束后**同步更新本文件里程碑状态表 + `process/PROCESS_LOG.md`
6. **里程碑命名唯一来源**：本文件，格式 `[M0]`–`[M4]`，禁止自然语言替代

---

## 📊 里程碑总览

| 里程碑 | 名称 | 状态 | 依赖 | 子文件 |
|--------|------|------|------|--------|
| [M0] | 技术基础架构 | ✅ 已完成 | — | `roadmap/ROADMAP_M0_FOUNDATION.md` |
| [M1] | 力学模块（全8章） | ✅ 已完成 | [M0] | `roadmap/ROADMAP_M1_MECHANICS.md` |
| [M2] | 力学完善 + 导航系统 | ✅ 已完成 | [M1] | `roadmap/ROADMAP_M2_POLISH.md` |
| [M3] | 真题训练系统 | ✅ 已完成 | [M1] | `roadmap/ROADMAP_M3_EXAM.md` |
| [M4] | 电磁/热/光/原子模块 | 🚧 进行中 | [M2] | `roadmap/ROADMAP_M4_PHYSICS.md` |

**状态标记**：⏳ 待开始 / 🚧 进行中 / ✅ 已完成 / ⛔ 阻塞

---

## 🎯 当前活跃任务

> 只保留当前焦点，已完成任务详见 `process/PROCESS_LOG.md`

- **当前里程碑**：[M4] 电磁/热/光/原子模块 🚧 进行中
- **当前焦点**：[M4-1] 电磁学 ✅ 已收官 · [M4-1.x] CuttingEMF 增强 ✅ · [M4-2] 热学纯函数库 ✅ · [M4-3] 光学纯函数库 ✅
- **架构完善**：AnimationPage 规范合规重构（773→275行，registry 驱动）✅ · 项目规范整合至 .trae/rules/project_rules.md ✅ · 矢量箭头统一架构（VectorArrow + refMagnitude 归一化 + SceneConfig refMagnitudes + 项目规范同步）✅
- **力学增强**：竖直上抛运动三屏联动重构 + 进阶模式 ✅ · 速度动画进阶版重构（基础版+进阶版双模式，含变加速/简谐振动/往返多阶段3种模型）✅ · 力的合成与分解手势拖拽重构与三模式教学改进 ✅ · 共点力平衡双绳悬挂手势拖拽重构与封闭三角形演示 ✅
- **图表迁移**：KineticEnergyAnimation（995→157行）✅ · PowerAnimation（841→192行）✅
- **下一步**：[M4-2] 热学组件——BrownianMotion / MolecularForce / GasLaws / IdealGasState / FirstLawThermo / SecondLawThermo

---

## 🏗️ 整体架构速查

```
技术栈：React 19 + Vite 6 + TypeScript 5.5 + TailwindCSS 4
状态管理：Zustand | 路由：HashRouter | 公式：KaTeX（离线）
渲染：SVG（教学）/ Canvas（高频）/ PixiJS（复杂场景，[M4]引入）
存储：IndexedDB（主）+ LocalStorage（配置）≤ 200MB
打包：浏览器优先，后期 Electron；base: './'，禁止运行时 CDN
```

&gt; 完整架构约束见 `core/ARCHITECTURE_RULES.md`，UI规范见 `ui/02_UI_RULES.md`

---

## 📋 全局约束（所有里程碑适用）

| 约束 | 规则 |
|------|------|
| 路由 | 强制 HashRouter |
| 离线 | KaTeX/图标/题库全部打包，禁止运行时 CDN |
| 坐标 | 所有渲染必须通过 `src/utils/coordinate.ts` |
| 动画 | 所有动画必须通过 `src/utils/animation.ts` |
| 纯函数 | `src/physics/` `src/math/` 不得依赖 DOM/React/window |
| 依赖 | 新增 npm 包必须先在 `process/PROCESS_LOG.md` 申报 |
| 数据 | 知识数据存 `src/data/knowledge/`，题目存 `src/data/problems/` |

---

## 📁 文档索引

| 文件 | 用途 |
|------|------|
| `core/ARCHITECTURE_RULES.md` | 技术架构细则（含铁律权威定义） |
| `ui/02_UI_RULES.md` | 视觉与交互规范 |
| `roadmap/ROADMAP_PROGRESS.md` | **本文件**：进度入口 |
| `roadmap/ROADMAP_M0_FOUNDATION.md` | [M0] 技术基础详细任务 |
| `roadmap/ROADMAP_M1_MECHANICS.md` | [M1] 力学全知识点 + 组件清单 |
| `roadmap/ROADMAP_M2_POLISH.md` | [M2] 力学完善 + 导航系统任务 |
| `roadmap/ROADMAP_M3_EXAM.md` | [M3] 真题系统全任务 |
| `roadmap/ROADMAP_M4_PHYSICS.md` | [M4] 电磁/热/光/原子全知识点 |
| `process/PROCESS_LOG.md` | 变更记录与依赖申报 |
