# AGENT.md — Trae VIBE CODE 执行入口

> **面向 AI Agent / Trae VIBE CODE 的唯一启动入口。**
> 每次任务开始前读本文件 + `CORE_RULES.md` + `ARCHITECTURE_RULES.md`，按需加载其余文档。

---

## 🚀 按需加载速查

### 必读（每次任务）

```
AGENT.md → CORE_RULES.md → ARCHITECTURE_RULES.md → 当前里程碑 ROADMAP_Mx_*.md
```

### 按需读取（触发时才读，否则跳过）

| 触发条件 | 读取文档 |
|---------|---------|
| 涉及 UI 组件 / 布局 / 颜色 / 间距 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 涉及过渡动画 / Framer Motion / easing | `docs/agent-rules/ui/03_MOTION_RULES.md` |
| 实现 AnalysisPage / 解析页布局 | `docs/agent-rules/ui/04_ANALYSIS_PAGE_RULES.md` |
| 实现 WrongPage / 错题卡片 / 错题状态 | `docs/agent-rules/ui/05_WRONGBOOK_RULES.md` |
| 查看全局进度 / 选下一个任务 | `docs/agent-rules/roadmap/ROADMAP_PROGRESS.md` |
| 申报依赖 / 查历史决策 / 追问题 | `docs/agent-rules/process/PROCESS_LOG.md` |

### 无需读文档，直接 import 代码

| 需求 | 操作 |
|------|------|
| 颜色 / 间距 / 圆角 / 阴影 | `import { ... } from '@/theme'` |
| Canvas 物理量颜色 / 尺寸 | `import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'` |
| 动效 duration / easing | `import { duration, easing, transition } from '@/theme/motion'` |

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

1. **Token 唯一来源**：颜色/间距/圆角/阴影/动效一律从 `src/theme/` import，**禁止组件内硬编码**
2. **Store 唯一命名**：动画状态统一使用 `useAnimationStore`，**禁止另建 `usePhysicsState`**
3. **纯函数物理计算**：`src/physics/` 函数必须纯函数，无副作用，有 JSDoc + 单位注释
4. **HashRouter Only**：禁止 `BrowserRouter`（Electron `file://` 兼容）
5. **依赖先申报**：新增 npm 包必须先在 `PROCESS_LOG.md` 申报再安装
6. **修改必记录**：每次提交前在 `PROCESS_LOG.md` 添加记录
7. **里程碑顺序**：严格 M0→M1→(M2‖M3)→M4
8. **Canvas 坐标**：物理坐标 y↑正方向，Canvas 渲染通过 `physicsToCanvas()` 反转，禁止魔法数字
9. **calculateCoulombForce**：已在 `src/physics/dynamics.ts`，M4 直接 import，禁止重复实现

---

## 🗂️ 项目目录速览

```
physics-learning/
├── AGENT.md                          ← 你在这里（AI 入口）
├── src/
│   ├── theme/                        ← Token 唯一来源（直接 import，无需读文档）
│   │   ├── index.ts                  ← 统一导出
│   │   ├── colors.ts                 ← 主色 / 辅色 / 语义色
│   │   ├── physicsColors.ts          ← Canvas 物理量颜色 / CANVAS_STYLE
│   │   ├── motion.ts                 ← duration / easing / transition
│   │   └── spacing.ts / radius.ts / shadow.ts
│   ├── physics/                      ← 纯函数物理计算（无副作用）
│   │   └── dynamics.ts               ← 含 calculateCoulombForce（M4 复用此处）
│   ├── stores/
│   │   └── useAnimationStore.ts      ← 动画状态唯一 Store（M1 扩展此文件）
│   ├── components/ / pages/ / features/
│   └── App.tsx                       ← HashRouter + 路由表
└── docs/agent-rules/                 ← 规则文档（按需读取，非全量加载）
    ├── core/CORE_RULES.md            ← 必读：总纲与按需加载策略
    ├── core/ARCHITECTURE_RULES.md   ← 必读：技术架构约束
    ├── ui/02–05_*.md                 ← 按需：UI/动效/解析页/错题本
    ├── roadmap/ROADMAP_Mx_*.md       ← 按需：各里程碑任务
    └── process/PROCESS_LOG.md        ← 按需：变更记录
```

---

## 🛣️ 路由表（完整）

| 路由 | 页面组件 | 里程碑 |
|------|---------|--------|
| `/` | `HomePage` | M0 |
| `/animation/:id` | `AnimationPage` | M0 |
| `/analysis/:id` | `AnalysisPage` | M0 |
| `/practice` | `PracticePage` | M0 |
| `/wrong` | `WrongPage` | M0 |
| `/knowledge` | `KnowledgePage` | M2 |

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

*最后更新：2026-05-29 | 优化：按需加载策略，删除 README.md，ASCII 布局图集中到 04_ANALYSIS_PAGE_RULES.md*
