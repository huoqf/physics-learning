# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-13（§7 粒子轨迹迁移全部完成并瘦身 + §5 Viewport 迁移状态更新 + §3.2/§4.2.1 归档）

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
| `TIRAnimation.tsx` | 556 | 无 hook；已用 `src/physics/optics`（3 函数） | 抽 `useTIRPhysics` hook + `SingleBeamMode` / `PointSourceMode` 组件；SVG 工具函数去重（`arrowHeadPoints` 与 RefractionAnimation 重复） | ~80 |
| `FieldLines.tsx` | 567 | 无 hook；**自定义 `electricField`/`potential` 与 `src/physics/electrostatics` 重复** | 纯函数迁入 `src/physics/fieldLines.ts` + 抽 `useFieldLinesPhysics` hook（4 个 useMemo） | ~200 |
| `ConnectedBodiesAnimation.tsx` | 550 | 无 hook；已用 `src/physics/dynamics/connected-body`（2 函数） | 抽 `useConnectedBodiesPhysics` hook + `MassBlock` / `ConnectionElement` / `ForceVectorGroup` 组件 | ~100 |
| `LenzsLawCanvas.tsx` | 554 | 已有 `useLenzsLaw` hook | 拆子组件：`GalvanometerWiring` / `FluxChangePanel` / `StatusMonitorPanel` / `HandRulePanel` / `DraggableMagnet`；视觉缩放公式移入 hook | ~120 |
| `InclineForceDiagram.tsx` | 552 | 无 hook；无 `src/physics` 导入（力分解全部内联） | 抽 `useInclineForceLayout` hook + `InclineSlopeBackground` / `OrthogonalDecompositionOverlay` / `InclineForceVectors` 组件；`projectForce`/`F_max` 提取为共享工具（`ForcePolygon` 重复） | ~120 |
| `GravityBasicAnimation.tsx` | 511 | 无 hook；`src/physics/dynamics` 有 `calculateEarthGravity` 但**未复用** | 复用 `calculateEarthGravity` + 抽 `useSuspendedPlatePhysics` hook；拆 `EarthGravityScene` / `SuspendedPlateScene` 组件（两个 mode 完全独立） | ~60 |

> ~~已降至阈值以下（2026-07-11 核对）~~：`SpringCompositeAnimation.tsx`(322)、`CircularMotionAnimation.tsx`(495)
>
> 临近阈值（450-499）：`LightRodRopeScene.tsx`(485)、`WorkFSChart.tsx`(469)、`RefractionAnimation.tsx`(462)、`AccelerationCenterExtra.tsx`(462)、`GravityAnimation.tsx`(459)、`ImpulseAnimation.tsx`(457)、`UniformAccelerationAnimation.tsx`(455)
>
> 已拆分：`PowerTransmission.tsx`(696→256)、`KeplerAnimation.tsx`(673→460)、`FreeFallDripAnimation.tsx`(560→448)、`CoulombLaw.tsx`(708→28+290+288，含物理函数抽离至 `src/physics/electrostatics.ts`)

> 临近阈值（450-499）：`LightRodRopeScene.tsx`(485)、`SimulationView.tsx`(478)、`WorkFSChart.tsx`(469)、`RefractionAnimation.tsx`(462)、`AccelerationCenterExtra.tsx`(462)、`GravityAnimation.tsx`(459)、`ImpulseAnimation.tsx`(457)、`UniformAccelerationAnimation.tsx`(455)
>
> 已拆分：`PowerTransmission.tsx`(696→256)、`KeplerAnimation.tsx`(673→460)、`FreeFallDripAnimation.tsx`(560→448)、`CoulombLaw.tsx`(708→28+290+288，含物理函数抽离至 `src/physics/electrostatics.ts`)

---

## 二、响应式与颜色规范

### 2.1 响应式缩放（P1/P2）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| D | `useCanvasSize({ ... })` 硬编码 | 12 处 | 多数为合理例外，更新 allowlist 文档即可 |

---

## 三、代码质量

### 3.1 AnimationPage 协调职责监控（P2）

> 当前 523 行（2026-07-04 核对，较上次 +16 行，**已超 500 行阈值**）。触发拆分条件：行数 > 500，或存在物理计算与 JSX 混写，或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

### 3.2 左屏控制台整体优化 ✅

> 已完成（2026-07-13）。SidebarExtra 61→0，全部收敛为声明式 controlMeta。
> 详细记录见 [2026-W28.md](./logs/2026-W28.md)。

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

### 4.2.1 力方向纯函数扩展（P2，进行中）

> 背景：复合场页面因 SVG/物理坐标系混淆导致力方向反转 bug（2026-07-10 修复）。
> 已在 `src/physics/magnetism/forces.ts` 新增 `lorentzForceDir` / `electricForceDir` / `centripetalForceDir` 三个纯函数 + 21 个单测，统一返回物理坐标系(y↑正)单位向量。
> combined-fields 三处力箭头已迁移到纯函数调用。

**扩展原则：触发性迁移，不专门为迁移而迁移**

每次修改某动画页面时，顺手把手写坐标差 / 电荷符号三元表达式替换为 helper 调用。新增 helper 按需补单测。

**高优先级目标（按风险排序）**

| 优先级 | 领域 | 文件 | 风险点 | 状态 |
|:---:|------|------|------|:---:|
| P2 | 电磁学·感应 | `CuttingEMFScene.tsx` / `SingleRodAnimation.tsx` | 安培力方向，需新增 `ampereForceDir` helper | |
| P2 | 电磁学·静电 | `ElectricFieldAdvancedScene.tsx` / `ThreeChargeMode.tsx` | 多电荷力方向 | |
| P3 | 力学·圆周 | `CentripetalScene.tsx` / `VerticalCircularScene.tsx` | 向心力方向，已有 `centripetalForceDir` 可直接用 | |

> P1 已全部完成（2026-07-11）：`velocitySelector.ts`、`SimulationView.tsx`(BoundaryMagneticField)、`ChargeInEField.tsx`。
> 详见 [2026-W28.md](./logs/2026-W28.md)。

**helper 扩展清单（按需新增）**

| 函数 | 覆盖场景 | 状态 |
|------|---------|------|
| `lorentzForceDir` | 带电粒子磁场偏转 | ✅ |
| `electricForceDir` | 电场对电荷作用力 | ✅ |
| `centripetalForceDir` | 圆周运动向心力 | ✅ |
| `ampereForceDir` | 导体棒安培力 F=BIL | 待新增（迁移 CuttingEMF/SingleRod 时） |
| `gravityDir` | 重力方向（恒向下） | 低优先级，收益小 |

**迁移检查清单（每次迁移一个页面时执行）**

1. grep 该文件内 `cy - .*\.y` / `\.y - cy` / `q > 0 \?` 模式
2. 替换为 helper 调用，SVG→物理坐标翻转以 `{ x, y: -y }` 显式内联
3. 跑 `tsc --noEmit` + 该领域相关测试
4. 视觉验证：正/负电荷各播放一次，确认箭头方向

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

## 五、Viewport 架构迁移

> 合规标准：使用 `useAnimationViewport` from `@/hooks`
>
> 当前进度（2026-07-13）：COMPLIANT ~95 个 / LEGACY 动画页面 3 个（CenterExtra/Chart/子组件不计入）
>
> 审计缺陷：11/11 已修复
>
> 最新完成：OrbitTransferAnimation（2026-07-11）、CentripetalAnimation（2026-07-11，含 foreignObject 修复）

### 5.1 待迁移概览

| 风险等级 | 文件 | 说明 |
|----------|------|------|
| MEDIUM | `SatelliteAnimation.tsx` | useCanvasSize(CANVAS_PRESETS.full) + useViewport，设计尺寸需对齐 preset |
| MEDIUM | `SpringCompositeAnimation.tsx` | useCanvasSize({700,650})，需迁移到 useAnimationViewport |
| LOW | `StroboscopicAnimation.tsx` | useCanvasSize({400,180})，小尺寸自定义 viewBox，可保持现状或迁移 |

> **不迁移**：CenterExtra / Chart / Sidebar / 子组件（如 MomentumScene、BohrOrbits 等）使用 useCanvasSize 属正常模式，由父级 useAnimationViewport 提供 vp。
>
> **DEV 豁免**：`src/features/dev/` 目录为内部开发沙箱，无需迁移。

---

## 六、组件索引与文档（P2）

> 来源：组件 barrel 整理（2026-07-09）后，`COMPONENT_REGISTRY.md` 骨架已创建，覆盖 15 个高频组件。部分组件缺少详细调用示例，需逐步补全。
> 编写铁律：示例必须从源码 interface + `src/features/` 真实调用中提取，不得凭经验手写。

### 6.1 Registry 示例补全 ✅

> 已完成（2026-07-13）。31 个组件均有完整示例（用途 + import + 最小 JSX + 禁止写法）。
> 详见 [COMPONENT_REGISTRY.md](../ui/COMPONENT_REGISTRY.md)。

| 组件 | 状态 |
|------|------|
| `VectorArrow` | ✅ |
| `ParticleTrajectory` / `drawCanvasParticleTrajectory` | ✅ |
| `PhysicsGround` | ✅ |
| `Ball` | ✅ |
| `Block` | ✅ |
| `VectorDefs` | ✅ |
| `Spring` | ✅ |
| `SportsCar` | ✅ |
| `EnergyBars` | ✅ |
| `CapacitorPlates` | ✅ |
| `ConductingRod` | ✅ |
| `Incline` | ✅ |
| `Pulley` | ✅ |
| `ParticleEmitter` | ✅ |
| `DCSource` | ✅ |
| `Galvanometer` | ✅ |
| `BarMagnet` | ✅ |
| `HandRule` | ✅ |
| `LeftPanel` / `LeftPanelSection` | ✅ |
| `ParamControl` | ✅ |
| `ControlPanel` | ✅ |
| `PhysicsPanel` | ✅ |
| `AnimationControls` | ✅ |
| `BasePhysicsChart` | ✅ |
| `VelocityTimeChart` | ✅ |
| `RelationChart` | ✅ |
| `ChartCursor` | ✅ |
| `ChartLine` | ✅ |
| `AnimationSvgCanvas` | ✅ |
| `ThreePanel` | ✅ |
| `Button` / `Slider` / `SegmentedControl` / `ToggleSwitch` | ✅ |

### 6.2 场景模板（P3，第二阶段）

> 当前无模板。AI 每次新建动画页面需从零拼 ThreePanel + AnimationSvgCanvas + LeftPanel 结构，效率低。

建议新增 `docs/agent-rules/templates/` 目录，先做 2 个最高频模板：

| 模板 | 覆盖场景 | 优先级 |
|------|---------|-------|
| `TEMPLATE_FULL_ANIMATION_PAGE.md` | 动画独占中屏（`CANVAS_PRESETS.full`），最常见布局 | 高 |
| `TEMPLATE_SPLIT_CHART_SCENE.md` | 中屏上下/左右分区（`splitV`/`splitH`），动画+图表并列 | 中 |

模板内容：完整的文件骨架（imports + 组件结构 + 必需 hooks），AI 可直接复制后填充业务逻辑。

**执行前提**：Registry 示例补全（6.1）完成后再做模板，避免模板中引用不完整的组件示例。

---

## 七、粒子轨迹统一渲染（P1，已完成）

> 规范文档：`COMPONENT_REGISTRY.md §ParticleTrajectory / drawCanvasParticleTrajectory`

**迁移已完成**（2026-07-13）。所有需要迁移的电磁/电场粒子偏转页面均已使用标准组件。

**铁律 — 新增页面必须遵守**：

1. **带电粒子在电场/磁场中的偏转运动**（质谱仪、回旋加速器、电偏转、磁偏转、复合场等）→ 必须使用 `ParticleTrajectory`（SVG）或 `drawCanvasParticleTrajectory`（Canvas），禁止手写拖尾 + 球体
2. **力学直线运动**（自由落体、匀加速、竖直上抛等）→ 不需要轨迹组件，用 `Ball` 即可
3. **固定轨道几何**（圆周运动轨道、卫星轨道等）→ 不需要轨迹组件

**已知低风险问题**（P3，暂不修复）：
- SVG 版本体球位置有 ~1-4px 滞后（取采样点而非精确插值位置），Canvas 版无此问题
- SVG/Canvas 拖尾渐变视觉不一致，规范不要求统一
