# AGENT.md — Trae VIBE CODE 执行入口

> **面向 AI Agent / Trae VIBE CODE 的唯一自动加载入口。**
> 每次任务开始前读本文件 + `ARCHITECTURE_RULES.md`，按需加载其余文档。

---

## 🎯 项目目标

1. 建立完整且清晰的高中物理知识结构
2. 用交互动画帮助理解物理现象与概念
3. 通过真题拆解帮助学习者建立解题思路
4. 可长期扩展，便于持续加入新章节、新题型与新场景

---

## 🚀 按需加载速查

### 必读（每次任务）

```
AGENT.md → ARCHITECTURE_RULES.md → 当前里程碑 ROADMAP_Mx_*.md
```

### 按需读取（触发时才读，否则跳过）

| 触发条件 | 读取文档 |
|---------|---------|
| 涉及 UI 组件 / 布局 / 颜色 / 间距 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 涉及过渡动画 / easing | `docs/agent-rules/ui/03_MOTION_RULES.md` |
| 实现 AnalysisPage / 解析页布局 | `docs/agent-rules/ui/04_ANALYSIS_PAGE_RULES.md` |
| 实现 WrongPage / 错题卡片 / 错题状态 | `docs/agent-rules/ui/05_WRONGBOOK_RULES.md` |
| 涉及跨页面导航 / URL 状态保持 | `docs/agent-rules/ui/06_NAVIGATION_RULES.md` |
| 查看全局进度 / 选下一个任务 | `docs/agent-rules/roadmap/ROADMAP_PROGRESS.md` |
| 申报依赖 / 查历史决策 / 追问题 | `docs/agent-rules/process/PROCESS_LOG.md` |

> **文档优先级**：AGENT.md > ARCHITECTURE_RULES > 02_UI > 03~06

### 无需读文档，直接 import 代码

| 需求 | 操作 |
|------|------|
| UI 语义色（按钮/背景/状态） | `import { colors } from '@/theme/colors'` |
| 物理量颜色 / 场景色 / 图表色 | `import { PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS } from '@/theme/physics'` |
| Canvas/SVG 绘制规范 | `import { CANVAS_STYLE, SVG_ATTR } from '@/theme/physics'` |
| 间距 / 布局 / 断点 | `import { LAYOUT, spacing, BREAKPOINT, PANEL } from '@/theme/spacing'` |
| 动效 duration / easing | `import { duration, easing, transition } from '@/theme/motion'` |
| 圆角 / 阴影 | `import { radius } from '@/theme/radius'` / `import { shadow, glowRing } from '@/theme/shadow'` |

> **import 路径规则**：从最具体的子模块入口引用（如 `@/theme/physics`、`@/theme/colors`、`@/theme/motion`）。
> `@/theme` 统一入口仍可用，但子模块路径优先（语义更明确、tree-shaking 更友好）。

---

## 🗺️ 里程碑文档入口

| 里程碑 | 文档 | 依赖 |
|--------|------|------|
| [M0] 基础架构 | `roadmap/ROADMAP_M0_FOUNDATION.md` | — |
| [M1] 力学动画 | `roadmap/ROADMAP_M1_MECHANICS.md` | M0 |
| [M2] 力学完善 | `roadmap/ROADMAP_M2_POLISH.md` | M1 |
| [M3] 真题训练 | `roadmap/ROADMAP_M3_EXAM.md` | M1（可与 M2 并行）|
| [M4] 电磁/热/光/原子 | `roadmap/ROADMAP_M4_PHYSICS.md` | M2 |

执行顺序：M0 → M1 → (M2 ‖ M3) → M4

---

## 🔴 全局铁律（不得违反）

1. **Token 唯一来源**：颜色/间距/圆角/阴影/动效一律从 `src/theme/` import，禁止组件内硬编码
2. **Store 唯一命名**：动画状态统一使用 `useAnimationStore`，禁止另建 `usePhysicsState`
3. **纯函数物理计算**：`src/physics/` 函数必须纯函数，无副作用，有 JSDoc + 单位注释
4. **HashRouter Only**：禁止 `BrowserRouter`（Electron `file://` 兼容）
5. **依赖先申报**：新增 npm 包必须先在 `PROCESS_LOG.md` 申报再安装
6. **修改必记录**：每次提交前在 `PROCESS_LOG.md` 添加记录
7. **里程碑顺序**：严格 M0→M1→(M2‖M3)→M4
8. **Canvas 坐标**：物理坐标 y↑正方向，Canvas 渲染通过 `physicsToCanvas()` 反转，禁止魔法数字
9. **calculateCoulombForce**：已在 `src/physics/dynamics.ts`，M4 直接 import，禁止重复实现

> 铁律细则见 `ARCHITECTURE_RULES.md` 对应章节

---

## 🗂️ 目录结构与路由表

> 详见 `ARCHITECTURE_RULES.md §2（目录结构）+ §9（路由表）`

---

## ✅ 任务完成 Checklist

- [ ] 当前里程碑文件对应任务打 `[x]`
- [ ] `PROCESS_LOG.md` 添加代码修改记录
- [ ] 新增依赖已在 `PROCESS_LOG.md` 申报
- [ ] 无 hardcode 颜色/间距（全部从 `src/theme` import）
- [ ] 纯函数有 JSDoc + 参数单位注释
- [ ] `ROADMAP_PROGRESS.md` 里程碑状态已更新

---

## 🤖 Trae VIBE CODE 任务标记约定

```ts
// @agent-task: [M1-2] 实现 AcceleratedMotion 组件
// @agent-rule: 见 docs/agent-rules/ui/02_UI_RULES.md §3（按需时读）
// @agent-warn: tension 颜色已修正为 #9333EA，勿改回 #7C3AED
// @agent-reuse: calculateCoulombForce 来自 src/physics/dynamics.ts
```

---

*最后更新：2026-06-03 | 合并 CORE_RULES.md 入本文件，删除目录/路由重复，修复过时路径*
