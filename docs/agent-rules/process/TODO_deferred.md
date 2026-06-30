# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 已完成事项记录在 `PROCESS_LOG.md` 和 git commit 中。
>
> 最后更新：2026-06-30

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
| 1 | `CentripetalAnimation` 拆分试点 | 中 | 高 | P2 |
| 2 | Tailwind `text-[Npx]` 分域替换 | 中 | 中 | P2 |
| 3 | 选 1 个大动画做 viewModel 拆分试点 | 中 | 高 | P2 |
| 4 | A/B 类 SVG fontSize 响应式迁移 | 中高 | 中 | P2/P3 |
| 5 | `VectorAdditionAnimation` / `MomentumTheoremAnimation` 拆分 | 中 | 高 | P2/P3 |
| 6 | AnimationModule 规范建立 | 中 | 高 | P3 |
| 7 | Store selector 优化 | 中 | 中 | P3 |
| 8 | Registry + params + quantities 类型闭环 | 高 | 高 | P3 |
