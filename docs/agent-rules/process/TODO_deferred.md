# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-14（维护批次 + 4.2 试点）

---

## 〇、架构背景

### 目标架构

```text
features/<domain>/<topic>/
├── XxxAnimation.tsx          # 薄编排层：参数读取 + 组合子组件
├── components/               # 局部 SVG 场景组件（纯渲染，无物理计算）
├── hooks/
│   └── useXxxPhysics.ts     # 物理计算 + 布局几何 + physicsToCanvas 映射（可独立单测）
├── model/
│   ├── types.ts
│   └── viewModel.ts          # 纯物理坐标计算（y↑ 正），不含 SVG/Canvas/Viewport 依赖
└── index.ts

src/physics/<domain>/<model>.ts  # 纯计算函数，无 React/DOM 依赖
```

依赖方向：`math → physics → viewModel → hooks → components → pages`

**viewModel 约束**：viewModel 只返回物理坐标系（y↑ 正）数据，**禁止**引入 `vp.scale`、`vp.transform`、`visibleW`、`visibleH`、`physicsToCanvas` 或任何 SVG/Canvas 坐标。`physicsToCanvas` 映射保留在 hook 层，使缩放、响应式布局和物理计算可独立演进。

禁止反向依赖：physics → features、data → pages、components → features

### 拆分原则

**目的**（不是为了拆而拆）：
1. 物理计算无法独立测试 → 抽纯函数到 `src/physics/`
2. 改显示逻辑可能破坏物理 → 分离 view/model
3. 视觉回归难发现 → 抽 viewModel 便于断言坐标
4. 新人维护上下文过大 → 模块化降低认知负担

**验收标准**（拆分后必须满足至少一项）：
- 物理计算与渲染逻辑解耦（物理计算逻辑完全隔离到纯函数或专用 hook 中，组件 JSX 内零物理公式）
- 新增了可独立运行的单元测试
- 单文件行数降到 500 以下且无物理计算与 JSX 混写
- 减少了跨模块耦合

**铁律**：
- 一次只拆一个动画，每次只抽一个层次，每次补一组测试
- 物理 hook 零 JSX：`hooks/useXxxPhysics.ts` 只返回数据，不含 `<` 标签；组件 JSX 零物理公式（即运动学/动力学/电磁学等物理计算逻辑）
- 组件复用优先：场景中已有 `src/components/` 下的组件时必须直接使用
- 拆完跑 `npm run check && npm test`
- **不拆的情况**：文件虽长但职责清晰、无物理计算与 JSX 混写、无测试需求、拆分后收益不明显

---

## 一、超长文件拆分（P2）

### 待处理（2026-07-14 核对）

**执行优先级**：RotatingCoil → AnimationPage → RelationChart（仅类型整理）

| # | 文件 | 当前行数 | 消费者 | 测试 | 拆分方案 | 风险 |
|:-:|------|-----:|--------|:---:|---------|:---:|
| 1 | `RotatingCoil.tsx` | 506 | 1（`ACGeneration.tsx`） | 无 | `render3DSlipRing`/`render3DBrush`/`renderBrushWires` → `rotatingCoilParts.tsx`；主组件保留顶点计算 + 深度排序 + 组装 | 低 |
| 2 | `AnimationPage.tsx` | 526 | 1（`App.tsx` 路由） | 无 | 抽 `useFilteredParams()`（showIf/hideIf 过滤）、`useAnimationMode()`（resetParams 逻辑）。无埋点/监控/URL 同步。SidebarExtra 已删除，行数从 566 降至 526 | 低 |
| 3 | `RelationChart.tsx` | 516 | **30+（132 处）** | 无 | **仅做类型整理**：`RelationDataSeries`/`RelationMarker`/`RelationChartProps` → `RelationChart.types.ts`。`RCContent` 依赖 `ChartContext`，保留在组件文件中 | 低（仅类型迁移） |

**补充信息**：

- **依赖风险**：三个文件均无循环依赖。`AnimationPage` 仅路由懒加载；`RotatingCoil` 仅 1 消费者；`RelationChart` 通过 barrel export 隔离
- **DOM 依赖**：`RelationChart` → `BasePhysicsChart` 依赖 `useCanvasSize`（DOM 测量），但 `ChartContext` 和 `interpolateY` 均为纯函数/纯 Context
- **3D 依赖**：`RotatingCoil` 无 Three.js/R3F，3D 效果由父级 `project3D` 实现（纯 SVG 投影）
- **埋点/监控**：`AnimationPage` 无 analytics/tracking 代码，hook 拆分不影响外部行为
- **`parseHex`/`interpolateColor`**：仅 `RotatingCoil` 内部使用，无需提取为共享模块

**拆分注意事项**：

- 依赖方向单向：`types/utils → parts/hooks → component`，避免循环
- 无测试覆盖，重构后需人工视觉验证（动画状态、SVG 细节、图表边界数据）
- `RotatingCoil` 拆出部件后 props 不宜过长，保持编排层简洁
- `AnimationPage` hook 需有稳定输入输出和职责边界，避免复杂度从页面转移到 hook 层
- `RelationChart` 避免改变导出接口、行为和渲染结构，仅做纯机械类型迁移

---

## 二、响应式与颜色规范

### 2.1 响应式缩放（P1/P2）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| D | `useCanvasSize({ ... })` 硬编码 | 12 处 | 多数为合理例外，更新 allowlist 文档即可 |

---

## 三、代码质量

### 3.1 AnimationPage 协调职责监控（P2）

> 当前 526 行（2026-07-14 核对，SidebarExtra 删除后从 566 降至 526，仍超 500 行阈值）。触发拆分条件：行数 > 500，或存在物理计算与 JSX 混写，或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useAnimationMode()`。

### 3.2 其他（P3，暂缓）

| 条目 | 前提条件 |
|------|---------|
| `expandedNodes: string[]` → `Record<string, true>` | 当前 72 节点，远未达 500+ 阈值 |
| `WrongPage.renderCard` 提取 `React.memo` | `menuFor` 状态只影响单张卡，收益有限 |
| `RightPhysicsPanel` 计算逻辑抽取 | 可抽取独立 hook，优先级低 |
| `VectorFormulaPanel.tsx` 删除 | 已无任何导入引用（孤儿组件），候选删除 |

---

## 四、架构增强（P2/P3）

### 4.1 AnimationModule 统一模块规范（P2）

> 当前各动画注册方式分散在 registry 中，缺少统一的模块接口。SidebarExtra 已从代码库中完全删除。

建议定义：

```ts
export interface AnimationModule<P extends AnimationParams> {
  id: string
  title: string
  defaultParams: P
  Component: LazyAnimationComponent
  buildQuantities?: PhysicsQuantityBuilder<P>
}
```

目标：将组件、参数、面板、公式、测试聚合到同一 feature 模块附近，减少跨目录跳转。
注：`anim-vertical-circular` quantities 已补齐（复用 `precomputeVerticalCircularMotion`），当前 93/93 动画均有 quantities 注册。

### 4.2 viewModel 层 + 坐标类型（P2/P3）

> 当前 `physics → features` 之间缺少明确的视图模型层，坐标方向错误是教学动画最常见 bug。

建议：
- 为复杂动画建立 `model/viewModel.ts`，负责物理量 → **物理坐标**（y↑ 正），不含 SVG/Canvas/Viewport 依赖
- 考虑引入 `PhysicsY`、`SvgY`、`ChartY` 命名约束（至少在复杂模型中用函数名区分）
- 建立统一坐标约定文档

**viewModel 约束（铁律）**：
- viewModel 只返回物理坐标系数据，**禁止**引入 `vp.scale`、`vp.transform`、`visibleW`、`visibleH`、`physicsToCanvas` 或任何 SVG/Canvas 坐标
- `physicsToCanvas` 映射保留在 hook 层（`useXxxPhysics.ts`），使缩放、响应式布局和物理计算可独立演进
- 依赖方向：`viewModel → hooks`，不允许反向

**试点完成**：`useOrthogonalDecompositionPhysics` 已完成 viewModel 抽象
- 新建 `model/orthogonalDecompositionViewModel.ts`：纯函数 `computeOrthogonalDecomposition`，返回物理坐标系（y↑ 正）下的力分量、投影、斜面几何，零 React/DOM 依赖
- hook 层调用 viewModel 纯函数后再通过 `physicsToCanvas` 映射到 Canvas 坐标
- 新增 8 个 viewModel 单元测试（模式 0 力分量/投影/合力 + 模式 1 重力/支持力/摩擦力/斜面几何）
- 组件 `OrthogonalDecompositionAnimation.tsx` 零改动

**下一步**：复盘抽象是否真正降低坐标转换复杂度，再决定 `KeplerAnimation` 是否采用同一结构

### 4.2.1 力方向纯函数扩展（P2，进行中）

> 背景：复合场页面因 SVG/物理坐标系混淆导致力方向反转 bug（2026-07-10 修复）。
> 已在 `src/physics/magnetism/forces.ts` 新增 `lorentzForceDir` / `electricForceDir` / `centripetalForceDir` / `ampereForceDir` 四个纯函数，统一返回物理坐标系(y↑正)单位向量。

**扩展原则：触发性迁移，不专门为迁移而迁移**

每次修改某动画页面时，顺手把手写坐标差 / 电荷符号三元表达式替换为 helper 调用。新增 helper 按需补单测。

**待迁移目标**

| 优先级 | 领域 | 文件 | 风险点 |
|:---:|------|------|------|
| P2 | 电磁学·静电 | `ElectricFieldAdvancedScene.tsx` / `ThreeChargeMode.tsx` | 多电荷力方向 |
| P3 | 力学·圆周 | `CentripetalScene.tsx` / `VerticalCircularScene.tsx` | 向心力方向，已有 `centripetalForceDir` 可直接用 |
| P3 | 通用 | `gravityDir` | 重力方向（恒向下），收益小 |

**迁移检查清单（每次迁移一个页面时执行）**

1. grep 该文件内 `cy - .*\.y` / `\.y - cy` / `q > 0 \?` 模式
2. 替换为 helper 调用，SVG→物理坐标翻转以 `{ x, y: -y }` 显式内联
3. 跑 `tsc --noEmit` + 该领域相关测试
4. 视觉验证：正/负电荷各播放一次，确认箭头方向

### 4.3 viewModel 单测（P2）

> 当前测试覆盖 physics 和 utils，视图映射层缺少保护。试点已完成 8 个 viewModel 测试。

已覆盖：
- `computeOrthogonalDecomposition`：模式 0（力分量、旋转轴投影、合力求和、原点）+ 模式 1（重力、支持力、摩擦力、斜面几何）

待覆盖（后续 viewModel 迁移时同步补建）：
- 关键点坐标（A/B/C/D 标注位置）
- 图表 domain
- 游标位置
- 正负方向标注
- 极值点位置

### 4.4 Store selector 优化（搁置）

> 审计发现：217 处 useAnimationStore 调用中，88 处使用单属性 selector（安全），108 处使用解构 + `useShallow`（低风险），0 处裸调用。所有解构 selector 已通过 `useShallow` 防护。

**结论**：风险远低于预期。`time` 订阅已由 `AnimationCenter` 和 `AnimationRightPanel` 局部承接，静态 LeftPanel 不受 60fps 更新波及。仅在 React Profiler 证实存在可感知性能瓶颈时再处理。

**搁置理由**：
- 所有解构 selector 已用 `useShallow`，无需全局改造
- `AnimationPage` 主组件不订阅 `time`，子组件已隔离
- 无 Profiler 数据支撑"中等收益"判断
- 改造 88+ 处调用的工作量与收益不成比例

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

## 五、Viewport 架构迁移

> 合规标准：使用 `useAnimationViewport` from `@/hooks`

**不迁移**：CenterExtra / Chart / Sidebar / 子组件（如 MomentumScene、BohrOrbits 等）使用 useCanvasSize 属正常模式，由父级 useAnimationViewport 提供 vp。

**DEV 豁免**：`src/features/dev/` 目录为内部开发沙箱，无需迁移。

---

## 七、粒子轨迹统一渲染规则

**铁律 — 新增页面必须遵守**：

1. **带电粒子在电场/磁场中的偏转运动**（质谱仪、回旋加速器、电偏转、磁偏转、复合场等）→ 必须使用 `ParticleTrajectory`（SVG）或 `drawCanvasParticleTrajectory`（Canvas），禁止手写拖尾 + 球体
2. **力学直线运动**（自由落体、匀加速、竖直上抛等）→ 不需要轨迹组件，用 `Ball` 即可
3. **固定轨道几何**（圆周运动轨道、卫星轨道等）→ 不需要轨迹组件

**已知低风险问题**（P3，暂不修复）：
- SVG 版本体球位置有 ~1-4px 滞后（取采样点而非精确插值位置），Canvas 版无此问题
- SVG/Canvas 拖尾渐变视觉不一致，规范不要求统一
