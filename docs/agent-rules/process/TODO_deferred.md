# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-09-27（核对更新全仓数据、行数、已清理项与批次进展）

---

## 〇、架构背景

### 目标架构

```text
features/<domain>/<topic>/
├── XxxAnimation.tsx          # 薄编排层：参数读取 + 组合子组件
├── components/               # 局部 SVG 场景组件（纯渲染，无物理计算）
├── hooks/
│   └── useXxxPhysics.ts     # 物理计算 + 布局几何 + worldToDesign 映射（可独立单测）
├── model/
│   ├── types.ts
│   └── viewModel.ts          # 纯物理坐标计算（y↑ 正），不含 SVG/Canvas/Viewport 依赖
└── index.ts

src/physics/<domain>/<model>.ts  # 纯计算函数，无 React/DOM 依赖
```

依赖方向：`math → physics → viewModel → hooks → components → pages`

**viewModel 约束**：viewModel 只返回物理坐标系（y↑ 正）数据，**禁止**引入 `vp.scale`、`vp.transform`、`visibleW`、`visibleH`、`physicsToCanvas` 或任何 SVG/Canvas 坐标。坐标映射保留在 hook 层（`worldToDesign` / `physicsToDesignWithOrigin`），使缩放、响应式布局和物理计算可独立演进。

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

### 待处理（2026-09-27 核对）

**执行优先级**：RotatingCoil → AnimationPage → RelationChart（仅类型整理）

| # | 文件 | 当前行数 | 消费者 | 测试 | 拆分方案 | 风险 |
|:-:|------|-----:|--------|:---:|---------|:---:|
| 1 | `RotatingCoil.tsx` (`src/components/Physics/`) | 618 | 1（`ACGeneration.tsx`） | 无 | `render3DSlipRing`/`render3DBrush`/`renderBrushWires` → `rotatingCoilParts.tsx`；主组件保留顶点计算 + 深度排序 + 组装 | 低 |
| 2 | `AnimationPage.tsx` | 560 | 1（`App.tsx` 路由） | 无 | 抽 `useFilteredParams()`（showIf/hideIf 过滤）、`useAnimationMode()`（resetParams 逻辑）。无埋点/监控/URL 同步。SidebarExtra 已删除 | 低 |
| 3 | `RelationChart.tsx` | 561 | **30+（132 处）** | 无 | **仅做类型整理**：`RelationDataSeries`/`RelationMarker`/`RelationChartProps` → `RelationChart.types.ts`。`RCContent` 依赖 `ChartContext`，保留在组件文件中 | 低（仅类型迁移） |

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
| D | `useCanvasSize({ ... })` 硬编码 | 5 处 | 业务组件 3 处，工具默认值 2 处，均为合理例外 |

---

## 三、代码质量

### 3.1 AnimationPage 协调职责监控（P2）

> 当前 560 行（2026-09-27 核对，仍超 500 行阈值）。触发拆分条件：行数 > 500，或存在物理计算与 JSX 混写，或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useAnimationMode()`。

### 3.2 其他（P3，暂缓）

| 条目 | 前提条件 / 现状 |
|------|---------|
| `expandedNodes: string[]` → `Record<string, true>` | 当前 132 节点（组件内部已用 Set，Store 仍为 string[]，暂无性能瓶颈） |
| `WrongPage.renderCard` 提取 `React.memo` | `menuFor` 状态只影响单张卡，收益有限 |
| `RightPhysicsPanel` 计算逻辑抽取 | 可抽取独立 hook，优先级低 |
| `VectorFormulaPanel.tsx` 删除 | [x] 已彻底删除 |

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
注：`anim-vertical-circular` quantities 已补齐（复用 `precomputeVerticalCircularMotion`），当前 118/118 动画均有 quantities 注册。

### 4.2 viewModel 层 + 坐标类型（P2/P3）

> 当前 `physics → features` 之间缺少明确的视图模型层，坐标方向错误是教学动画最常见 bug。

建议：
- 为复杂动画建立 `model/viewModel.ts`，负责物理量 → **物理坐标**（y↑ 正），不含 SVG/Canvas/Viewport 依赖
- 考虑引入 `PhysicsY`、`SvgY`、`ChartY` 命名约束（至少在复杂模型中用函数名区分）
- 建立统一坐标约定文档

**viewModel 约束（铁律）**：
- viewModel 只返回物理坐标系数据，**禁止**引入 `vp.scale`、`vp.transform`、`visibleW`、`visibleH`、`physicsToCanvas` 或任何 SVG/Canvas 坐标
- 坐标映射保留在 hook 层（`worldToDesign` / `physicsToDesignWithOrigin`），使缩放、响应式布局和物理计算可独立演进
- 依赖方向：`viewModel → hooks`，不允许反向

**试点完成**：`useOrthogonalDecompositionPhysics` 已完成 viewModel 抽象
- 新建 `model/orthogonalDecompositionViewModel.ts`：纯函数 `computeOrthogonalDecomposition`，返回物理坐标系（y↑ 正）下的力分量、投影、斜面几何，零 React/DOM 依赖
- hook 层调用 viewModel 纯函数后再通过 `toCanvasPoint` 映射到设计坐标
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
| P2 | 电磁学·静电 | `src/features/electromagnetism/electrostatics/` (`ElectricFieldAdvancedScene.tsx` / `ThreeChargeMode.tsx`) | 多电荷力方向 |
| P3 | 力学·圆周 | `src/features/mechanics/circular/components/` (`CentripetalScene.tsx` / `VerticalCircularScene.tsx`) | 向心力方向，已有 `centripetalForceDir` 可直接用 |
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

**未接入标准路径的存量页面**（已全部清零，2026-07-15）：


---

## 六、VectorArrow 坐标体系清理

> 背景：Phase 6 迁移后 387 个 VectorArrow 实例全部使用 `originPixel`（设计坐标），但坐标空间语义不明确，导致多轮 bug 修复。根因：`originPixel` 命名误导 + 三套坐标空间无编译时防护。

### 6.1 箭头分类规范

**分类标准**：

| 类型 | 含义 | 使用方式 |
|------|------|---------|
| `physical-real` | 物理量矢量，需物理正确 | 优先使用 `PhysicsVectorArrow` + `origin` |
| `physical-schematic` | 物理量示意箭头，方向正确但长度不严格 | 保留 `originDesign`，禁用 `pixelLength` |
| `visual-only` | 纯视觉标注（UI 引导、方向提示） | 保留 `originDesign` + `pixelLength` |

**判定标准**：
- 使用 `origin`（物理坐标）→ `physical-real`
- 使用 sceneScale `refMagnitudes` 自动归一化 → `physical-real` 或 `physical-schematic`
- 使用 `pixelLength` 手动控制 → `physical-schematic` 或 `visual-only`
- `IDENTITY_SCENE_SCALE` + pixelLength → 大概率 `visual-only`
### 6.2 `originPixel` → `originDesign` 重命名规范（[x] 已完成闭环）

> **状态**：**已闭环（2026-09-26 实测）**。全仓存量 JSX 调用已全部迁移至 `originDesign`（0 处遗留），仅剩 `VectorArrow.tsx` 内部接口定义及 `@deprecated` alias，无需进一步迁移。

### 6.3 `PhysicsVectorArrow` 组件规范

**目标**：为 `physical-real` 类型箭头创建专用组件，强制物理坐标输入。

```tsx
<PhysicsVectorArrow
  origin={{ x: 物理坐标米, y: 物理坐标米 }}   // 物理坐标
  vector={{ x: 物理矢量, y: 物理矢量 }}         // 物理量（米/秒、牛顿等）
  sceneScale={...}                              // 物理→设计坐标转换
/>
```

**约束**：
- 禁止 `pixelLength`（长度必须通过 refMagnitudes 归一化）
- 禁止 `IDENTITY_SCENE_SCALE`

### 6.4 `pixelLength` → 动态 `refMagnitudes` 迁移规范

**核心策略**：`pixelLength` 绕过了 `maxVectorLength` 的上限保护，导致矢量可能溢出动画区域。动态 `refMagnitudes` 通过 `calculateVectorPixelLength` 归一化，确保 `ratio ≤ 1.0`。

**迁移模式**：
```ts
// 旧：手动控制长度
<VectorArrow vector={{ x: 1, y: 0 }} pixelLength={F * 2.5} />

// 新：物理矢量 + 动态 refMagnitudes
<PhysicsVectorArrow vector={{ x: F, y: 0 }} sceneScale={sceneScale} />
// sceneScale.refMagnitudes = { appliedForce: Math.max(F, 5) * 2 }
```

**保留 `pixelLength` 的合理场景**（非技术债）：
- 几何闭合图形（平行四边形/三角形/正交分解）：箭头尖端必须落在几何端点
- 受力分析等长力：高中物理教学中力图常用等长表示
- 速度分解 vx/vy：分量须与总量成比例维持闭合
- 非线性缩放（对数）：refMagnitudes 仅支持线性

### 6.5 防错位保障机制

1. **PhysicsVectorArrow 禁止 pixelLength**：强制走 refMagnitudes 归一化，从源头消除溢出
2. **动态 refMagnitudes 模式**：`Math.max(value, min) * 2` 确保 ratio ≈ 0.5，箭头可见且不溢出
3. **maxVectorLength 上限**：所有 PhysicsVectorArrow 的箭头长度被 `maxVectorLength` 钳位
4. **sceneScale.originX/Y**：移除 originDesign 覆盖后，sceneScale 的 origin 正确工作

### 6.6 Branded Coordinate Types

**文件**：`src/scene/coordinates.ts`

**Branded Types（5 个）**：
- `PhysicsCoord` / `DesignCoord` / `ContainerPixelCoord` — 位置点
- `PhysicsVector` / `DesignVector` — 方向矢量

**转换函数（5 个纯函数）**：
- `physicsToDesign` — 物理坐标→设计坐标（含 Y 翻转）
- `designToContainer` — 设计坐标→容器像素
- `containerToDesign` — 容器像素→设计坐标
- `physicsVectorToDesignVector` — 物理矢量→设计矢量
- `designVectorToPhysicsVector` — 设计矢量→物理矢量

**工厂函数（5 个）**：`asPhysicsCoord`、`asDesignCoord`、`asContainerPixelCoord`、`asPhysicsVector`、`asDesignVector`

**使用方式**：编译期类型防护，运行时零开销。现有代码可逐步迁移，不强制立即替换。

### 6.7 物理箭头单元测试覆盖要求

| 测试文件 | 覆盖内容 |
|---------|---------|
| `src/utils/__tests__/vectorLength.test.ts` | calculateVectorPixelLength 边界值、比例缩放、权重、溢出保护 |
| `src/scene/__tests__/SceneScale.test.ts` | createSceneScale、worldToPixel/Design、createSceneScaleFromDesignCenter |
| `src/scene/__tests__/coordinates.test.ts` | branded types 工厂函数、坐标转换、Y 轴翻转、round-trip、pipeline |

### 6.8 截图回归规范

**覆盖页面**（关键动画 + 专项测试）：
NewtonSecond、Velocity、SystemIsolated、OrbitTransfer、KinematicsAdvanced、Acceleration、SpringForce、Conveyor、InclinedPlane、CircularModels、BinaryStars

**运行方式**：
```bash
# 更新基准截图（首次或有意变更时）
npx playwright test --update-snapshots

# 回归测试（与基准对比）
npx playwright test
```

**容差策略**：物理动画有 60fps 动态效果（粒子、游标闪烁），允许约 6% 像素差异（`maxDiffPixels: 50000`）。超过此阈值视为异常（如箭头溢出、位置偏移）。

---

---

## 七、粒子轨迹统一渲染规则

**铁律 — 新增页面必须遵守**：

1. **带电粒子在电场/磁场中的偏转运动**（质谱仪、回旋加速器、电偏转、磁偏转、复合场等）→ 必须使用 `ParticleTrajectory`（SVG）或 `drawCanvasParticleTrajectory`（Canvas），禁止手写拖尾 + 球体
2. **力学直线运动**（自由落体、匀加速、竖直上抛等）→ 不需要轨迹组件，用 `Ball` 即可
3. **固定轨道几何**（圆周运动轨道、卫星轨道等）→ 不需要轨迹组件

**已知低风险问题**（P3，暂不修复）：
- SVG 版本体球位置有 ~1-4px 滞后（取采样点而非精确插值位置），Canvas 版无此问题
- SVG/Canvas 拖尾渐变视觉不一致，规范不要求统一

---

## 八、`<foreignObject>` 规范要求（[x] 已完成闭环）

> **状态**：**已闭环（2026-09-26 实测）**。全仓存量组件中 `<foreignObject>` 的实际 JSX 使用已全部清零（0 处存在），存量 11 个涉及画中画的动画已全部重构为 HTML flex 平级分区或 absolute 浮层架构，无需进一步修改。

### 验收标准

- [x] 所有 `<foreignObject>` 从 SVG 内移除（存量 11 个文件已全部合规）
- [x] 图表组件放在 HTML 层（flex 分区或 absolute 浮层）
- [x] 图表尺寸由容器 CSS 或 `useCanvasSize` 驱动，不依赖 SVG 坐标
- [x] TypeScript 0 errors + Vitest 全量通过
- [x] ESLint 0 errors 0 warnings 通过

---

## 九、内容补全待办（章节扩展 / 横向基座 / 实验专题 / 题库）

> **来源**：`physics-learning-内容补全建议-2026-09-22.md`（缺口基线）+ 2026-09-24 逐轮实测核对。
> **性质**：本章是**待完成计划**，不是完成记录。每完成一项把状态改为 `[x]`，并在 `PROCESS_LOG.md` / `logs/2026-Wxx.md` 写完成记录（含验证命令）。
> **总账（2026-09-27）**：16 个缺口考点**已完成 15 项**（批次 1、2、3 均闭环完成，批次 4 已完成薄膜干涉、相对论时空观及部分实验专题，动画数增至 118），P0 已全部完成。

### 9.1 缺口考点清单（16 项）

| # | 优先级 | 节点 ID | 建议标题 | 复用资产 | 状态 |
|:-:|:------:|---------|---------|---------|:----:|
| 1 | P0-1 | `electricity-6-1` | 电磁振荡（LC 振荡电路） | `CapacitorPlates` `CoilBase` `DialMeter` `EnergyBars` | [x] 已完成 |
| 2 | P0-1 | `electricity-6-2` | 麦克斯韦电磁场理论与电磁波 | 同上 + `VectorArrow` | [x] 已完成 |
| 3 | P0-1 | `electricity-6-3` | 电磁波谱与无线电波的发射与接收 | `useEMSpectrumLayout` | [x] 已完成 |
| 4 | **P0-5** | `electricity-5-5` | 电感与电容对交变电流的作用（感抗与容抗） | `CapacitorPlates` `CoilBase` `RotatingCoil` `DialMeter` `LightBulb` | [x] 已完成 |
| 5 | **P0-4** | `vibration-2-3` | 多普勒效应 | `vibration-oscillation` 波形绘制 + `VectorArrow` | [x] 已完成 |
| 6 | P1-1 | `electricity-4-8` | 自感与互感 | 并入自感动画 mode（禁止新起组件目录） | [x] 已完成 |
| 7 | P1-1 | `electricity-4-9` | 涡流、电磁阻尼与电磁驱动 | 并入 `electricity-4-8` 动画的 mode | [x] 已完成 |
| 8 | **P0-2** | `electricity-7-1` | 常见传感器及其工作原理（光敏/热敏/霍尔） | `Rheostat` `DialMeter` `Galvanometer` `LightBulb` `DCSource` + `dc-circuits` 拓扑 | [x] 已完成 |
| 9 | **P0-2** | `electricity-7-2` | 传感器的应用与自动控制 | 同上 | [x] 已完成 |
| 10 | **P0-3** | `vibration-1-3` | 受迫振动与共振 | `CharacteristicCurve` + `Spring` + `Ball` | [x] 已完成 |
| 11 | P1-2 | `thermodynamics-2-3` | 固体与液体（晶体/液晶/表面张力/浸润/毛细） | 分子点阵池 + `PhysicsVectorArrow` | [x] 已完成 |
| 12 | P1-3 | `thermodynamics-2-4` | 饱和汽与湿度 | `CharacteristicCurve` + 气液动态平衡两相池 | [x] 已完成 |
| 13 | P1-5 | `electricity-1-8` | 静电的防止与利用（静电感应/尖端放电/静电屏蔽） | `PhysicsVectorArrow` + 场线基座 | [x] 已完成 |
| 14 | P1-4 | `wave-optics-1-5` | 薄膜干涉与增透膜 | `wave-optics-1-1` 干涉骨架 | [x] 已完成 |
| 15 | P2 | `mechanics-6-6` | 相对论时空观与牛顿力学的局限性 | 双参考系光钟与动钟尺缩几何 | [x] 已完成 |
| 16 | P2 | `thermodynamics-3-3` | 能量守恒定律与能源 | 非计算章节 | [ ] 未开工 |
| — | P2 | `modern-1-2` 内扩 mode | 康普顿效应 | 作为光电效应动画的一个 mode，**不单列节点** | [x] 已完成 |
| — | P2 | `electricity-1-6` 内补 | 电势能 | 已在 `anim-electric-potential` 完整覆盖（含 $U_{AB}$、$\Delta E_p$、做功与路径无关） | [x] 已确认覆盖 |

**现状核对命令**（输出 `0` 即该节点尚不存在）：

```bash
for id in electricity-5-5 electricity-7-1 electricity-7-2 vibration-1-3 vibration-2-3 \
          electricity-4-8 electricity-4-9 thermodynamics-2-3 thermodynamics-2-4 \
          electricity-1-8 wave-optics-1-5 mechanics-6-6 thermodynamics-3-3; do
  printf "%-24s %s\n" "$id" "$(grep -rl "'$id'" src/data/knowledge/ | wc -l)"
done
```

**开放问题（动工前需定）**：① 固体与液体/饱和汽湿度是新起「热学 第4章」还是把现有「第2章 气体实验定律」改名；② 是否接受「一动画多节点」（`electricity-4-8/4-9` 共 mode）；③ 新增定性章节做到「现象演示级」还是「高考计算级」；④ 先补章节还是先补 2025 真题。

### 9.2 横向基座（P1，**必须先于节点铺开**）

> **缘由**：若先铺 20 个新节点再补基座，会得到 20 套互相不一致的实现，届时只能靠补丁互凑。建议**基座先行**。

| # | 基座 | 服务对象 | 现状 | 状态 |
|:-:|------|---------|------|:----:|
| 1 | `CharacteristicCurve`（通用特性曲线屏） | 传感器 R-光照/R-T、共振曲线、伏安特性曲线、`X_L(f)`/`X_C(f)`、LC 振荡曲线 | 已在 `src/components/Chart/` 实现并登记 | [x] 已完成 |
| 2 | `EnergyFlowBars`（能量转换柱扩展） | LC 振荡、电磁阻尼、热力学第一定律；由现有 `EnergyBars` 扩出「两库互相转换」模式 | 目前仅单组柱 `EnergyBars` | [ ] 未开工 |
| 3 | `ChainCircuitBuilder`（电路拓扑构建） | 传感器、感抗容抗、实验电路（**小灯泡伏安特性 `experiment-3-2` 前置核心依赖**） | 已在 `src/components/Physics/` 实现并登记 | [x] 已完成 |

> **落地约束**：三者需从 `src/components/Physics/index.ts`（或 `Chart/`）导出，并在 `COMPONENT_REGISTRY.md` 登记**与源码一致的完整 props 签名**（见 §10.6）。
> **核对命令**：`grep -rl "CharacteristicCurve\|EnergyFlowBars\|ChainCircuitBuilder" src/components src/features`（当前 0 命中）

### 9.3 实验专题扩展（9 个节点，P1，[x] 已全量闭环）

现状：`src/data/knowledge/experiment.ts` 已经构建完整的力学、电学、光学 11 个实验节点体系，严格复用既有高质量物理动画底座并补充打点纸带逐差法、光电门、测微目镜与伏安法电路决策。

| 建议节点 ID | 实验 | 复用资产 | 状态 |
|---|---|---|:---:|
| `experiment-1-1` | 力学实验基础与纸带/光电门分析 | `anim-mechanics-experiment-base` | [x] 已完成 |
| `experiment-2-1` | 探究加速度与力、质量的关系 | `anim-mechanics-experiment-base` 纸带逐差法与 a-F 图像 | [x] 已完成 |
| `experiment-2-2` | 验证机械能守恒定律 | `anim-mechanics-experiment-base` 自由落体打点纸带 + `anim-free-fall` | [x] 已完成 |
| `experiment-2-3` | 验证动量守恒定律 | `anim-momentum-conservation` | [x] 已完成 |
| `experiment-2-4` | 用单摆测重力加速度 | `anim-simple-pendulum` 骨架 + `LabRuler` | [x] 已完成 |
| `experiment-1-2` | 电学实验基础（测定电源电动势与内阻） | `anim-experiment-er` | [x] 已完成 |
| **`experiment-3-1`** | **测量金属丝的电阻率** | **`Micrometer`（螺旋测微器）** + `VernierCaliper` | [x] 已完成 |
| `experiment-3-2` | 描绘小灯泡的伏安特性曲线 | `ChainCircuitBuilder` + `Rheostat` `DialMeter` `LightBulb` | [x] 已完成 |
| `experiment-3-5` | 多用电表的使用与内部原理 | `DialMeter`、大表盘、元器件台 Overlay | [x] 已完成 |
| `experiment-3-3` | 测定玻璃的折射率 | `anim-refraction` 双界面并进与侧移插针法 | [x] 已完成 |
| `experiment-3-4` | 用双缝干涉测光的波长 | `anim-double-slit-interference` 条纹间距 Δx=(L/d)λ 测微目镜 | [x] 已完成 |

> **教学有效性硬要求**：每个实验动画均带「**数据分析屏**」（图像斜率/截距 ↔ 物理量的对应关系），紧扣高考**误差来源 + 数据处理 + 电路/仪器决策**核心考点。

### 9.4 题库时效性（P1）

- 现有题库带 `year:` 的真题共 **46** 题（实测：2021:7 / 2022:11 / 2023:19 / 2024:9）；`year: 2025` **0 条**。
- [ ] 补 2025 年真题 8–15 道，**优先覆盖本次新增章节**（LC 振荡 / 传感器 / 多普勒 / 受迫振动 / 实验专题），避免"有动画没题"。
- [ ] 补 2025 年代表性模拟题（河南/湖南/江苏/云南等卷）中上述章节的选择题。

### 9.5 施工批次建议

| 批次 | 内容 | 理由 |
|---|---|---|
| 批次 1（剩余） | `electricity-5-5`、`vibration-2-3` | 考点最热 + 复用度最高 + 无既有语义冲突 | [x] 已完成 |
| 批次 2 | `electricity-4-8/4-9`、`electricity-7-1/7-2` | 需先确认与既有 induction 动画控制项不冲突 | [x] 已完成 |
| 批次 3 | `vibration-1-3`、`thermodynamics-2-3/2-4`、`electricity-1-8` | 需新组件，工作量中等 | [x] 已完成 |
| 批次 4 | `wave-optics-1-5`、`mechanics-6-6`、实验专题扩展、2025 真题 | `wave-optics-1-5`、`mechanics-6-6` 与实验专题 11 个节点已全量闭环，余 2025 真题 | [进行中] 实验已全量完成 |

**每批次收尾必跑**：`tsc -b` / `eslint . --max-warnings 0` / `vitest run` / 6 个守门脚本（`npm run check:architecture`）/ 知识树↔注册表一致性（0 悬空 0 孤儿）。
**每个新动画必须带**：≥1 个带数值断言的单测（方向/符号类错误只有数值断言能拦）。

---

## 十、页面审查遗留技术债（`em-oscillation` 模块）

> **来源**：2026-09-24 六轮审查（报告《physics-learning-页面优化高中物理符合性审查-2026-09-24》§1–§14）尚未闭环项。
> **已闭环、不再列入**：P0-A/P0-B、P1-4/P1-6/P1-7、P2-5~P2-10、P3-6/P3-8/P3-11/P3-13、组件登记表 14 行 props 校正、`Spring` 组件归位、第 6 条守门脚本 `check-component-reuse`。

### 10.1 E/B 表观相位差仍正比于频率（P1，[x] 已闭环）

- **位置**：`src/features/electromagnetism/em-oscillation/components/EMWaveScene.tsx`
- **解决方案**：采纳 (b) 方案：保留经典教材三维斜投影透视几何（$B$ 轴倾角约 124° 恒定，绝不人工缩减 $\Delta x$ 导致 $B$ 轴向竖直塌缩而破坏垂直正交表达）；修复原点 B 轴标签与轴线尖端完全对齐；保留 100~1000 MHz 完整探索频段；通过中轴公共锚点、波峰波谷贯通虚线与左屏教学提示（说明 B 波峰相对 E 波峰的水平错位系斜投影透视效果，虚线贯通指示空间同一波阵面截面），客观自洽闭环。
- [x] **已完成闭环（2026-09-27）**

### 10.2 双实现与判据分裂（P1/P2）

| # | 问题 | 位置 | 状态 |
|:-:|------|------|:----:|
| 1 | `SolenoidFieldLines` 与 `CoupledCoilField` 贝塞尔磁感线与衰减逻辑独立实现 | `src/components/Physics/SolenoidFieldLines.tsx` / `CoupledCoilField.tsx` | [ ] 待后续视需要抽取基座 |
| 2 | 右手定则 N/S 判据双实现 | `CoilBase.tsx`、`SolenoidFieldLines.tsx` | [x] **已闭环**：抽取纯函数 `getCoilPolarity` 并点明线圈绕向约定，统一收敛并补齐单测 |

### 10.3 物理层零截断阈值不统一（P3，[x] 已闭环）

- **位置**：`src/physics/lcOscillation.ts`、`quantities/emOscillation.ts`、`EMOscillationCenterExtra.tsx`
- **解决方案**：分层定义导出常量：`LC_PHYSICS_EPSILON = 1e-12`（物理计算浮点残差截断，兼容微库仑/微法量级）、`LC_ENERGY_EPSILON = 1e-14`（二次项能量截断）、`LC_DISPLAY_ENERGY_EPSILON = 1e-4`（高中测量精度能量显示截断）。全链路阈值字面量 12 处（`lcOscillation.ts` 7 处、`quantities/emOscillation.ts` 3 处、`EMOscillationCenterExtra.tsx` 2 处）以及 `useLCPhysics.ts` 3 处默认值兜底，均已改为引用上述导出常量或 `LC_DEFAULT_PARAMS`；余下仅 JSDoc 注释中的数值说明。
- [x] **已完成闭环（2026-09-27）**

### 10.4 LC 默认参数偏慢（P3，[x] 已闭环）

- **位置**：`src/physics/lcOscillation.ts`（导出 `LC_DEFAULT_PARAMS` 单一真源）
- **解决方案**：将默认参数调优为 $L = 0.4\text{ H}, C = 0.4\text{ F} \implies T \approx 2.51\text{ s}$；registry、quantities、Animation 薄壳、CenterExtra 全部收敛引用 `LC_DEFAULT_PARAMS`，4 份拷贝完全收敛。
- [x] **已完成闭环（2026-09-27）**

### 10.5 守门脚本粒度不足（P1，规范层，[x] 已闭环）

- **现象**：原先仅做组件名字符串匹配，无法防止 props 漂移；且正则跳过了 `extends` 接口。
- **解决方案**：在 `scripts/check-component-reuse.mjs` 中实现支持 `extends`、interface 别名、复合登记行与大括号嵌套消解的深度双向 Props 校验算法。覆盖率实测：`src/components/Physics` 下 47 个具名组件全部进入校验流程，其中 44 个解析到接口签名并逐字段比对（0 跳过），另 3 行以 `—` 标注为无必填 props 免检；正向校验必填属性是否登记，反向校验 registry 是否登记了源码不存在的属性（幽灵属性）。
- [x] **已完成闭环（2026-09-27）**

### 10.6 组件登记表 props 漂移风险（P1，规范层，[x] 已闭环）

- **状态**：已由 §10.5 守门脚本自动拦截保障，与 CI 门禁彻底闭环。
- [x] **已完成闭环（2026-09-27）**

