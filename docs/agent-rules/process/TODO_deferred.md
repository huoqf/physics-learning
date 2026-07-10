# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-10（VIEWPORT 迁移同步至 viewport_audit_report.md；清理纯完成记录）

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

## 五、Viewport 架构迁移

> **详细状态请查看 [`viewport_audit_report.md`](../../viewport_audit_report.md)**
>
> 合规标准：使用 `useAnimationViewport` from `@/hooks`
>
> 当前进度：COMPLIANT 39 个 / LEGACY 69 个 / EXEMPT ~118 个

### 5.1 待迁移概览

| 风险等级 | 数量 | 说明 |
|----------|------|------|
| LOW | 2 | 设计尺寸恰好匹配 preset，直接替换即可 |
| MEDIUM | 1 | 尺寸匹配但有 `vp.scale` 依赖 |
| HIGH | 38 | 设计尺寸不匹配任何 preset，需重构布局 |
| 类型导入 | 6 | 父组件迁移后自动兼容 |

### 5.2 推荐迁移顺序

1. **第一批**：LOW 风险 2 个（`useVerticalCircularPhysics.ts`, `useCentripetalPhysics.ts`，square 650×650）
2. **第二批**：MEDIUM 风险 1 个（KeplerAnimation，验证 vp.scale 依赖）
3. **第三批**：按模块选代表文件逐模块迁移，每模块先 1 个验证再批量
4. **最后**：类型导入 6 个（父组件迁移后自动兼容）

### 5.3 特殊迁移项

| 文件 | 说明 |
|------|------|
| `CombinedFieldsAnimation.tsx` | 同时修复 foreignObject 违规（§2.3） |
| `ChargeInEField.tsx` | 同时修复 foreignObject 违规（§2.3） |
| `FieldLines.tsx` | 自定义 physics 与 `src/physics/electrostatics` 重复，需一并清理 |
| `LenzsLawCanvas.tsx` | 已有 hook，拆子组件 + 迁移 viewBox |

> **DEV 豁免**：`src/features/dev/` 目录为内部开发沙箱，无需迁移。

---

## 六、组件索引与文档（P2）

> 来源：组件 barrel 整理（2026-07-09）后，`COMPONENT_REGISTRY.md` 骨架已创建，覆盖 15 个高频组件。部分组件缺少详细调用示例，需逐步补全。
> 编写铁律：示例必须从源码 interface + `src/features/` 真实调用中提取，不得凭经验手写。

### 6.1 Registry 示例补全

以下组件已有完整示例（用途 + import + 最小 JSX + 禁止写法）：

| 组件 | 状态 |
|------|------|
| `VectorArrow` | ✅ 完整（含 origin/vector/type/sceneScale） |
| `AnimationSvgCanvas` | ✅ 完整（含 containerRef/transform/children） |
| `PhysicsGround` | ✅ 完整 |
| `Ball` | ✅ 完整 |
| `Block` | ✅ 完整 |

以下组件只有用途 + import，缺少最小示例：

| 组件 | 缺少内容 | 提取难度 |
|------|---------|---------|
| `VectorDefs` | 最小示例 | 低 — 用法简单，一个 `<VectorDefs />` 即可 |
| `Spring` | 最小示例 | 低 — 已有真实调用可参考 |
| `SportsCar` | 最小示例 | 低 — props 少 |
| `EnergyBars` | 最小示例 + props | 中 — 需确认 energyItems 结构 |
| `CapacitorPlates` | 最小示例 + props | 中 — 需确认电荷标识用法 |
| `ConductingRod` | 最小示例 + props | 中 — 需确认长度/角度参数 |
| `LeftPanel` / `LeftPanelSection` | 最小示例 | 低 — 已有大量真实调用 |
| `ParamControl` | 示例细化 | 低 — 已有 props 说明，补一个完整 JSX |
| `ControlPanel` | 示例细化 | 中 — 依赖 ControlMeta 类型 |
| `BasePhysicsChart` | 示例细化 | 低 — 已有 props，补子组件组合 |
| `ThreePanel` | 最小示例 | 低 — 用法简单 |

**执行策略**：每次补 3-5 个组件，补完跑 `tsc` 验证。优先补 `LeftPanel` 体系（AI 最常误用的布局组件）。

### 6.2 场景模板（P3，第二阶段）

> 当前无模板。AI 每次新建动画页面需从零拼 ThreePanel + AnimationSvgCanvas + LeftPanel 结构，效率低。

建议新增 `docs/agent-rules/templates/` 目录，先做 2 个最高频模板：

| 模板 | 覆盖场景 | 优先级 |
|------|---------|-------|
| `TEMPLATE_FULL_ANIMATION_PAGE.md` | 动画独占中屏（`CANVAS_PRESETS.full`），最常见布局 | 高 |
| `TEMPLATE_SPLIT_CHART_SCENE.md` | 中屏上下/左右分区（`splitV`/`splitH`），动画+图表并列 | 中 |

模板内容：完整的文件骨架（imports + 组件结构 + 必需 hooks），AI 可直接复制后填充业务逻辑。

**执行前提**：Registry 示例补全（6.1）完成后再做模板，避免模板中引用不完整的组件示例。
