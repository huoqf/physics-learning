# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-19（`originDesign` 物理坐标误用修复 9 文件 + API 互斥化重新评估判定暂不执行 + `<foreignObject>` 规范违规清理完成 + VectorArrow 坐标体系清理 Phase 7-9 完成 + 项目规范同步更新 + 存量页面 VIEWPORT 迁移完成）

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

**未接入标准路径的存量页面**（已全部清零，2026-07-15）：
- ~~`ElectricPotential`：hook 内局部 `physicsToCanvas` 命名混淆；渲染原始 `<svg>` 未用 `AnimationSvgCanvas`~~ → ✅ hook 输出设计坐标 + `AnimationSvgCanvas` + `vp.transform` + `useViewportPointer`
- ~~`ProjectileAnimation`：使用 `physicsToDesignWithOrigin` 但未用 `<g transform={vp.transform}>`~~ → ✅ `AnimationSvgCanvas` + `vp.transform`，移除手动 viewport 计算

---

## 六、VectorArrow 坐标体系清理

> 背景：Phase 6 迁移后 387 个 VectorArrow 实例全部使用 `originPixel`（设计坐标），但坐标空间语义不明确，导致多轮 bug 修复。根因：`originPixel` 命名误导 + 三套坐标空间无编译时防护。

### 6.1 已完成

| 日期 | 内容 | 状态 |
|------|------|:----:|
| 2026-07-14 | NewtonSecondAnimation 溢出修复：移除 velocity/acceleration 的 pixelLength，改用动态 refMagnitudes + maxVectorLength=120 | ✅ |
| 2026-07-14 | VelocityAnimation 修复：refMagnitudes 添加 averageVelocity | ✅ |
| 2026-07-14 | Phase 1：originPixel → originDesign 重命名（356 处，保留 deprecated alias） | ✅ |
| 2026-07-14 | Phase 2：全量箭头分类标注（371 实例：physical-real 182, physical-schematic 124, visual-only 60） | ✅ |
| 2026-07-14 | Phase 3：PhysicsVectorArrow 组件创建 + 182 个 physical-real 实例迁移 | ✅ |
| 2026-07-14 | Phase 4：12 个页面约 45 个 physical-schematic 实例迁移到 PhysicsVectorArrow + 动态 refMagnitudes | ✅ |
| 2026-07-14 | Phase 5：物理箭头单元测试（36 个测试） | ✅ |
| 2026-07-14 | Phase 6：Playwright 截图回归（14 项） | ✅ |
| 2026-07-14 | Phase 7：Branded Coordinate Types（5 个 branded type + 5 个转换函数） | ✅ |
| 2026-07-15 | Phase 8：physicsToCanvas 外部导入清理（11 个文件迁移） | ✅ |
| 2026-07-15 | Phase 9：项目规范同步更新（8 个文件 12 处编辑） | ✅ |
| 2026-07-15 | Phase 10：存量页面 VIEWPORT 迁移（ElectricPotential + ProjectileAnimation） | ✅ |

### 6.1.1 Phase 4 迁移详情

**已迁移的页面**（移除 pixelLength，改用动态 refMagnitudes + PhysicsVectorArrow）：

| 页面 | 模块 | 迁移数 | 模式 |
|------|------|:------:|------|
| NewtonSecondAnimation | 力学-动力学 | 5 | B类线性：F/f/G/FN/F_net → 物理矢量 + 动态 refMag |
| PowerScene | 力学-能量 | 3 | C类夹住上限 |
| WorkAnimation | 力学-能量 | 5 | C类夹住上限 |
| ValleyScene | 力学-能量 | 4 | C类夹住上限 |
| PendulumScene | 力学-能量 | 3 | C类夹住上限 |
| SpringCompositeAnimation | 力学-能量 | 5 | C类夹住上限 |
| BlockBoardAnimation | 力学-动力学 | 8 | B类线性 |
| InclinedPlaneAnimation | 力学-动力学 | 3 | B类线性 |
| ConnectedBodiesAnimation | 力学-动力学 | 5 | B类+部分A类固定值 |
| BinaryStarsAnimation | 力学-万有引力 | 5 | B类（velocity）；A类固定值保留 |
| SingleRodAnimation | 电磁学-感应 | 4 | C类夹住上限 |
| CircularModelsAnimation | 力学-圆周 | 6 | C类夹住上限 |

**保留 pixelLength 的页面**（合理设计，非技术债）：

| 类别 | 实例数 | 原因 |
|------|:------:|------|
| A 固定值 | 14 | 受力分析等长力、方向示意 |
| D 几何距离 | 42 | 平行四边形/三角形/正交分解图闭合 |
| E 参数传入 | 2 | 通用渲染函数参数 |
| F 速度分解 | 9 | vx/vy 须与 v 成比例维持闭合 |
| GravityAnimation 对数 | 2 | 非线性缩放 |

### 6.2 Phase 1：originPixel → originDesign 重命名（P1，可立即做）

**目标**：消除命名歧义，`originPixel` → `originDesign`，保留 deprecated alias。

**范围**：
- `VectorArrow.tsx`：接口重命名 + alias
- 358 处 JSX 调用：批量替换 prop 名
- `renderVectorArrow.tsx`：同步更新
- `renderSceneVector.tsx`：同步更新

**风险**：低。纯重命名，不改变运行时行为。

**步骤**：
1. `VectorArrow.tsx` 接口：`originPixel` → `originDesign`，保留 `/** @deprecated Use originDesign */` alias
2. 全局搜索替换 `<VectorArrow` 内 `originPixel` → `originDesign`
3. 更新 `renderVectorArrow.tsx`、`renderSceneVector.tsx` 等辅助函数
4. `tsc --noEmit` + `npm test`

### 6.3 Phase 2：全量箭头分类（P2）✅

> 已于 2026-07-14 完成。371 个 VectorArrow 实例已标注 `arrowType`。

**分类结果**：

| 类型 | 数量 | 含义 | 迁移方向 |
|------|:----:|------|---------|
| `physical-real` | 182 | 物理量矢量，需物理正确 | 保留，后续可迁移到 PhysicsVectorArrow |
| `physical-schematic` | 124 | 物理量示意箭头，方向正确但长度不严格 | 保留 originDesign，但禁用 pixelLength |
| `visual-only` | 60 | 纯视觉标注（UI 引导、方向提示） | 保留 originDesign + pixelLength |

**分类标准**：
- 使用 `origin`（物理坐标）→ `physical-real`（当前仅 2 文件 42 实例）
- 使用 sceneScale refMagnitudes 自动归一化 → `physical-real` 或 `physical-schematic`
- 使用 `pixelLength` 手动控制 → `physical-schematic` 或 `visual-only`
- `IDENTITY_SCENE_SCALE` + pixelLength → 大概率 `visual-only`

### 6.4 Phase 3：PhysicsVectorArrow 组件（P3）

**目标**：为 `physical-real` 类型箭头创建专用组件，强制物理坐标输入。

```tsx
<PhysicsVectorArrow
  quantity="force"  // force | velocity | acceleration | current | field
  originPhysics={...}   // 物理坐标（米）
  vectorPhysics={...}   // 物理矢量（米/秒、牛顿等）
  sceneScale={...}      // 物理→设计坐标转换
/>
```

**约束**：
- 禁止 `pixelLength`（长度必须通过 refMagnitudes 归一化）
- 禁止 `originDesign`（起点必须来自物理模型）
- 禁止 `IDENTITY_SCENE_SCALE`

**范围**：仅迁移 `physical-real` 类型（~42 个 `origin` 实例 + 部分 refMagnitudes 自动归一化实例）

### 6.5 Phase 4：physical-schematic pixelLength 清理 ✅

> 已于 2026-07-14 完成。详见 6.1.1。

**核心策略**：`pixelLength` → 动态 `refMagnitudes`

`pixelLength` 绕过了 `maxVectorLength` 的上限保护，导致矢量可能溢出动画区域。动态 `refMagnitudes` 通过 `calculateVectorPixelLength` 归一化，确保 `ratio ≤ 1.0`，箭头长度始终在 `maxVectorLength` 内。

**迁移模式**：
```ts
// 旧：手动控制长度
<VectorArrow vector={{ x: 1, y: 0 }} pixelLength={F * 2.5} />

// 新：物理矢量 + 动态 refMagnitudes
<PhysicsVectorArrow vector={{ x: F, y: 0 }} sceneScale={sceneScale} />
// sceneScale.refMagnitudes = { appliedForce: Math.max(F, 5) * 2 }
```

**不可迁移的 69 个实例**（保留 pixelLength 是合理设计，非技术债）：
- A 固定值 14 个：受力分析等长力
- D 几何距离 42 个：平行四边形/三角形闭合
- E 参数传入 2 个：通用渲染函数
- F 速度分解 9 个：分量须与总量成比例
- GravityAnimation 对数 2 个：非线性缩放

### 6.6 physical-schematic 优化评估

**错位根因分析**：

| 错位类型 | 根因 | 解决方案 |
|---------|------|---------|
| 矢量起点偏移 | originPixel 覆盖 sceneScale.originX/Y | Phase 1 已解决（originDesign 语义明确） |
| 矢量长度溢出 | pixelLength 绕过 maxVectorLength | Phase 4 已解决（动态 refMagnitudes） |
| 几何图形不闭合 | D 类 pixelLength 值与端点距离不匹配 | 保持 pixelLength（设计意图） |
| 速度分解不闭合 | F 类 vx/vy 比例与 refMagnitudes 归一化冲突 | 保持 pixelLength（设计意图） |
| 双重缩放 | originDesign 在 `<g scale>` 内重复缩放 | Phase 1 代码审查已修复 |

**防错位保障机制**：

1. **PhysicsVectorArrow 禁止 pixelLength**：强制走 refMagnitudes 归一化，从源头消除溢出
2. **动态 refMagnitudes 模式**：`Math.max(value, min) * 2` 确保 ratio ≈ 0.5，箭头可见且不溢出
3. **maxVectorLength 上限**：所有 PhysicsVectorArrow 的箭头长度被 `maxVectorLength` 钳位
4. **sceneScale.originX/Y**：移除 originDesign 覆盖后，sceneScale 的 origin 正确工作

### 6.6.1 Branded Coordinate Types（Phase 7）✅

**已完成 2026-07-14。**

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

### 6.7 Phase 5：物理箭头单元测试（P3）✅

**已完成 2026-07-14。**

| 测试文件 | 覆盖内容 | 测试数 |
|---------|---------|:------:|
| `src/utils/__tests__/vectorLength.test.ts` | calculateVectorPixelLength 边界值、比例缩放、权重、溢出保护 | 12 |
| `src/scene/__tests__/SceneScale.test.ts` | createSceneScale、worldToPixel/Design、createSceneScaleFromDesignCenter | 10 |
| `src/scene/__tests__/coordinates.test.ts` | branded types 工厂函数、坐标转换、Y 轴翻转、round-trip、pipeline | 14 |

### 6.8 Phase 6：截图回归（P4）✅

**已完成 2026-07-14。**

| 项目 | 状态 |
|------|:----:|
| Playwright 安装 | ✅ |
| 配置 playwright.config.ts | ✅ |
| 14 个关键页面基准截图 | ✅ |
| 回归测试通过 | ✅ |

**覆盖页面**（11 个关键动画 + 3 个专项测试）：
NewtonSecond、Velocity、SystemIsolated、OrbitTransfer、KinematicsAdvanced、Acceleration、SpringForce、Conveyor、InclinedPlane、CircularModels、BinaryStars

**运行方式**：
```bash
# 更新基准截图（首次或有意变更时）
npx playwright test --update-snapshots

# 回归测试（与基准对比）
npx playwright test
```

**容差策略**：物理动画有 60fps 动态效果（粒子、游标闪烁），允许约 6% 像素差异（`maxDiffPixels: 50000`）。超过此阈值视为异常（如箭头溢出、位置偏移）。

### 6.9 Phase 7：Branded Coordinate Types（P4）✅

**已完成 2026-07-14。**

详见 §6.6.1。

### 6.10 Phase 8：physicsToCanvas 外部导入清理（P1）✅

**已完成 2026-07-15。**

| 内容 | 状态 |
|------|:----:|
| `src/features` 中 `physicsToCanvasWithOrigin` 导入清零（11 个文件迁移） | ✅ |
| `src/components`、`src/pages` 中无 `physicsToCanvas` 导入 | ✅ |
| `coordinate.ts` 旧函数 `physicsToCanvasWithOrigin` 标记 `@deprecated` | ✅ |
| 新增 `physicsToDesignWithOrigin`（输出设计坐标，适用于 `<g transform={vp.transform}>`） | ✅ |

**已迁移的文件**：

| 文件 | 迁移方式 |
|------|---------|
| `SimplePendulumAnimation` | `originDesign` 误用物理坐标 → 改用 `origin` |
| `CurvedSlotAnimation` | 同上 |
| `BlockBoardAnimation` | 移除 `physicsToCanvasWithOrigin`，改为直接计算 |
| `useMomentumConservationPhysics` + `MomentumConservationAnimation` | 移除旧转换函数，`groundY` 改为设计坐标 |
| `useDualRodsPhysics` | 移除旧转换函数 |
| `LoopPassFieldScene` | 移除旧转换函数 |
| `useForceMotionSandbox` | 移除旧转换函数 |
| `useVectorAdditionPhysics` | 移除 `physicsToCanvas`，改为内部 `toCanvasPoint` |
| `useOrthogonalDecompositionPhysics` | 同上 |
| `GravityAnimation` | 移除 `physicsToCanvas`，改为直接计算 |
| `EnergyConservationAnimation` / `ObliqueThrowAnimation` / `ProjectileAnimation` | 改用 `physicsToDesignWithOrigin` |

### 6.11 Phase 9：项目规范同步更新（P1）✅

**已完成 2026-07-15。**

| 文件 | 修改内容 |
|------|---------|
| `project_rules.md:60` | 铁律 1.2 坐标转换：`physicsToCanvas` → `worldToDesign` 为新标准 |
| `07_CANVAS_SVG_CHART_RULES.md` | §5.1 坐标分层表、§5.3 推荐做法、§9 禁止项、场景缩放选型、方式C标注、布局策略表、魔法数字表、maxVectorLength 示例 |
| `ARCHITECTURE_RULES.md:244` | `createSceneScaleFromViewport` 标注 deprecated 模式 |
| `CHECKLIST.md:22-24` | 提交检查项更新为新标准路径 |
| `TEMPLATE_FULL_ANIMATION_PAGE.md:168` | `originPixel` → `originDesign` |
| `analysis_6_1_scene_templates.md:191` | `originPixel` → `originDesign` |

### 6.12 已知问题（已修复）

| 日期 | 文件 | 问题 | 修复 |
|------|------|------|------|
| 2026-07-14 | NewtonSecondAnimation | velocity/acceleration pixelLength 溢出（最坏 800px） | 移除 pixelLength，改用动态 refMagnitudes |
| 2026-07-14 | VelocityAnimation | averageVelocity 缺失 refMagnitude，箭头始终 14px | 添加 averageVelocity refMagnitude |
| 2026-07-14 | BulletBlockScene | originPixel 使用物理坐标 | 改为设计坐标 |
| 2026-07-14 | OrbitTransferAnimation | originPixel 覆盖 sceneScale origin | 改回 origin（物理坐标） |
| 2026-07-14 | renderVectorArrow | originPixel={{x:0,y:0}} 覆盖 sceneScale origin | 移除 originPixel |
| 2026-07-19 | `BinaryStarsAnimation` / `SatelliteAnimation` / `ManBoatAnimation` / `SpringBlocksAnimation` / `VerticalCircularScene` / `CentripetalScene` | `originDesign` 误传入物理坐标，矢量起点严重偏离物体 | `originDesign` → `origin`，经 sceneScale 转换后与物体位置一致 |
| 2026-07-19 | `MomentumConservationAnimation`（基础模式）/ `CollisionBasicScene` / `CollisionAdvancedScene` | `originDesign` y 坐标错误（`R_A * 2 + 10`，球体上方），矢量起点偏离球心 | `originDesign` 修正为正确设计坐标值 `groundY - R_A`，指向球心 |

### 6.13 剩余技术债（已全部清零）

| 页面 | 问题 | 状态 |
|------|------|:----:|
| `ElectricPotential` | hook 内局部 `physicsToCanvas` 命名混淆；渲染原始 `<svg>` 未用 `AnimationSvgCanvas` | ✅ |
| `ProjectileAnimation` | 使用 `physicsToDesignWithOrigin` 但未用 `<g transform={vp.transform}>` | ✅ |

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

## 八、`<foreignObject>` 规范违规清理 ✅

> **已完成 2026-07-15。**
>
> 背景：`project_rules.md:82` 铁律 —「严禁在 SVG 内用 `<foreignObject>` 嵌入响应式 React 图表组件（两套缩放叠加导致图表 X 轴消失）；需动画+图表并列时须在 HTML 层 `flex` 分区，两者平级而非嵌套。」
>
> 11 个文件共 14 处 `<foreignObject>` 已全部从 SVG 内移除，图表组件迁移至 HTML 层（flex 分区或 absolute 浮层）。

### 规范要求

| 规则 | 来源 |
|------|------|
| 图表严禁 `<foreignObject>` | `07_CANVAS_SVG_CHART_RULES.md:263` |
| 严禁 SVG 内用 `<foreignObject>` 嵌入响应式 React 图表 | `project_rules.md:82` |
| 正确做法：HTML `flex` 容器内 SVG 场景与图表 `div` **平级并列** | `07_CANVAS_SVG_CHART_RULES.md:423-442` |

### 违规清单（11 个文件，14 处 `<foreignObject>`）

**高优先级 — 标准图表面板（6 个文件）**：

| # | 文件 | 行号 | 嵌入内容 | 迁移方案 |
|:-:|------|:----:|---------|---------|
| 1 | `ProjectileAnimation.tsx` | 453 | `VelocityTimeChart` 画中画 | 移到 HTML absolute 浮层，跟随 SVG 容器定位 |
| 2 | `ObliqueThrowAnimation.tsx` | 398 | `VelocityTimeChart` 画中画 | 同上 |
| 3 | `GravityAnimation.tsx` | 452 | `RelationChart` 画中画 | 同上 |
| 4 | `SatelliteAnimation.tsx` | 297, 372 | `RelationChart` + `VelocityTimeChart` | 同上 |
| 5 | `MomentumScene.tsx` | 194 | `RelationChart` 画中画 | 同上 |
| 6 | `ACGeneration.tsx` | 405 | 图表面板 | HTML flex 分区或 absolute 浮层 |

**中优先级 — 专用图表面板（4 个文件）**：

| # | 文件 | 行号 | 嵌入内容 | 迁移方案 |
|:-:|------|:----:|---------|---------|
| 7 | `WorkVTChart.tsx` | 41 | v-t 图表 | 改为 HTML 层独立组件，父级 flex 布局 |
| 8 | `VerticalThrowCharts.tsx` | 37, 47 | v-t + y-t 图表 | 同上 |
| 9 | `EnergyTimeChart.tsx` | 22, 37 | 能量图表 | 同上 |
| 10 | `FaradayChartPanel.tsx` | 167 | 法拉第图表面板 | 同上 |

**低优先级 — 内容卡片（1 个文件）**：

| # | 文件 | 行号 | 嵌入内容 | 迁移方案 |
|:-:|------|:----:|---------|---------|
| 11 | `ForceDecompositionCard.tsx` | 153 | 力分解说明卡片 | 判断：跟随坐标 → SVG 原生；纯说明 → HTML overlay |

### 已合规页面（无需处理）

`EnergyConservationAnimation`、`SimpleHarmonicAnimation`、`ThinLensAnimation`、`ClapeyronAnimation`、`GasLawsAnimation`、`LightRodRopeAnimation` — 注释明确标注"无 foreignObject"，使用 HTML flex 分区或 absolute 浮层。

### 迁移模式

```tsx
// ❌ 当前：foreignObject 嵌入 SVG
<svg width={w} height={h}>
  <g transform={vp.transform}>{/* 场景 */}</g>
  <foreignObject x={chartX} y={chartY} width={chartW} height={chartH}>
    <VelocityTimeChart ... />
  </foreignObject>
</svg>

// ✅ 目标：HTML 层 absolute 浮层
<div ref={containerRef} className="w-full h-full relative">
  <AnimationSvgCanvas transform={vp.transform}>
    {/* 场景 */}
  </AnimationSvgCanvas>
  <div className="absolute right-2 top-2" style={{ width: chartW, height: chartH }}>
    <VelocityTimeChart ... />
  </div>
</div>
```

### 验收标准

- [x] 所有 `<foreignObject>` 从 SVG 内移除（11 个文件，14 处）
- [x] 图表组件放在 HTML 层（flex 分区或 absolute 浮层）
- [x] 图表尺寸由容器 CSS 或 `useCanvasSize` 驱动，不依赖 SVG 坐标
- [x] TypeScript 0 errors + Vitest 701 tests 全量通过
- [x] ESLint 0 errors 0 warnings 通过
