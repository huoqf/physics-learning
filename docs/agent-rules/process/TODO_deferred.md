# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 已完成事项记录在 `PROCESS_LOG.md` 和 git commit 中。
>
> 最后更新：2026-06-29

---

## 〇、架构指引（拆分文件时必须遵守）

### 问题本质

长文件的风险不是"行数多"，而是**关注点混合**。一个动画文件同时包含参数读取、物理计算、坐标换算、动画状态、SVG 绘制、图表绘制、标注文本、教学逻辑、交互逻辑，导致：

- 改显示逻辑可能破坏物理计算
- 难以对关键物理公式补单元测试
- 视觉回归难以发现

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

依赖方向：`math → physics → hooks → components → AnimationPage`

### 拆分原则

1. **优先抽纯计算**（trajectory / geometry / scales / derived quantities），不优先拆 SVG 小片段
2. **每次只拆一个动画**，拆完跑 `npm run check && npm test`
3. **物理 hook 零 JSX**：`hooks/useXxxPhysics.ts` 只返回数据，不含 `<` 标签
4. **组件复用优先**：场景中已有 `src/components/` 下的组件时必须直接使用（铁律 5）
5. **拆完补单测**：为提取的纯计算函数补充 `tests/physics/` 单测

---

## 一、超长文件拆分（P3，随功能修改顺手拆）

| 优先级 | 文件 | 当前行数 | 拆分方案 |
|:---:|------|-----:|---------|
| 1 | `CentripetalAnimation.tsx` | 898 | 提取 `useCentripetalPhysics` hook + 拆 `CentripetalScene` |
| 2 | `VectorAdditionAnimation.tsx` | 859 | 几何计算多，抽纯函数收益高 |
| 3 | `MomentumTheoremAnimation.tsx` | 837 | 提取 `useMomentumTheoremPhysics` hook（基础+进阶场景） |
| 4 | `WeightlessnessAnimation.tsx` | 830 | 提取 `useWeightlessnessPhysics` hook + 拆 `WeightlessnessChart` |
| 5 | `VelocitySelector.tsx` | 823 | 已有 `physics/magnetism/velocitySelector.ts`，抽 `useVelocitySelectorPhysics` hook + Canvas 粒子渲染分离 |
| 6 | `ThinLensAnimation.tsx` | 821 | 已有 `physics/optics.ts`，抽 geometry model |

> 观察：`Transformer.tsx`(724)、`ForceMotionSandbox.tsx`(694)、`EquilibriumAnimation.tsx`(688) 临近阈值，暂不动。

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

### 3.1 缺失颜色 token（P2）

> 以下为项目中未通过 token 体系使用的硬编码颜色，按语义分组。统一 token 化后可保证视觉一致性并便于主题切换。

#### A. 白色高光（10 处）

| 文件 | 行号 | 用途 | 建议 token |
|------|------|------|-----------|
| `CurvedSlotAnimation.tsx` | 213, 221 | 弧形槽高光描边 | `SCENE_COLORS.materials.edgeHighlightWhite` |
| `CentripetalAnimation.tsx` | 562 | 白色高光填充 | `SCENE_COLORS.materials.specularWhite` |
| `WorkAnimation.tsx` | 267, 269 | 白色高光描边 | `SCENE_COLORS.materials.specularWhite` |
| `ThinLensAnimation.tsx` | 586 | 白色高光描边 | `SCENE_COLORS.materials.specularWhite` |
| `ForceMotionSandbox.tsx` | 508 | 原点标记填充 | `SCENE_COLORS.materials.specularWhite` |
| `ParametricMagneticField.tsx` | 204 | 磁场点白色填充 | `SCENE_COLORS.materials.specularWhite` |
| `PrimaryCoil.tsx` | 153 | 线圈高光描边 | `SCENE_COLORS.materials.specularWhite` |
| `Solenoid.tsx` | 161 | 螺线管高光描边 | `SCENE_COLORS.materials.specularWhite` |

#### B. 水面 / 流体（2 处）

| 文件 | 行号 | 用途 | 建议 token |
|------|------|------|-----------|
| `ManBoatAnimation.tsx` | 269 | 水面填充色 `#0284c7` | `SCENE_COLORS.surface.waterFill` |
| `ManBoatAnimation.tsx` | 273 | 水波纹描边 `#0ea5e9` | `SCENE_COLORS.surface.waterRipple` |

#### C. 结构 / 框架色（neutral-slate 系列，~25 处）

> 这些颜色用于轨道、支架、滑轮、边框等结构性元素，跨多个动画重复出现。

| 语义 | hex 值 | Tailwind | 文件:行号 | 建议 token |
|------|--------|----------|----------|-----------|
| 深色结构描边 | `#0F172A` | slate-900 | `DialMeter.tsx:65`, `ThinLensAnimation.tsx:466,471,491,526` | `SCENE_COLORS.materials.structStrokeDark` |
| 次深结构描边 | `#1E293B` | slate-800 | `Block.tsx:156`, `ForceMotionSandbox.tsx:507`, `ThinLensAnimation.tsx:450,710`, `SatelliteAnimation.tsx:156` | `SCENE_COLORS.materials.structStroke` |
| 中性结构填充 | `#334155` | slate-700 | `Block.tsx:54,155`, `ForceMotionSandbox.tsx:411`, `ThinLensAnimation.tsx:446,502,537,713`, `ClosedCircuit.tsx:250` | `SCENE_COLORS.materials.structFill` |
| 中性结构描边 | `#475569` | slate-600 | `ForceMotionSandbox.tsx:407,475,507`, `ThinLensAnimation.tsx:491,526,709,719`, `FrictionAnimation.tsx:294,438,452` | `SCENE_COLORS.materials.structStrokeMid` |
| 辅助结构描边 | `#64748B` | slate-500 | `ForceMotionSandbox.tsx:532,533`, `SecondLawAnimation.tsx:332`, `CircuitAnalysisCenterExtra.tsx:96,102`, `ThinLensAnimation.tsx:449` | `SCENE_COLORS.materials.structStrokeLight` |
| 浅结构描边 | `#CBD5E1` | slate-300 | `ForceMotionSandbox.tsx:474`, `ThinLensAnimation.tsx:448` | `SCENE_COLORS.materials.structStrokePale` |
| 浅结构填充 | `#E2E8F0` | slate-200 | `FrictionAnimation.tsx:451` | `SCENE_COLORS.materials.structFillPale` |
| 极浅背景 | `#F0F9FF` | sky-50 | `PhysicsGround.tsx:196,344` | `SCENE_COLORS.materials.structBgPale` |
| 极浅填充 | `#F8FAFC` | slate-50 | `ThinLensAnimation.tsx:713` | `SCENE_COLORS.materials.structBgLight` |
| 石头色描边 | `#78716c` | stone-500 | `ForceMotionSandbox.tsx:395` | `SCENE_COLORS.materials.stoneStroke` |
| 滑轮浅色 | `#f5f5f5` | neutral-100 | `Pulley.tsx:70` | `SCENE_COLORS.materials.pulleyLight` |
| 滑轮中灰 | `#b5b5b5` | — | `Pulley.tsx:80` | `SCENE_COLORS.materials.pulleyMid` |
| 滑轮深色 | `#404040` | neutral-700 | `Pulley.tsx:89` | `SCENE_COLORS.materials.pulleyDark` |

#### D. 警示 / 错误红色（~17 处）

| 语义 | hex 值 | Tailwind | 文件:行号 | 建议 token |
|------|--------|----------|----------|-----------|
| 红色警示 | `#EF4444` | red-500 | `LightRodRopeAnimation.tsx:177`, `InductionPhenomenon.tsx:249,250,377,378,379`, `EnergyBars.tsx:92,128`, `OhmLaw.tsx:89`, `CircuitAnalysis.tsx:330`, `PowerTransmission.tsx:303` | `CANVAS_COLORS.alertRed` |
| 深红填充 | `#DC2626` | red-600 | `ClosedCircuit.tsx:97,251` | `CANVAS_COLORS.dangerDark` |
| 深红文字 | `#B91C1C` | red-700 | `PowerTransmission.tsx:304` | `CANVAS_COLORS.dangerText` |
| 浅红背景 | `#FEF2F2` | red-50 | `KinematicsAdvancedAnimation.tsx:57` | `CANVAS_COLORS.dangerBg` |
| 浅红边框 | `#FECACA` | red-200 | `KinematicsAdvancedAnimation.tsx:58` | `CANVAS_COLORS.dangerBorder` |
| 浅红填充 | `#fee2e2` | red-100 | `PowerTransmission.tsx:303` | `CANVAS_COLORS.dangerBgFill` |
| 深红渐变 | `#7F1D1D` | red-900 | `ClosedCircuit.tsx:98,99` | `CANVAS_COLORS.dangerGradient` |

#### E. 电路元件色环（~15 处）

> 电阻色环遵循国际标准，不应 token 化，但应集中定义。

| 文件 | 用途 |
|------|------|
| `OhmLaw.tsx:87-96` | 0-9 色环颜色数组 |
| `CircuitAnalysis.tsx:330-333` | 动态色环计算 |
| `ClosedCircuit.tsx:250-252` | 电阻色环条纹 |

建议在 `SCENE_COLORS.circuit` 下新增 `resistorBands` 数组。

#### F. 图表 / 数据可视化色（~8 处）

| 文件:行号 | hex 值 | 用途 | 建议 token |
|----------|--------|------|-----------|
| `CircuitAnalysisCenterExtra.tsx:94` | `#3B82F6` | R₁ 图表色 | `CHART_COMPONENT_COLORS.circuitR1` |
| `CircuitAnalysisCenterExtra.tsx:95,100` | `#F97316` | R₂(变) 图表色 | `CHART_COMPONENT_COLORS.circuitR2` |
| `CircuitAnalysisCenterExtra.tsx:96,102` | `#64748B` | 总电路图表色 | `CHART_COMPONENT_COLORS.circuitTotal` |
| `CircuitAnalysisCenterExtra.tsx:101` | `#10B981` | R₃ 图表色 | `CHART_COMPONENT_COLORS.circuitR3` |
| `LightRodRopeAnimation.tsx:177` | `#EF4444` | 图表线条色 | 已有 `PHYSICS_COLORS` 对应项 |
| `LightRodRopeAnimation.tsx:184` | `#6B7280` | 图表线条色 | 已有 `PHYSICS_COLORS.secantLine` |
| `SecondLawAnimation.tsx:332` | `#64748B` | 非平衡态标签色 | `SECOND_LAW_COLORS.nonEquilibriumLabel` |
| `EnergyBars.tsx:128` | `#525252` | 能量条文字色 | `CANVAS_COLORS.energyBarText` |

#### G. 特殊场景背景（~3 处）

| 文件:行号 | hex 值 | 用途 | 建议 token |
|----------|--------|------|-----------|
| `SatelliteAnimation.tsx:273` | `#020617` | 太空背景 | `SCENE_COLORS.environment.spaceBg` |
| `ForceMotionSandbox.tsx:411` | `#334155` | 箭头填充 | 归入结构色 `SCENE_COLORS.materials.structFill` |
| `VectorPlayground.tsx:47,65` | `#999`, `#333` | 参考线/文字 | 开发工具，可忽略 |

#### H. 半透明 rgba 值（~30 处）

> 大量 `rgba(0,0,0,0.12)` 阴影和 `rgba(255,255,255,*)` 高亮散落在各处。

建议统一为：

```ts
SCENE_COLORS.effects.shadowLight    // rgba(0,0,0,0.12)
SCENE_COLORS.effects.shadowMedium   // rgba(0,0,0,0.25)
SCENE_COLORS.effects.glowWhite      // rgba(255,255,255,0.65)
SCENE_COLORS.effects.glowWhiteLight // rgba(255,255,255,0.25)
```

具体出现位置：

| rgba 值 | 文件:行号 | 用途 |
|---------|----------|------|
| `rgba(0,0,0,0.12)` | `SatelliteAnimation.tsx:156`, `GravityAnimation.tsx:294`, `CircularMotionAnimation.tsx:409`, `ProjectileAnimation.tsx:448`, `ObliqueThrowAnimation.tsx:548`, `VerticalThrowAnimation.tsx:331`, `GravityBasicAnimation.tsx:439`, `WeightlessnessAnimation.tsx:757` | drop-shadow |
| `rgba(0,0,0,0.1)` | `ObliqueThrowAnimation.tsx:513`, `VerticalThrowAnimation.tsx:331`, `WeightlessnessAnimation.tsx:757`, `FreeFallScene.tsx:136` | drop-shadow |
| `rgba(15,23,42,0.12)` | `DialMeter.tsx:65`, `DCSource.tsx:201,292`, `Galvanometer.tsx:69,192` | drop-shadow (slate-900) |
| `rgba(15,23,42,0.06)` | `Rails.tsx:159,317` | drop-shadow (slate-900) |
| `rgba(255,255,255,0.65)` | `MomentumTheoremAnimation.tsx:513` | 半透明描边 |
| `rgba(255,255,255,0.45)` | `MomentumTheoremAnimation.tsx:521` | 半透明描边 |
| `rgba(255,255,255,0.25)` | `MomentumTheoremAnimation.tsx:504`, `BarMagnet.tsx:117` | 半透明描边 |
| `rgba(255,255,255,0.85)` | `ACGeneration.tsx:249` | 交流电高光 |
| `rgba(255,255,255,0.82)` | `AmpereFIChart.tsx:95` | 图表背景 |
| `rgba(219,234,254,0.12)` | `MomentumTheoremAnimation.tsx:503` | 蓝色半透明背景 |
| `rgba(254,249,196,*)` | `LightBulb.tsx:98,104` | 灯泡发光 |
| `rgba(67,20,7,0.9)` | `Block.tsx:152` | 木块标签色 |
| `rgba(239,68,68,0.08)` | `ValleyScene.tsx:111` | 红色半透明背景 |
| `rgba(239,68,68,0.4)` | `ValleyScene.tsx:111` | 红色半透明边框 |
| `rgba(96,165,250,0.18)` | `ACGeneration.tsx:245` | 交流电波形 |
| `rgba(96,165,250,0.45)` | `ACGeneration.tsx:247` | 交流电波形 |
| `rgba(96,165,250,0.9)` | `ACGeneration.tsx:253` | 交流电波形 |
| `rgba(217,119,6,0.42)` | `CapacitorPlates.tsx:115` | 电场线色 |
| `rgba(34,197,94,0.8)` | `DCSource.tsx:238` | 电源指示灯 |
| `rgba(51,65,85,0.5)` | `FreeFallScene.tsx:136` | 木块半透明 |
| `rgba(245,158,11,0.15)` | `FreeFallScene.tsx:196` | 橙色半透明背景 |

### 3.2 AnimationPage 协调职责监控（P2，观察性）

> 当前 411 行，未超过 500 行阈值。触发拆分条件：行数 > 500 或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

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
| 1 | `CentripetalAnimation` 拆分试点 | 中 | 高 | P2 |
| 2 | `ManBoatAnimation` 水面色 token 化 | 低 | 中 | P2 |
| 3 | Tailwind `text-[Npx]` 分域替换 | 中 | 中 | P2 |
| 4 | 选 1 个大动画做 viewModel 拆分试点 | 中 | 高 | P2 |
| 5 | A/B 类 SVG fontSize 响应式迁移 | 中高 | 中 | P2/P3 |
| 6 | `VectorAdditionAnimation` / `MomentumTheoremAnimation` 拆分 | 中 | 高 | P2/P3 |
| 7 | AnimationModule 规范建立 | 中 | 高 | P3 |
| 8 | Store selector 优化 | 中 | 中 | P3 |
| 9 | Registry + params + quantities 类型闭环 | 高 | 高 | P3 |
