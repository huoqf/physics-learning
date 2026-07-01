# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 下文"已从待办移出"仅用于避免重复排期；详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-01（拆分补丁）

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

### 已完成

| 文件 | 原行数 | 拆分结果 | 完成日期 |
|------|-----:|---------|---------|
| `ForceMotionSandbox.tsx` | 758 | → `hooks/useForceMotionSandbox.ts`(253) + 组件(331) | 2026-07-01 |
| `EquilibriumAnimation.tsx` | 737 | → `hooks/useEquilibriumLayout.ts`(165) + 组件(430) | 2026-07-01 |

### 待处理

| 文件 | 当前行数 | 已有 physics | 拆分方向 | 目标行数 |
|------|-----:|:---:|---------|-----:|

> 观察：`MomentumConservationAnimation.tsx`(671)、`KeplerAnimation.tsx`(621)、`TIRAnimation.tsx`(564)、`ConnectedBodiesAnimation.tsx`(557)、`ObliqueThrowAnimation.tsx`(589)、`GravityBasicAnimation.tsx`(572)、`FreeFallDripAnimation.tsx`(559)、`CircularMotionAnimation.tsx`(557)、`PowerTransmission.tsx`→`electromagnetism/induction/`(649)、`SpringCompositeAnimation.tsx`→`mechanics/energy/`(639)、`FieldLines.tsx`→`electromagnetism/electrostatics/`(623) 已超过或临近阈值，但职责相对集中，暂不作为首批拆分目标。

---

## 一.五、CANVAS_PRESETS 废弃别名清理 & 旧方案迁移

> 登记日期：2026-07-01 | 背景：preset 收敛决策（见 `CANVAS_PRESETS_AUDIT.md §2026-07-01`）

---

### 1.5.1 删除废弃别名、批量替换组件（P1）

**目标**：将剩余 31 个调用废弃 preset 的组件统一改用 `wide` / `tall` / `square`，随后删除 `spacing.ts` 中的 4 个废弃别名。

> 实际待替换 31 处（`standard` 剩 8、`mediumTall` 剩 6、`mediumWide` 剩 7、`extraWide` 剩 10）。

**替换映射**：

| 废弃 preset | 尺寸 | → 目标 preset | 尺寸 | 剩余组件数 |
|---|---|---|---|---:|
| `standard` | 700×420 | `wide` | 700×400 | 8 |
| `mediumTall` | 650×450 | `tall` | 700×450 | 6 |
| `mediumWide` | 650×400 | `wide` | 700×400 | 7 |
| `extraWide` | 800×440 | `wide` | 700×400 | 10 |

> `preserveAspectRatio="xMidYMid meet"` 保证尺寸差异在渲染层自动吸收，无需手动调整布局。  
> `extraWide` → `wide` 宽度由 800 缩至 700，光学/变压器等宽向场景需验证关键标注不被截断。

**待替换组件清单**（来源：`CANVAS_PRESETS_AUDIT.md`）：

<details>
<summary>standard → wide（8 个）</summary>

| 文件 | 行 |
|---|---|
| `mechanics/energy/EnergyConservationAnimation.tsx` | 40 |
| `mechanics/energy/PotentialEnergyAnimation.tsx` | 28 |
| `mechanics/energy/PowerAnimation.tsx` | 35 |
| `mechanics/energy/KineticEnergyAnimation.tsx` | 32 |
| `electromagnetism/magnetism/VelocitySelector.tsx` | 21 |
| `electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx` | 11 |
| `electromagnetism/dc-circuits/ClosedCircuit.tsx` | 16 |
| `thermodynamics/kinematics/IntermolecularForcesAnimation.tsx` | 36 |

</details>

<details>
<summary>mediumTall → tall（6 个）</summary>

| 文件 | 行 |
|---|---|
| `mechanics/dynamics/GravityAnimation.tsx` | 42 |
| `mechanics/dynamics/GravityBasicAnimation.tsx` | 45 |
| `mechanics/dynamics/EquilibriumAnimation.tsx` | 29 |
| `mechanics/gravitation/KeplerAnimation.tsx` | 30 |
| `mechanics/gravitation/SatelliteAnimation.tsx` | 27 |
| `mechanics/dynamics/VectorAdditionAnimation.tsx` | 28 |

</details>

<details>
<summary>mediumWide → wide（7 个）</summary>

| 文件 | 行 |
|---|---|
| `electromagnetism/dc-circuits/OhmLaw.tsx` | 11 |
| `electromagnetism/dc-circuits/CircuitAnalysis.tsx` | 59 |
| `mechanics/dynamics/SpringForceAnimation.tsx` | 30 |
| `mechanics/dynamics/SpringForceCenterExtra.tsx` | 13 |
| `mechanics/dynamics/WeightlessnessCenterExtra.tsx` | 12 |
| `mechanics/dynamics/NewtonSecondCenterExtra.tsx` | 12 |
| `mechanics/dynamics/ConnectedBodiesAnimation.tsx` | 56 |

</details>

<details>
<summary>extraWide → wide（10 个，需视觉验证）</summary>

| 文件 | 行 | 验证重点 |
|---|---|---|
| `electromagnetism/induction/FaradayLaw.tsx` | 25 | 线圈+导轨横向布局 |
| `electromagnetism/induction/PowerTransmission.tsx` | 54 | 变压器线圈间距 |
| `electromagnetism/induction/ACGeneration.tsx` | 34 | 旋转线圈 |
| `mechanics/energy/SpringCompositeAnimation.tsx` | 34 | 弹簧复合动画布局 |
| `mechanics/kinematics/VelocityAnimationStrip.tsx` | 36 | 频闪条带宽度 |
| `mechanics/force-motion/ForceMotionTripleChart.tsx` | 254 | 三图并排间距 |
| `optics/thin-lens/ThinLensAnimation.tsx` | 30 | 见 §1.5.2 |
| `optics/total-internal-reflection/TIRAnimation.tsx` | 39 | 光路长度 |
| `optics/refraction/RefractionAnimation.tsx` | 43 | 界面+光路 |
| `optics/reflection/ReflectionAnimation.tsx` | 32 | 见 §1.5.2 |

</details>

**操作步骤**：
1. 批量替换：`CANVAS_PRESETS.standard` → `CANVAS_PRESETS.wide`（同步更新 `designWidth/Height` 为 `700/400`）
2. 批量替换：`CANVAS_PRESETS.mediumTall` → `CANVAS_PRESETS.tall`（同步更新 `designWidth/Height` 为 `700/450`）
3. 批量替换：`CANVAS_PRESETS.mediumWide` → `CANVAS_PRESETS.wide`（同步更新 `designWidth/Height` 为 `700/400`）
4. 替换 `extraWide` 组件（跳过 §1.5.2 中待迁移的 `ReflectionAnimation`/`ThinLensAnimation`）
5. 视觉验证 `extraWide` 组件（宽度由 800→700，确认内容无截断）
6. 删除 `spacing.ts` 中的 4 个废弃别名及注释块
7. `npx tsc --noEmit` 零错误
8. 更新本条为已完成

---

### 1.5.2 旧方案组件迁移至 useCanvasSize + useViewport（P2）

**目标**：将以下仍沿用固定 `viewBox + 比例常量`（已禁用旧方案，见 `07_CANVAS_SVG_CHART_RULES.md §2.3`）的组件迁移为方式A。

| 组件 | 路径 | 当前 preset | 迁移方案 |
|---|---|---|---|
| `ReflectionAnimation` | `optics/reflection/ReflectionAnimation.tsx` | `extraWide`(800×440) | → `wide`(700×400) + 方式A |
| `ThinLensAnimation` | `optics/thin-lens/ThinLensAnimation.tsx` | `extraWide`(800×440) | → `wide`(700×400) + 方式A |

**迁移标准**：
- 删除组件内固定 `VIEW_WIDTH / VIEW_HEIGHT` 常量及比例常量对象
- 改用 `useCanvasSize(CANVAS_PRESETS.wide)` + `useViewport(canvasSize, { designWidth: 700, designHeight: 400 })`
- SVG 改为方式A：`viewBox="0 0 700 400" preserveAspectRatio="xMidYMid meet"`，删除 `vp.transform`（无 overlay 场景）
- 验证光路、界面、标注在不同窗口尺寸下无截断
- 补充 `npx tsc --noEmit` 零错误

**前置条件**：§1.5.1 完成后再处理（避免 preset 变更与方案变更交叉干扰）。

---


## 二、响应式与颜色规范

### 2.1 响应式缩放（P1/P2）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| B | 混合文件残留 | 0 处 | 已全部清理 |
| D | `useCanvasSize({ ... })` 硬编码 | 11 处 | 多数为合理例外，更新 allowlist 文档即可 |

详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)、[`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

### 2.2 rgba() 手写与硬编码 fontSize（P3）

| 文件 | 行号 | 问题 | 结论 |
|------|------|------|------|
| `PowerTransmission.tsx` | 83,90,97 | 动态 rgba() 颜色计算 | 合理使用：物理驱动的运行时颜色插值（白→黄→暗红），非静态色值硬编码，跳过 |
| `VectorPlayground.tsx` | 65 | 开发调试文件 | 可忽略，跳过 |

---

## 三、代码质量

### 3.1 AnimationPage 协调职责监控（P2）

> 当前 436 行。触发拆分条件：行数 > 500，或存在物理计算与 JSX 混写，或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

### 3.2 左屏控制台整体优化（P1/P2，暂缓）

> 登记日期：2026-07-01 | 背景：左屏当前由 `paramMeta → ParamControl` 与大量 `SidebarExtra` 手写控件混合组成，视觉层级和交互语义不够统一。

**现状观察**：
- `ParamControl` 只覆盖 registry 中的标准数值参数；大量页面仍在 `SidebarExtra` 内手写 `Slider / SegmentedControl / ToggleSwitch / OptionButton / TipCard`。
- 左屏顺序、卡片边框、分组标题、提示卡位置、重置语义在不同页面不完全一致。
- 物理参数缺少统一的教学语义扩展：零点、临界点、常用角、推荐值、说明文案、参数分组等。

**分阶段方案**：
1. ✅ **P1：全局增强 `ParamControl`**（2026-07-01 已完成）：精确输入、按 step 格式化、非法值回退、`min<0<max` 自动零点标记、真正恢复默认参数，并补 `ParamControl` 单测。
2. ✅ **P1：统一左屏容器**（2026-07-01 已完成主体）：新增 `LeftPanel / LeftPanelSection / LeftPanelScrollArea` 并接入 `AnimationPage` 顶层左屏；已批量迁移 49 个静态根容器 SidebarExtra 到 `LeftPanelSection`。剩余 Fragment/动态根容器类复杂 SidebarExtra 后续随 controlMeta 迁移处理。
3. ✅ **P2：扩展参数协议**（2026-07-01 已完成）：`ParamMeta` 已增加 `group / description / marks / importance / resetOnChange`，`ParamControl` 已支持分组、说明、标记与重要性样式。
4. ✅ **P2：引入 `controlMeta`**（2026-07-01 第一阶段已完成）：已新增 `ControlMeta` 协议与 `ControlPanel` 渲染器，支持 `number / segmented / toggle / preset / tip`；已迁移库仑定律、力的合成与分解、共点力平衡、恒力做功、开普勒定律等简单 SidebarExtra。
5. ✅ **P2/P3：收敛 SidebarExtra**（2026-07-01 主体完成）：32 个动画已迁移（24 完全删除 + 8 部分精简），SidebarExtra 从 61 个降至 29 个。剩余 29 个因含自定义按钮、useAnimationStore、复杂预设网格、onChange 联动等原因保留。详见 `SIDEBAREXTRA_MIGRATION_REPORT.md`。若需进一步收敛需扩展 controlMeta 协议（动态 preset、action 类型、动态 tip、storeToggle）。

**验收标准**：
- 左屏基础结构一致，控件分组明确；默认恢复语义清晰。
- 简单模式切换、显示开关、提示卡不再需要手写 SidebarExtra。
- 复杂 SidebarExtra 也必须复用统一左屏 section/card 容器。

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

> 审计发现：116 处 useAnimationStore 调用中，~38 处使用精确 selector，~74 处使用解构 selector。

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
