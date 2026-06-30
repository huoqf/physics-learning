# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 已完成事项记录在 `PROCESS_LOG.md` 和 git commit 中。
>
> 最后更新：2026-06-30

---

## 〇、架构风险与指引

### 风险 1：单个动画 TSX 文件过长

问题本质：**关注点混合**。一个动画文件同时包含参数读取、物理计算、坐标换算、动画状态、SVG 绘制、图表绘制、标注文本、教学逻辑、交互逻辑。

长期风险：
- 改显示逻辑可能破坏物理计算
- 新人或 AI 维护时上下文过大
- 难以对关键物理公式补单元测试
- 视觉回归难发现

### 风险 2：`features` 与 `physics` 抽离程度不一致

部分动画已有独立物理模块（如 `equilibrium.ts` 289行、`momentumConservation.ts` 190行），但剩余大文件虽已有 physics 模块，仍混合大量布局几何与渲染逻辑。

### 风险 3：registry、params、quantities 三条链路类型中断

`useAnimationStore` 中 `params: Record<string, number>` 使 registry 中已增强的类型退化，参数名拼错时编译不报错。

### 风险 4：`data/quantities` 文件变大

当前较大的 quantities 文件（实际行数）：

| 文件 | 行数 |
|---|---:|
| `knowledgeTree.ts` | 744 |
| `electrostatics.ts` | 436 |
| `energy.ts` | 362 |
| `dc-circuits.ts` | 344 |
| `induction.ts` | 295 |

随着动画数量增长，会逐渐变成第二个 registry 巨石。

### 目标架构

```text
features/<domain>/<topic>/
├── XxxAnimation.tsx          # 薄编排层：参数读取 + 组合子组件
├── components/               # 局部 SVG 场景组件（纯渲染，无物理计算）
├── hooks/
│   └── useXxxPhysics.ts     # 物理计算 + 布局几何（可独立单测）
├── model/
│   ├── types.ts
│   └── viewModel.ts          # 物理量 → SVG 坐标 / 图表点 / 标注位置
└── index.ts

src/physics/<domain>/<model>.ts  # 纯计算函数，无 React/DOM 依赖
```

依赖方向：`math → physics → scene/chart → features → pages`

禁止反向依赖：physics → features、data → pages、components → features

### 拆分原则

**目的**（不是为了拆而拆）：
1. **物理计算无法独立测试** → 抽纯函数到 `src/physics/`
2. **改显示逻辑可能破坏物理** → 分离 view/model
3. **视觉回归难发现** → 抽 viewModel 便于断言坐标
4. **新人维护上下文过大** → 模块化降低认知负担

**验收标准**（拆分后必须满足至少一项）：
- 新增了可独立运行的单元测试
- 物理计算与渲染逻辑解耦
- 单文件行数降到 500 以下
- 减少了跨模块耦合

**三段式拆分**：
1. **第一层：纯物理计算** → `src/physics/...`（无 React/DOM/SVG/Zustand，可单元测试）
2. **第二层：几何/视图模型** → `features/.../model/viewModel.ts` 或 `hooks/useXxxGeometry.ts`
3. **第三层：React 展示组件** → 只负责读取 viewModel、渲染 SVG、绑定交互

**铁律**：
- 一次只拆一个动画，每次只抽一个层次，每次补一组测试
- 物理 hook 零 JSX：`hooks/useXxxPhysics.ts` 只返回数据，不含 `<` 标签
- 组件复用优先：场景中已有 `src/components/` 下的组件时必须直接使用
- 拆完跑 `npm run check && npm test`
- **不拆的情况**：文件虽长但职责清晰、无测试需求、拆分后收益不明显

---

## 一、超长文件拆分（P2）

| 文件 | 行数 | 已有 physics | 拆分方向 | 目标行数 |
|------|-----:|:---:|---------|-----:|
| `Transformer.tsx` | 724 | 无 | 场景→组件，电表/线圈→独立组件 | ~200 |
| `ThinLensAnimation.tsx` | 761 | `optics.ts`(209行) | 光线追踪→hook，CandleShape→组件 | ~200 |
| `MomentumTheoremAnimation.tsx` | 758 | `momentumTheorem.ts`(124行) | 布局几何→hook，双模式→独立组件 | ~150 |
| `VelocitySelector.tsx` | 720 | `velocitySelector.ts`(149行) | 粒子→hook，Canvas/SVG→组件 | ~150 |
| `ForceMotionSandbox.tsx` | 694 | `forceMotion/` | 调试工具，评估是否需要拆分 | — |

> 观察：`EquilibriumAnimation.tsx`(688)、`MomentumConservationAnimation.tsx`(671)、`KeplerAnimation.tsx`(621) 临近阈值，暂不动。

---

## 二、响应式缩放（P1/P2）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| A | SVG 子组件硬编码 `fontSize` | 15 文件 64 处 | 加 `font` prop 由父组件传入，按组件域分批迁移 |
| B | 混合文件残留 | 2 文件 10 处 | 补齐 `SatelliteAnimation`(9)、`InductionPhenomenon`(1) 硬编码残留 |
| C | Tailwind `text-[Npx]` | 31 文件 69 处 | 按域分批替换，建立语义 class（`text-ui-xs`、`text-panel-label` 等） |
| D | `useCanvasSize({ ... })` 硬编码 | 14 处 | 多数为合理例外，更新 allowlist 文档即可 |

详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)、[`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 二-b、Canvas 颜色违规（P1）

**问题**：Canvas/SVG 中大量直接使用 `colors.neutral[]`，违反 §3.0.1 隔离铁律。规范要求通过 `CANVAS_COLORS.*` 或 `CHART_COLORS.*` 引用。

**规模**：原 227 处，第一批已修复 20 处（10 个文件），剩余约 207 处。

**第一批已完成**（2026-06-30）：网格线、坐标轴、刻度线、分隔线等明确 canvas 基础设施，替换为 `CANVAS_COLORS.grid`/`axis`/`trackHistory`。详见 `CANVAS_COLORS_REPLACEMENT_PLAN.md`。

**剩余高频违规文件**（需逐案审查语义）：

| 文件 | 剩余违规数 | 典型问题 |
|------|:------:|---------|
| `SatelliteAnimation.tsx` | 12+ | `colors.neutral[600/700]` 用于 SVG 笔画和填充 |
| `InductionPhenomenon.tsx` | 10+ | `colors.neutral[50-800]` 用于电路元件 |
| `ForceDecompositionCard.tsx` | 6 | `colors.neutral[200-800]` 用于卡片 |
| `PendulumScene.tsx` | 6 | `colors.neutral[100-800]` 用于摆线和支架 |
| `ClosedCircuit.tsx` | 5 | `colors.neutral[600-800]` 用于导线渐变 |
| `AmpereFIChart.tsx` | 5 | `colors.neutral[50-600]` 用于图表卡片 |
| `OhmLaw.tsx` | 4 | `colors.neutral[400-800]` 用于元件 |
| `ValleyScene.tsx` | 4 | `colors.neutral[100/800]` 用于块体 |

**方案**：按域分批替换，逐文件审查语义后替换。区分 canvas 基础设施（可替换）与 UI 元素/物理实体（保留）。

---

## 二-c、rgba() 手写与硬编码 fontSize（P3）

**rgba() 手写**：

| 文件 | 行号 | 问题 |
|------|------|------|
| `PowerTransmission.tsx` | 83,90,97 | 动态颜色计算，需评估 |

**硬编码 fontSize**：

| 文件 | 行号 | 问题 |
|------|------|------|
| `VectorPlayground.tsx` | 65 | 开发调试文件，可忽略 |

---

## 三、代码质量

### 3.1 AnimationPage 协调职责监控（P2，观察性）

> 当前 411 行，未超过 500 行阈值。触发拆分条件：行数 > 500 或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

### 3.2 其他（P3，暂缓）

| 条目 | 前提条件 |
|------|---------|
| `expandedNodes: string[]` → `Record<string, true>` | 当前 72 节点，远未达 500+ 阈值 |
| `WrongPage.renderCard` 提取 `React.memo` | `menuFor` 状态只影响单张卡，收益有限 |
| `RightPhysicsPanel` 计算逻辑抽取 | 可抽取独立 hook，优先级低 |

---

## 四、架构增强（P2/P3）

### 4.1 AnimationModule 统一模块规范（P2）

> 当前各动画注册方式分散在 registry 中，缺少统一的模块接口。

建议定义：

```ts
export interface AnimationModule<P extends AnimationParams> {
  id: string
  title: string
  defaultParams: P
  Component: LazyAnimationComponent
  SidebarExtra?: LazySidebarComponent
  buildQuantities?: PhysicsQuantityBuilder<P>
}
```

目标：将组件、参数、面板、公式、测试聚合到同一 feature 模块附近，减少跨目录跳转。

### 4.2 viewModel 层 + 坐标类型（P2/P3）

> 当前 `physics → features` 之间缺少明确的视图模型层，坐标方向错误是教学动画最常见 bug。

建议：
- 为复杂动画建立 `model/viewModel.ts`，负责物理量 → SVG 坐标 / 图表点 / 标注位置
- 考虑引入 `PhysicsY`、`SvgY`、`ChartY` 命名约束（至少在复杂模型中用函数名区分）
- 建立统一坐标约定文档

### 4.3 viewModel 单测（P2）

> 当前测试覆盖 physics 和 utils，但视图映射层缺少保护。

建议新增 viewModel 测试，验证：
- 关键点坐标（A/B/C/D 标注位置）
- 图表 domain
- 游标位置
- 正负方向标注
- 极值点位置

比 E2E 轻很多，但能覆盖大量教学错误。

### 4.4 Store selector 优化（P2）

> 审计发现：116 处 useAnimationStore 调用中，~38 处使用精确 selector，~74 处使用解构 selector。

建议拆分为：`useAnimationParams()`、`usePlaybackState()`、`useAnimationDisplayOptions()`。
通过 selector 降低组件不必要重渲染。

### 4.5 Registry + params + quantities 类型闭环（P3）

> Phase 1（类型别名）已完成。Phase 2 需要增加 registry 级 param helper。

建议增加：

```ts
getDefaultParams(animationId)
normalizeAnimationParams(animationId, params)
isValidParamKey(animationId, key)
```

Phase 3 目标：registry.defaultParams、quantities builder params、AnimationPage params 来自同一份参数定义。
