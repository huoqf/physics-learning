# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 详细完成记录以 `PROCESS_LOG.md` 和 git commit 为准。
>
> 最后更新：2026-07-03（PowerTransmission 拆分完成，更新行数与 store 数据）

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

| 文件 | 原行数 | 现行数 | 拆分方式 | 验收 |
|------|------:|------:|---------|:----:|
| `MomentumConservationAnimation.tsx` | 743 | 329 | 抽 `useMomentumConservationPhysics` hook + 复用 `src/physics/momentumConservation` | JSX 零物理公式 ✓ <br> tsc + 385 tests pass ✓ |
| `KeplerAnimation.tsx` | 673 | 460 | 抽 `useKeplerPhysics` hook + 复用 `src/physics/celestial` | JSX 零物理公式 ✓ <br> font()/colors 修复 ✓ <br> DESIGN_WIDTH/HEIGHT 常量 ✓ <br> tsc + 385 tests pass ✓ |
| `PowerTransmission.tsx` | 696 | 256 | 抽 `usePowerTransmissionPhysics` hook + `VoltageProfileChart` + `NetworkTopology` + `PowerInfoBar` | JSX 零物理公式 ✓ <br> 物理计算已在 `src/physics/acCircuit.ts` ✓ <br> tsc + 385 tests pass ✓ |

### 待处理

| 文件 | 当前行数 | 已有 physics | 拆分方向 | 目标行数 |
|------|-----:|:---:|---------|-----:|

> 观察（2026-07-03 核对）：以下文件超过 500 行，行数以本次核对为准：
> - `SpringCompositeAnimation.tsx`(585)、`TIRAnimation.tsx`(564)、`FieldLines.tsx`(559)、`ConnectedBodiesAnimation.tsx`(557)、`LenzsLawCanvas.tsx`(542)、`InclineForceDiagram.tsx`(539)、`GravityBasicAnimation.tsx`(519)、`CircularMotionAnimation.tsx`(506)
> - 临近阈值（450-499）：`LightRodRopeScene.tsx`(485)、`SimulationView.tsx`(478)、`WorkFSChart.tsx`(469)、`RefractionAnimation.tsx`(462)、`AccelerationCenterExtra.tsx`(462)、`GravityAnimation.tsx`(459)、`ImpulseAnimation.tsx`(457)、`UniformAccelerationAnimation.tsx`(455)
> - 已拆分：`PowerTransmission.tsx`(696→256)、`KeplerAnimation.tsx`(673→460)、`FreeFallDripAnimation.tsx`(560→448)

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

> 当前 507 行（2026-07-03 核对，较上次 +31 行，**已超 500 行阈值**）。触发拆分条件：行数 > 500，或存在物理计算与 JSX 混写，或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

### 3.2 左屏控制台整体优化（P1/P2，暂缓）

**整体要求**：
- 左屏基础结构一致，控件分组明确；默认恢复语义清晰
- 简单模式切换、显示开关、提示卡不再需要手写 SidebarExtra（已通过 controlMeta 实现）
- ~~剩余硬骨头需扩展 action 类型后处理~~（2026-07-03 已全部解锁）
- action 类型已扩展支持 `setDirectionAndRestart` 和 `resetAndRestart` 组合动作

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

> 审计发现：~146 处 useAnimationStore 调用中，~38 处使用精确 selector，~108 处使用解构 selector。

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
