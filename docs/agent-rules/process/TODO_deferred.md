# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-08（第六节 Viewport 存量违规 5 个文件全部迁移完成；splitV/splitH 标准替换类 8 个文件迁移完成；审计报告二次审计：11 个缺陷全部清零）

---

## 〇、架构背景

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

### 待处理

| 文件 | 当前行数 | 已有 physics | 拆分方向 | 目标行数 |
|------|-----:|:---:|---------|-----:|
| `SpringCompositeAnimation.tsx` | 585 | 无 hook；已用 `src/physics/verticalSpring` | 抽 `useSpringCompositePhysics` hook + `SpringPhysicalScene` 组件 | ~150 |
| `TIRAnimation.tsx` | 564 | 无 hook；已用 `src/physics/optics`（3 函数） | 抽 `useTIRPhysics` hook + `SingleBeamMode` / `PointSourceMode` 组件；SVG 工具函数去重（`arrowHeadPoints` 与 RefractionAnimation 重复） | ~80 |
| `FieldLines.tsx` | 559 | 无 hook；**自定义 `electricField`/`potential` 与 `src/physics/electrostatics` 重复** | 纯函数迁入 `src/physics/fieldLines.ts` + 抽 `useFieldLinesPhysics` hook（4 个 useMemo） | ~200 |
| `ConnectedBodiesAnimation.tsx` | 557 | 无 hook；已用 `src/physics/dynamics/connected-body`（2 函数） | 抽 `useConnectedBodiesPhysics` hook + `MassBlock` / `ConnectionElement` / `ForceVectorGroup` 组件 | ~100 |
| `LenzsLawCanvas.tsx` | 542 | 已有 `useLenzsLaw` hook | 拆子组件：`GalvanometerWiring` / `FluxChangePanel` / `StatusMonitorPanel` / `HandRulePanel` / `DraggableMagnet`；视觉缩放公式移入 hook | ~120 |
| `InclineForceDiagram.tsx` | 539 | 无 hook；无 `src/physics` 导入（力分解全部内联） | 抽 `useInclineForceLayout` hook + `InclineSlopeBackground` / `OrthogonalDecompositionOverlay` / `InclineForceVectors` 组件；`projectForce`/`F_max` 提取为共享工具（`ForcePolygon` 重复） | ~120 |
| `GravityBasicAnimation.tsx` | 519 | 无 hook；`src/physics/dynamics` 有 `calculateEarthGravity` 但**未复用** | 复用 `calculateEarthGravity` + 抽 `useSuspendedPlatePhysics` hook；拆 `EarthGravityScene` / `SuspendedPlateScene` 组件（两个 mode 完全独立） | ~60 |
| `CircularMotionAnimation.tsx` | 506 | 无 hook；已用 `src/physics/kinematics/formulas`（`calculateCircularMotion`） | 抽 `useCircularMotionPhysics` hook + `CircularMotionScene` / `SHMWaveCard` 组件（对齐 `CentripetalAnimation` 已有架构） | ~40 |

> 临近阈值（450-499）：`LightRodRopeScene.tsx`(485)、`SimulationView.tsx`(478)、`WorkFSChart.tsx`(469)、`RefractionAnimation.tsx`(462)、`AccelerationCenterExtra.tsx`(462)、`GravityAnimation.tsx`(459)、`ImpulseAnimation.tsx`(457)、`UniformAccelerationAnimation.tsx`(455)
>
> 已拆分：`PowerTransmission.tsx`(696→256)、`KeplerAnimation.tsx`(673→460)、`FreeFallDripAnimation.tsx`(560→448)、`CoulombLaw.tsx`(708→28+290+288，含物理函数抽离至 `src/physics/electrostatics.ts`)

---

## 二、响应式与颜色规范

### 2.1 响应式缩放（P1/P2）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| D | `useCanvasSize({ ... })` 硬编码 | 12 处 | 多数为合理例外，更新 allowlist 文档即可 |

详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)、[`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量

### 3.1 AnimationPage 协调职责监控（P2）

> 当前 523 行（2026-07-04 核对，较上次 +16 行，**已超 500 行阈值**）。触发拆分条件：行数 > 500，或存在物理计算与 JSX 混写，或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

### 3.2 左屏控制台整体优化（P1/P2，暂缓）

**整体要求**：
- 左屏基础结构一致，控件分组明确；默认恢复语义清晰
- 简单模式切换、显示开关、提示卡不再需要手写 SidebarExtra（已通过 controlMeta 实现）

**待完成**：
- 剩余 2 个 SidebarExtra 随后续维护逐步清理（2026-07-03 核查：registry 中共 2 个）
  - `UniformAccelerationSidebar`：areaMode 为派生复合状态，需扩展 onChangeSideEffect 支持条件分支
  - `ForceMotionSidebar`：10 种运动模式各有独立参数集，需引入动态参数集机制

### 3.3 其他（P3，暂缓）

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

### 4.4 Store selector 优化（P2）

> 审计发现：~121 处 useAnimationStore 调用中，~36 处使用精确 selector，~79 处使用解构 selector，~6 处使用 `.getState()`。

建议拆分为：`useAnimationParams()`、`usePlaybackState()`、`useAnimationDisplayOptions()`。
通过 selector 降低组件不必要重渲染。

**风险评估**：
- 选择器拆分若内部仍返回新对象 → 重渲染问题不变甚至更糟
- 遗漏订阅字段 → 功能静默失效（最隐蔽）
- 引用稳定性破坏 → `useEffect`/`useMemo` 依赖意外触发
- 与 `useShallow` 交互可能产生意外行为

**降险策略**：
1. 先用 React DevTools Profiler 记录 3-5 个高频交互场景基线，只迁移确认有重渲染问题的组件
2. 逐 hook 推进：`usePlaybackState()`（字段最稳定）→ `useAnimationParams()` → `useAnimationDisplayOptions()`
3. 每个 hook 补引用稳定性测试（`Object.is` 前后返回值）
4. 不追求全覆盖，跳过低频交互组件（SidebarExtra、TipCard 等）

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

## 五、Viewport 架构重构收尾（P0/P1/P2 渐进式铺开）

> 基础设施已就绪：`clientToSvgPoint` / `clientToContainerPoint`（P0 工具）、`createSceneScaleFromViewport(vp, 'visibleArea', ...)` 快捷字面量 API（P1 工具）、`useCanvasSize` 的 `{ presetCompensation: 1.2 }` 代偿参数（P2 工具）。以下为各专项剩余组件的渐进式迁移清单。

### 5.1 P0 尾务：坐标映射统一 ~~（7 个文件）~~ → ✅ 已清零

> Batch1（ElectricField、SpringComposite）+ Batch2（GravityAnimation、SatelliteAnimation、EnergyConservationAnimation、useVectorDrag、useEquilibriumPhysics、usePEInteraction、CircularMotionAnimation、useCentripetalPhysics、ProjectileAnimation、useObliqueThrowLayout、vtChartUtils）全部完成。全库 `clientX - rect.left` / `vp.tx` 手动算式已归零。

### 5.2 P1 推广：createSceneScaleFromViewport 快捷字面量（~~37~~ → 0 个文件，已清零）

> Batch2 已迁移：`ConnectedBodies`、`WorkAnimation`（2 个）。
> P1 Continuous Cleanup 已迁移：`ChargeInEField`、`VectorAddition`、`useEquilibriumLayout`、`PotentialEnergy`、`SpringComposite`、`Acceleration`、`FreeFall`、`KinematicsAdvanced`、`ObliqueThrow`、`Projectile`、`UniformAcceleration`、`Velocity`、`VerticalThrow`、`Impulse`、`Momentum`、`MomentumTheorem`、`IntermolecularForces`（17 个）。
> Easy 批量迁移：`FreeFallDripAnimation`、`VelocityAnimationStrip`、`StroboscopicAnimation`（3 个）。
> 电磁学子组件迁移：`BasicMode`、`ThreeChargeMode`、`ElectricFieldBasicScene`、`ElectricFieldAdvancedScene`（4 个，父组件透传 vp/sceneScale）。
> P1 centerScale worldWidth/worldHeight 补丁已迁移：`CircularMotionAnimation`、`useCentripetalPhysics`、`KeplerAnimation`、`SatelliteAnimation`（4 个）。
> P1 子组件 vp 透传已迁移：`PowerScene`、`KineticEnergyScene`（2 个，父组件透传 vp）。
> P1 轻量场景已迁移：`AccelerationCenterExtra`、`useForceMotionSandbox`（2 个，构造 minimal vp）。

将冗长的 `SceneConfig` 对象构造 + `createSceneScale()` 替换为 `createSceneScaleFromViewport(vp, 'visibleArea')` 一行调用。

| # | 文件 | 难度 | 说明 |
|---|------|------|------|
| 1 | `electromagnetism/magnetism/BoundaryMagneticField/SimulationView.tsx` | Hard | worldWidth/Height 动态计算，originY 条件分支 |
| 2 | `electromagnetism/magnetism/velocity-selector/model/velocitySelectorModel.ts` | Hard | 纯函数，world 尺寸来自 scaleX/scaleY |

> **DEV 豁免**：`src/features/dev/` 目录为内部开发沙箱（如 `VectorPlayground.tsx`），不接入三屏自适应体系，无需实施视口与比例尺整改。
> **架构豁免**：`SimulationView.tsx`（原生 Canvas 直绘）、`velocitySelectorModel.ts`（纯计算模型）均不走 `useViewport`，合法保留底层 `createSceneScale` 调用，已加固注释护栏。P1 推广实质清零。

**执行策略**：维护到对应组件时顺手替换，逐步精简样板代码。

### 5.3 P2 出清：废弃 Preset 平滑迁移（~~61~~ → 0 个文件，已清零）

> P2 已全部清零：所有 `wide`/`tall` 引用已迁移至 `full` + `{ presetCompensation: 1.2 }`，`spacing.ts` 中 `wide` 和 `tall` 定义已删除。

将 `CANVAS_PRESETS.wide` (700×400) / `CANVAS_PRESETS.tall` (700×450) 统一迁移为 `CANVAS_PRESETS.full` (700×650) + `{ presetCompensation: 1.2 }`。全库清零后在 `spacing.ts` 中删除 `wide` 和 `tall` 定义。

**按学科模块分组**：

**力学 — 运动学（6 个）**：`FreeFallDripAnimation`、`KinematicsAdvancedAnimation`、`VelocityAnimationStrip`、`UniformAccelerationAnimation`、`AccelerationAnimation`、`SpringCompositeAnimation`

**力学 — 动力学（10 个）**：`GravityAnimation`、`GravityBasicAnimation`、`VectorAdditionAnimation`、`FrictionAnimation`、`ConnectedBodiesAnimation`、`NewtonSecondCenterExtra`、`WeightlessnessCenterExtra`、`EquilibriumAnimation`、`WeightlessnessAnimation`、`useForceMotionSandbox`

**力学 — 其他（10 个）**：`KeplerAnimation`、`SatelliteAnimation`、`MomentumTheoremAnimation`、`ImpulseAnimation`、`MomentumAnimation`、`PowerAnimation`、`PotentialEnergyAnimation`、`useLightRodRopePhysics`、`ForceMotionTripleChart`、`hooks/useEquilibriumLayout`

**电磁学 — 静电（4 个）**：`ElectricPotential`、`ElectricField`、`CapacitorChart`、`FieldLines`

**电磁学 — 直流电路**：✅ 已清零

**电磁学 — 电磁感应（7 个）**：`PowerTransmission`、`InductionPhenomenon`、`LenzsLawCanvas`、`ACValues`、`FaradayLaw`、`LenzsLaw`、`Transformer`

**电磁学 — 其他（4 个）**：`CuttingEMF`、`ChargeInBField`、`VelocitySelector`、`BoundaryMagneticField/SimulationView`

**光学（4 个）**：`ThinLensAnimation`、`ReflectionAnimation`、`RefractionAnimation`、`TIRAnimation`

**热学（8 个）**：`IntermolecularForcesAnimation`、`IntermolecularForcesCenterExtra`、`BrownianMotion`、`SecondLawAnimation`、`FirstLawAnimation`、`ClapeyronAnimation`、`ClapeyronCenterExtra`、`GasLawsAnimation`

**执行策略**：按学科模块分批处理，每批完成后跑全量检查。全部清零后删除 `spacing.ts` 中 `wide` 和 `tall` 定义。

---

## 六、Viewport 架构存量违规迁移

> 来源：`07_CANVAS_SVG_CHART_RULES.md §2.3` 违规清单。新页面一律使用 §2.2 标准路径。
> 迁移模式参考：TIRAnimation/RefractionAnimation（2026-07-08 已完成）。

| 文件 | 违规类型 | 优先级 | 迁移要点 |
|------|---------|-------|---------|
| `GasLawsAnimation.tsx` | foreignObject 嵌入 RelationChart | 🟠 中 | ✅ 已完成：RelationChart 移至 HTML flex 分区，与 SVG 平级；`useCanvasSize`+`useViewport` → `useAnimationViewport` |
| `ClapeyronAnimation.tsx` | foreignObject 嵌入 RelationChart | 🟠 中 | ✅ 已完成：RelationChart + PV/T 标注移至 HTML flex 层；`useCanvasSize`+`useViewport` → `useAnimationViewport` |
| `ReflectionAnimation.tsx` | 固定 viewBox 800×500（非标准 preset） | 🟡 低 | ✅ 已完成：`useAnimationViewport` + `AnimationSvgCanvas`，设计坐标对齐 `CANVAS_PRESETS.full` |
| `ThinLensAnimation.tsx` | 固定 viewBox 800×500 + foreignObject | 🟡 低 | ✅ 已完成：`useAnimationViewport` + `AnimationSvgCanvas`，设计坐标对齐 `CANVAS_PRESETS.full`；RelationChart 移至 HTML flex 层；`getScreenCTM().inverse()` → `useViewportPointer` |
| `OhmLaw.tsx` | 固定 viewBox 650×400（非标准 preset） | 🟡 低 | ✅ 已完成：`useAnimationViewport(splitV)` + `AnimationSvgCanvas`，电路坐标原生重映射至 700×325 设计空间 |

**执行策略**：按优先级逐个迁移，每次迁移后跑全量检查。foreignObject 类（🟠）优先于 fixed viewBox 类（🟡）。

---

## 七、splitV/splitH 分屏页面迁移至 §2.2 标准路径

> 来源：审计发现 14 个使用 `CANVAS_PRESETS.splitV/splitH` 的文件全部用旧式 `useCanvasSize` 直接调用，无一使用 `useAnimationViewport` + `AnimationSvgCanvas`。§2.2 规范已覆盖分屏场景（场景 4），但实现未跟进。
> 迁移要点：`useCanvasSize(preset)` → `useAnimationViewport({ preset })`，手写 `<div ref> + <svg>` → `<AnimationSvgCanvas>`，外层 HTML flex 分区保持不变。

### splitV — 上下分区（~~8 个~~ → 4 个待处理）

| 文件 | 优先级 | 状态 | 迁移要点 |
|------|-------|------|---------|
| `CombinedFieldsAnimation.tsx` | 🟠 中 | 待处理 | 同时修复 foreignObject（§2.3 违规），图表移至 HTML flex 层 |
| `ChargeInEField.tsx` | 🟠 中 | 待处理 | 同时检查是否有 foreignObject 嵌图表 |
| `Capacitor.tsx` | 🟡 低 | ✅ 已完成 | 自包含模式：`useAnimationViewport` + `AnimationSvgCanvas` |
| `InductionLoopField.tsx` | 🟡 低 | ✅ 已完成 | 子组件 `LoopPassFieldScene` 已改为自包含模式 |
| `InductionDualRods.tsx` | 🟡 低 | ✅ 已完成 | 子组件 `DualRodsScene` 已改为自包含模式 |
| `PhotoelectricSim.tsx` | 🟡 低 | ✅ 已完成 | Canvas 组件：`useCanvasSize` → `useAnimationViewport`，保留 `<canvas>` 渲染 |
| `SpringForceHookeLawScene.tsx` | 🟡 低 | ✅ 已完成 | 自包含模式：`useAnimationViewport` + `AnimationSvgCanvas` |
| `AmpereForce.tsx` | ⚪ 仅引用 | 豁免 | 仅引用 `splitV.height` 作为常量，无需 Hook 迁移 |

### splitH — 左右分区（~~5 个~~ → 3 个待处理）

| 文件 | 优先级 | 状态 | 迁移要点 |
|------|-------|------|---------|
| `CircularGeometryModel.tsx` | 🟠 中 | 待处理 | Canvas 直绘组件，需评估是否适合迁移到 SVG 标准路径 |
| `BinaryStarsAnimation.tsx` | 🟡 低 | ✅ 已完成 | 自包含模式：修复动态 viewBox 反模式 → `AnimationSvgCanvas` |
| `SpringForceCenterExtra.tsx` | 🟡 低 | ✅ 已完成 | 自包含模式：`useAnimationViewport`（图表组件，保留固定 viewBox） |
| `SpringForceCutRopeScene.tsx` | 🟡 低 | ✅ 已完成 | 自包含模式：`useAnimationViewport` + `AnimationSvgCanvas` |

**执行策略**：先处理与 §2.3 违规重叠的文件（CombinedFieldsAnimation、ChargeInEField），再批量处理标准替换类。Canvas 直绘组件（CircularGeometryModel）需单独评估迁移可行性。
