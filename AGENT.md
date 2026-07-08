# AGENT.md — Trae VIBE CODE 执行入口

> **面向 AI Agent / Trae VIBE CODE 的执行入口。**
> 核心规范位于 `docs/agent-rules/core/ARCHITECTURE_RULES.md`，本文件保留按需加载索引与任务标记约定。
> **开发环境**：便携版 Node.js 位于 `D:\node-v24`，编译/安装依赖时需加入 PATH。

---

## 🚀 规范加载策略

### 自动加载（无需手动读取）

```
.trae/rules/project_rules.md — 全局铁律与规范索引（Trae IDE 自动加载）
```

该文件包含：项目目标、技术栈、目录结构、全局铁律、CANVAS_PRESETS、组件复用原则、规范优先级、快速索引与提交 Checklist。

### 必读（每次任务）

```
.trae/rules/project_rules.md → 当前里程碑 ROADMAP_Mx_*.md
```
<!-- 核心细则按需读取，见下方表格 -->

### 按需读取（触发时才读，否则跳过）

| 触发条件 | 读取文档 |
|---------|---------|
| 需要架构细则/铁律权威定义 | `docs/agent-rules/core/ARCHITECTURE_RULES.md` |
| 涉及 UI 组件 / 布局 / 颜色 / 间距 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 涉及过渡动画 / easing | `docs/agent-rules/ui/03_MOTION_RULES.md` |
| 实现 AnalysisPage / 解析页布局 | `docs/agent-rules/ui/04_ANALYSIS_PAGE_RULES.md` |
| 实现 WrongPage / 错题卡片 / 错题状态 | `docs/agent-rules/ui/05_WRONGBOOK_RULES.md` |
| 涉及跨页面导航 / URL 状态保持 | `docs/agent-rules/ui/06_NAVIGATION_RULES.md` |
| 实现 Canvas/SVG/图表布局 | `docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md` |
| 实现左侧/右侧屏组件 | `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` |
| 查看全局进度 / 选下一个任务 | `docs/agent-rules/roadmap/ROADMAP_PROGRESS.md` |
| 申报依赖 / 查历史决策 / 追问题 | `docs/agent-rules/process/PROCESS_LOG.md` |
| 提交前验证 | `docs/agent-rules/process/CHECKLIST.md` |

> **文档优先级**：project_rules.md > ARCHITECTURE_RULES > 02_UI > 03~08

### 无需读文档，直接 import 代码

| 需求 | 操作 |
|------|------|
| UI 语义色（按钮/背景/状态） | `import { colors } from '@/theme/colors'` |
| 物理量颜色（速度/力/能量等） | `import { PHYSICS_COLORS } from '@/theme/physics'` |
| 场景器材外观色（磁铁/线圈/灯泡/电学器材等） | `import { SCENE_COLORS } from '@/theme/physics'` |
| 图表配色（v-t/P-V/U-I 等） | `import { CHART_COLORS, VT_CHART_COLORS, ... } from '@/theme/physics'` |
| 半透明颜色工具 | `import { withAlpha } from '@/theme/physics'` |
| Canvas/SVG 绘制规范 | `import { CANVAS_STYLE, SVG_ATTR } from '@/theme/physics'` |
| 间距 / 布局 / 断点 | `import { LAYOUT, spacing, BREAKPOINT, PANEL } from '@/theme/spacing'` |
| 动效 duration / easing | `import { duration, easing, transition } from '@/theme/motion'` |
| 圆角 / 阴影 | `import { radius } from '@/theme/radius'` / `import { shadow, glowRing } from '@/theme/shadow'` |
| 动画视口 + SVG 画布 | `import { useAnimationViewport } from '@/hooks'` + `import { AnimationSvgCanvas } from '@/components/Layout'` |
| 场景物理比例尺 | `import { createSceneScaleFromViewport } from '@/scene'` |
| SVG 坐标映射 | `import { useViewportPointer } from '@/utils'` |
| 物理矢量箭头 | `import { VectorArrow } from '@/components/Physics'` |

### 图表与布局工具

| 需求 | 操作 |
|------|------|
| 图表坐标轴刻度自动格式化 | `BasePhysicsChart` 默认使用 `smartFormat`，无需手动传 `formatY`；需自定义时传 `formatY={(v) => ...}` |
| 智能数字格式化（大数/小数自动切科学计数法） | `import { smartFormat } from '@/utils'` |
| SVG 标签避让（多标签位置冲突） | `import { layoutLabels } from '@/utils'`，传入 `{ x, y, text, fontSize, priority }[]`，输出避让后坐标 |
| 能量柱紧凑模式 | `EnergyBars` 组件 `compact` prop，自动缩小字号/截短标签/缩减间距 |

> **import 路径规则**：从最具体的子模块入口引用（如 `@/theme/physics`、`@/theme/colors`、`@/theme/motion`）。
> `@/theme` 统一入口仍可用，但子模块路径优先（语义更明确、tree-shaking 更友好）。

---

## 🗺️ 里程碑文档入口

| 里程碑 | 文档 | 依赖 |
|--------|------|------|
| [M0] 基础架构 | `docs/agent-rules/roadmap/ROADMAP_M0_FOUNDATION.md` | — |
| [M1] 力学动画 | `docs/agent-rules/roadmap/ROADMAP_M1_MECHANICS.md` | M0 |
| [M2] 力学完善 | `docs/agent-rules/roadmap/ROADMAP_M2_POLISH.md` | M1 |
| [M3] 真题训练 | `docs/agent-rules/roadmap/ROADMAP_M3_EXAM.md` | M1（可与 M2 并行）|
| [M4] 电磁/热/光/原子 | `docs/agent-rules/roadmap/ROADMAP_M4_PHYSICS.md` | M2 |

执行顺序：M0 → M1 → (M2 ‖ M3) → M4

---

## 🤖 Trae VIBE CODE 任务标记约定

```ts
// @agent-task: [M1-2] 实现 AcceleratedMotion 组件
// @agent-rule: 见 docs/agent-rules/ui/02_UI_RULES.md §3（按需时读）
// @agent-warn: tension 颜色已修正为 #9333EA，勿改回 #7C3AED
// @agent-reuse: calculateCoulombForce 来自 src/physics/dynamics.ts
```

---

*最后更新：2026-06-28 | 核心规范位于 docs/agent-rules/core/ARCHITECTURE_RULES.md，本文件保留按需加载索引*
