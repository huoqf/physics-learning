# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 已完成事项记录在 `PROCESS_LOG.md` 和 git commit 中。
>
> 最后更新：2026-06-30

---

## 〇、架构风险与指引

### 风险 1：单个动画 TSX 文件过长

当前较大的文件（实际行数）：

| 文件 | 行数 | 已有 physics 模块 |
|---|---:|:---:|
| ~~`VectorAdditionAnimation.tsx`~~ | ~~808→78~~ | ✅ 已拆分 |
| `WeightlessnessAnimation.tsx` | 771 | 无 |
| `ThinLensAnimation.tsx` | 761 | `optics.ts`(209行) |
| `MomentumTheoremAnimation.tsx` | 758 | `momentumTheorem.ts`(124行) |
| `VelocitySelector.tsx` | 720 | `velocitySelector.ts`(149行) |
| `EquilibriumAnimation.tsx` | 688 | `equilibrium.ts`(289行) |
| `MomentumConservationAnimation.tsx` | 671 | `momentumConservation.ts`(190行) |
| `KeplerAnimation.tsx` | 621 | `celestial.ts`(218行) |

问题本质：**关注点混合**。一个动画文件同时包含参数读取、物理计算、坐标换算、动画状态、SVG 绘制、图表绘制、标注文本、教学逻辑、交互逻辑。

长期风险：
- 改显示逻辑可能破坏物理计算
- 新人或 AI 维护时上下文过大
- 难以对关键物理公式补单元测试
- 视觉回归难发现

### 风险 2：`features` 与 `physics` 抽离程度不一致

部分动画已有独立物理模块（如 `equilibrium.ts` 289行、`momentumConservation.ts` 190行），但 `WeightlessnessAnimation`（771行）仍缺少独立 physics 模块。

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

### 拆分目的（不是为了拆而拆）

拆分要解决具体问题：
1. **物理计算无法独立测试** → 抽纯函数到 `src/physics/`
2. **改显示逻辑可能破坏物理** → 分离 view/model
3. **视觉回归难发现** → 抽 viewModel 便于断言坐标
4. **新人维护上下文过大** → 模块化降低认知负担

**验收标准**：拆分后必须满足以下至少一项，否则不拆：
- 新增了可独立运行的单元测试
- 物理计算与渲染逻辑解耦
- 单文件行数降到 500 以下
- 减少了跨模块耦合

### 三段式拆分原则

1. **第一层：纯物理计算** → `src/physics/...`（无 React/DOM/SVG/Zustand，可单元测试）
2. **第二层：几何/视图模型** → `features/.../model/viewModel.ts` 或 `hooks/useXxxGeometry.ts`
3. **第三层：React 展示组件** → 只负责读取 viewModel、渲染 SVG、绑定交互

拆分铁律：
- 一次只拆一个动画，每次只抽一个层次，每次补一组测试
- 物理 hook 零 JSX：`hooks/useXxxPhysics.ts` 只返回数据，不含 `<` 标签
- 组件复用优先：场景中已有 `src/components/` 下的组件时必须直接使用
- 拆完跑 `npm run check && npm test`
- **不拆的情况**：文件虽长但职责清晰、无测试需求、拆分后收益不明显

---

## 一、超长文件拆分（按优先级）

| 优先级 | 文件 | 行数 | 已有 physics | 建议原因 |
|:---:|------|-----:|:---:|---------|
| ~~1~~ | ~~`VectorAdditionAnimation.tsx`~~ | ~~808→78~~ | ✅ | ✅ 已完成 |
| 2 | `WeightlessnessAnimation.tsx` | 771 | 无 | 物理模型明确，需新建 physics 模块 |
| 3 | `ThinLensAnimation.tsx` | 761 | `optics.ts` | 已有 physics，可继续抽 geometry model |
| 4 | `MomentumTheoremAnimation.tsx` | 758 | `momentumTheorem.ts` | 已有 physics，可继续抽 viewModel |
| 5 | `VelocitySelector.tsx` | 720 | `velocitySelector.ts` | 已有 physics，电磁轨迹适合 physics/model 化 |

> 观察：`EquilibriumAnimation.tsx`(688)、`MomentumConservationAnimation.tsx`(671)、`KeplerAnimation.tsx`(621) 临近阈值，暂不动。

---

## 二、响应式缩放（P1/P2 分级）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| A | SVG 子组件硬编码 `fontSize` | 15 文件 64 处 | 加 `font` prop 由父组件传入，按组件域分批迁移 |
| B | 混合文件残留 | 2 文件 10 处 | 补齐 `SatelliteAnimation`(9)、`InductionPhenomenon`(1) 硬编码残留 |
| C | Tailwind `text-[Npx]` | 31 文件 69 处 | 按域分批替换，建立语义 class（`text-ui-xs`、`text-panel-label` 等） |
| D | `useCanvasSize({ ... })` 硬编码 | 14 处 | 多数为合理例外，更新 allowlist 文档即可 |

详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)、[`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

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

### 4.4 Store selector 优化（P3）

> `useAnimationStore` 当前整体订阅，派生数据（当前速度、图表点、公式）应由 selector/hook 计算。

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

---

## 五、执行优先级

| 顺序 | 事项 | 风险 | 收益 | 优先级 |
|:---:|------|:---:|:---:|:---:|
| 1 | ~~`VectorAdditionAnimation` 拆分~~ | ~~中~~ | ~~高~~ | ✅ 已完成 |
| 2 | `WeightlessnessAnimation` 拆分（无 physics，需新建） | 中 | 高 | P2 |
| 3 | `ThinLensAnimation` 拆分（已有 physics，继续抽） | 低 | 高 | P2 |
| 4 | `MomentumTheoremAnimation` 拆分（已有 physics，继续抽） | 低 | 高 | P2 |
| 5 | 选 1 个大动画做 viewModel 拆分试点 | 中 | 高 | P2 |
| 6 | Tailwind `text-[Npx]` 分域替换 | 中 | 中 | P2 |
| 7 | A/B 类 SVG fontSize 响应式迁移 | 中高 | 中 | P2/P3 |
| 8 | `VelocitySelector` 拆分（已有 physics，继续抽） | 低 | 高 | P2/P3 |
| 9 | AnimationModule 规范建立 | 中 | 高 | P3 |
| 10 | Store selector 优化 | 中 | 中 | P3 |
| 11 | Registry + params + quantities 类型闭环 | 高 | 高 | P3 |

---

## 附录：大文件拆分方向（基于代码分析）

> 每个文件的拆分方向基于实际代码结构，不是模板。不拆的部分说明原因。

### A1. VectorAdditionAnimation.tsx — ✅ 已完成

**拆分结果**（808行 → 78行，降91%）：

| 文件 | 行数 | 职责 |
|------|-----:|------|
| `VectorAdditionAnimation.tsx` | 78 | 薄编排层 |
| `useVectorDrag.ts` | 61 | 拖拽交互+吸附逻辑 |
| `VectorGrid.tsx` | 71 | 网格+刻度渲染 |
| `VectorAngleArc.tsx` | 39 | 角度弧线标注 |
| `VectorFormulaPanel.tsx` | 56 | 公式面板 |
| `VectorDecomposition.tsx` | 59 | 正交分解模式 |
| `VectorParallelogram.tsx` | 63 | 平行四边形模式 |
| `VectorTriangle.tsx` | 62 | 三角形模式 |

---

### A2. WeightlessnessAnimation.tsx（771行）

**已有**：`calculateElevatorMotion`（`@/physics`）— 底层物理计算已抽取。

**剩余问题**：主文件混合了布局几何（电梯位置、体重计位置、图表坐标）、场景渲染（井道、电梯、体重计、砝码、图表）、动画状态管理。

| 区域 | 行数 | 拆分方向 | 验收价值 |
|------|-----:|---------|---------|
| 布局几何计算（电梯/体重计/砝码位置） | ~120 | `useWeightlessnessLayout` hook | 几何计算与渲染解耦，便于断言关键坐标 |
| 图表坐标映射 | ~80 | `useWeightlessnessChart` hook 或合入 layout | 图表逻辑独立 |
| 电梯井+电梯渲染 | ~150 | `ElevatorShaft` 组件 | 场景组件复用 |
| 体重计+砝码渲染 | ~120 | `WeightScale` 组件 | 场景组件复用 |
| 力箭头渲染 | ~80 | 已有 `VectorArrow`，提取 `WeightlessnessVectors` 组件 | 减少主文件JSX |
| 图表渲染 | ~120 | `WeightlessnessChart` 组件 | 图表与场景分离 |

**目标**：主文件降到 ~150 行。

---

### A3. ThinLensAnimation.tsx（761行）

**已有**：`useThinLensPhysics.ts` + `calculateThinLens`（`@/physics/optics`）— 物理+视图模型已部分抽取。

**剩余问题**：光线追踪计算（~180行 useMemo）嵌在主文件中，是最大的可拆块。

| 区域 | 行数 | 拆分方向 | 验收价值 |
|------|-----:|---------|---------|
| 光线追踪路径计算 | ~180 | `useThinLensRays` hook 或 `model/rayTracing.ts` | 核心光学逻辑可独立单测 |
| `CandleShape` / `FocalMarks` | ~60 | 已是局部函数，可提升为 `components/CandleShape.tsx` 等 | 组件复用 |
| 拖拽交互 | ~40 | 合入现有 hook 或新建 `useThinLensDrag` | 交互逻辑解耦 |
| 图表数据准备 | ~50 | 合入 `useThinLensPhysics` | 减少主文件 |
| 光线 SVG 渲染 | ~150 | `ThinLensRays` 组件 | 渲染与计算分离 |

**目标**：主文件降到 ~200 行。

---

### A4. MomentumTheoremAnimation.tsx（758行）

**已有**：`calculateFallVelocity`、`calculateAverageImpactForce` 等（`@/physics/momentumTheorem`）— 物理计算已抽取。

**剩余问题**：主文件含布局几何、粒子系统、基础/进阶双模式渲染、图表。

| 区域 | 行数 | 拆分方向 | 验收价值 |
|------|-----:|---------|---------|
| 布局几何（球位置、缓冲垫压缩、弹簧） | ~100 | `useMomentumTheoremLayout` hook | 几何计算可独立测试 |
| 粒子系统（进阶模式流体粒子） | ~80 | `useParticleSimulation` hook | 粒子逻辑与渲染解耦 |
| 图表数据（F-t / v-t / p-t） | ~100 | 合入 layout hook 或独立 `useMomentumCharts` | 图表逻辑独立 |
| 基础模式场景渲染 | ~120 | `MomentumBasicScene` 组件 | 模式独立维护 |
| 进阶模式场景渲染 | ~150 | `MomentumAdvancedScene` 组件 | 模式独立维护 |
| 图表渲染 | ~80 | 复用 `RelationChart` / `ChartArea`，提取配置 | 减少主文件 |

**目标**：主文件降到 ~150 行。

---

### A5. VelocitySelector.tsx（720行）

**已有**：`calculateVelocitySelectorTrajectory`（`@/physics`）— 轨迹计算已抽取。

**剩余问题**：主文件含粒子状态管理、Canvas 粒子渲染、图表数据、SVG 场景。

| 区域 | 行数 | 拆分方向 | 验收价值 |
|------|-----:|---------|---------|
| 粒子状态管理（发射/更新/清理） | ~100 | `useVelocitySelectorParticles` hook | 粒子生命周期与渲染解耦 |
| Canvas 粒子渲染 | ~150 | `VelocitySelectorCanvas` 组件 | Canvas 逻辑独立 |
| 图表数据+曲线路径 | ~100 | `useVelocitySelectorChart` hook | 图表逻辑独立 |
| 磁场符号阵列 | ~30 | `MagneticFieldSymbols` 组件 | 纯渲染 |
| 手势规则计算 | ~40 | 合入 physics hook | 减少主文件 |
| SVG 场景渲染 | ~200 | `VelocitySelectorScene` 组件 | 场景与 Canvas 分离 |

**目标**：主文件降到 ~150 行。
