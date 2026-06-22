# MiniChart 限定评估

> 日期：2026-06-22  
> 范围：只评估 `src/components/UI/MiniChart.tsx` 及其消费方；不迁目录、不修改消费方、不处理其他复杂图表。  
> 目标：判断 `MiniChart` 是否存在类似 `VelocityTimeChart` 早期的动态定标风险，以及是否需要补 `domainPoints`。
>
> 第六轮执行结果：已完成 `MiniChart` cursor clamp + dev warning 小修；未补 `domainPoints`，未迁目录。

---

## 1. MiniChart 当前能力与关键实现

`MiniChart` 是位于 `components/UI` 下的迷你趋势图组件，内部基于 `BasePhysicsChart`：

```tsx
<BasePhysicsChart
  xDomain={[xMin, xMax]}
  yDomain={[yMin, yMax]}
  ...
>
  <MiniChartContent ... />
</BasePhysicsChart>
```

### 1.1 当前 API

```ts
export interface MiniChartProps {
  title: string
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  points: Record<string, number>[]
  lines: MiniChartLine[]
  xKey?: string
  yLabel: string
  xLabel: string
  currentVals: Record<string, number>
  currentXVal: number
  staticLines?: MiniChartStaticLine[]
  minWidth?: number
  minHeight?: number
  className?: string
}
```

### 1.2 与 `domainPoints` 问题的关键差异

`MiniChart` 与早期 `VelocityTimeChart` 最大区别是：

```txt
MiniChart 的坐标轴 domain 不从 points 自动计算，
而是由调用方显式传入 xMin/xMax/yMin/yMax。
```

因此，只要调用方传入的是稳定 domain，即使 `points` 是动态增长或截断数据，也不会导致 Y 轴随时间抖动。

### 1.3 内部动态揭示逻辑

`MiniChartContent` 内部会在 `xKey === 't'` 时按当前时间截断绘制数据：

```ts
const visiblePoints = useMemo(() => {
  if (xKey === 't') {
    return points.filter((p) => p.t <= currentXVal + 1e-9)
  }
  return points
}, [points, xKey, currentXVal])
```

这说明 `points` 是绘制数据；但定标完全由 `xMin/xMax/yMin/yMax` 决定，不依赖 `points`。

---

## 2. 消费方清单与风险评级

### 2.1 总览

| 消费方 | 图表数量 | xKey | points 类型 | domain 来源 | 动态定标风险 |
|---|---:|---|---|---|---|
| `ACGeneration.tsx` | 1 | `t` | 滑动历史窗口 `hist` | `xMin/xMax` 滑动窗口；`yMin/yMax` 由当前参数 `Em` 推导 | 低 |
| `ConnectedBodiesCenterExtra.tsx` | 2 | `t` / `mu` / `F_val` | 完整离线点或关系点 | 显式 domain，基于公式/参数上限 | 低 |
| `NewtonSecondCenterExtra.tsx` | 3 | `t` | 完整 10s 离线轨迹 | `limits` 从完整 points 计算 | 低 |
| `WeightlessnessCenterExtra.tsx` | 3 | `t` | 完整离线轨迹 | `limits` 从完整 points 计算 | 低 |
| `MaxwellBoltzmannChart.tsx` | 1 | `v` | 完整分布曲线 | `vMax/fvMax` 从完整 curve 计算 | 低 |
| `SecondLawCenterExtra.tsx` | 1 | `t` | 动态历史点 | 固定 `[0,30]` / `[0,1.05]` | 低（另有 cursor 超界需注意） |

> 注：`ChargeInEField.tsx` 仅有历史注释提到 MiniChart，实际当前使用的是 `VelocityTimeChart`，不计入消费方。

---

## 3. 逐消费方评估

### 3.1 `ACGeneration.tsx`

| 项 | 结论 |
|---|---|
| points 是否截断 | 是，传入滑动历史窗口 `hist`，只保留最近 `CHART_WINDOW=8s` |
| domain 是否稳定 | X domain 为滑动窗口 `[tMin,tMax]`；Y domain 基于当前参数 `Em`，不从 `hist` 计算 |
| y 轴抖动风险 | 低 |
| 是否需要 domainPoints | 不需要 |
| 备注 | 这是“滑动窗口图”，不是完整历史图。截断 points 与滑动 xDomain 是一致语义。 |

### 3.2 `ConnectedBodiesCenterExtra.tsx`

| 图表 | points | domain | 风险 |
|---|---|---|---|
| v-t | 完整 `0~tMax` points | `x=[0,tMax]`，`y=[0,maxV*1.2]` | 低 |
| a-t / T-t | 完整 points | 显式 domain | 低 |
| T-μ | 完整 `μ∈[0,0.6]` 关系点 | `x=[0,0.6]`，`y=[0,maxT*1.2]` | 低 |
| T-F | 完整 `F∈[0,30]` 关系点 | `x=[0,30]`，显式 y | 低 |

结论：传入 points 是完整关系/时序数据，不存在由截断 points 导致的定标抖动。

### 3.3 `NewtonSecondCenterExtra.tsx`

| 项 | 结论 |
|---|---|
| points 是否截断 | 否，生成完整 `0~10s` 离线轨迹 |
| y domain | 从完整 points 的 F/a/v 全量数据计算 `limits` |
| 动态揭示 | MiniChart 内部按 `currentXVal` 只绘制当前时间之前的点 |
| y 轴抖动风险 | 低 |
| 是否需要 domainPoints | 不需要；当前 points 同时作为完整绘制数据与 domain 计算源 |

### 3.4 `WeightlessnessCenterExtra.tsx`

| 项 | 结论 |
|---|---|
| points 是否截断 | 否，生成完整离线轨迹 |
| y domain | 从完整 points 的 a/N/v 全量数据计算 `limits` |
| 动态揭示 | MiniChart 内部按 `currentXVal` 截断绘制 |
| y 轴抖动风险 | 低 |
| 是否需要 domainPoints | 不需要 |

### 3.5 `MaxwellBoltzmannChart.tsx`

| 项 | 结论 |
|---|---|
| xKey | `v`，非时间轴 |
| points 是否截断 | 否，完整分布曲线 |
| domain | `x=[0,vMax]`，`y=[0,fvMax*1.1]`，均从完整 curve 计算 |
| y 轴抖动风险 | 无；不是动态渐进时序图 |
| 是否需要 domainPoints | 不需要 |

### 3.6 `SecondLawCenterExtra.tsx`

| 项 | 结论 |
|---|---|
| points 是否截断/增长 | 是，历史点动态增长，最多 `MAX_POINTS=200` |
| domain | 固定 `x=[0,30]`，`y=[0,1.05]` |
| y 轴抖动风险 | 低；Y domain 固定 |
| 是否需要 domainPoints | 不需要 |
| 其他风险 | 若 `time > 30`，`currentXVal` 超出 xDomain，cursor 可能绘制到 plot 外；这不是 domainPoints 问题，应另行作为 cursor clamp / 时间窗口语义问题评估 |

---

## 4. 是否需要 `domainPoints`

### 4.1 结论

```txt
当前 MiniChart 不需要立即补 domainPoints。
```

理由：

1. `MiniChart` 的 x/y domain 已由调用方显式传入；
2. 当前消费方没有把“截断 points”用于自动定标；
3. 时序图的动态揭示只影响绘制，不影响坐标轴；
4. 关系图消费方均传入完整关系曲线；
5. 主要风险不是 `domainPoints`，而是：调用方是否传了稳定的 `xMin/xMax/yMin/yMax`，以及 cursor 是否可能超出 domain。

### 4.2 和 `VelocityTimeChart` 的差异

| 项 | VelocityTimeChart 早期问题 | MiniChart 当前状态 |
|---|---|---|
| 自动定标 | 从 points 推导 | 不从 points 推导，调用方显式传 domain |
| points 截断影响坐标轴 | 会 | 不会 |
| domainPoints 必要性 | 必须 | 当前不必要 |
| 风险来源 | 绘制数据与定标数据混用 | 调用方 domain 语义是否稳定 |

---

## 5. 推荐 API 方案（暂不实现）

虽然当前不需要立即实现，但如果未来希望让 `MiniChart` 支持自动 domain 或减少调用方重复计算，可采用兼容 API：

```ts
export interface MiniChartProps {
  points: Record<string, number>[]
  domainPoints?: Record<string, number>[]

  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number

  mode?: 'static' | 'animated'
}
```

建议规则：

```ts
const domainSource = domainPoints ?? points
```

但需要注意：这会改变 `MiniChart` 当前“显式 domain 必传”的简单模型。若引入，建议保持完全兼容：

| 情况 | 行为 |
|---|---|
| 显式传 `xMin/xMax/yMin/yMax` | 优先使用显式 domain，`domainPoints` 不参与定标 |
| 未传显式 domain | 才使用 `domainPoints ?? points` 自动计算 |
| `mode='animated'` 且未传 `domainPoints` 且未传显式 domain | dev mode warning |

开发态 warning 建议：

```txt
MiniChart: animated mode with auto domain should provide domainPoints to keep axis stable.
```

---

## 6. 是否迁入 `components/Chart`

### 6.1 结论

```txt
暂不迁目录。
```

理由：

- 当前 `MiniChart` 已稳定服务多个 UI 面板；
- 迁目录会牵涉多个 import，收益不如 domain 语义明确；
- 它虽然基于 `BasePhysicsChart`，但定位仍是“UI 小面板趋势图”；
- 在没有实现 API 变更前，不建议只为命名空间一致移动文件。

### 6.2 后续可选方案

如果未来真的需要统一命名空间，可先做 re-export，而不是物理搬迁：

```ts
// components/Chart/index.ts
export { MiniChart } from '@/components/UI/MiniChart'
export type { MiniChartLine, MiniChartStaticLine, MiniChartProps } from '@/components/UI/MiniChart'
```

但本轮不建议实施。

---

## 7. 下一轮可执行改动清单

如果要继续改 MiniChart，建议只做最小安全改动：

| 优先级 | 改动 | 是否建议立即做 |
|---:|---|:---:|
| 1 | 文档注释明确：MiniChart 当前由调用方显式传稳定 domain | ✅ 可做 |
| 2 | dev mode 检查：当 `currentXVal` 超出 `[xMin,xMax]` 时 warning | ✅ 已完成 |
| 3 | 游标 X clamp 到 xDomain，避免时间超过窗口时画出 plot 外 | ✅ 已完成，覆盖 SecondLaw 等固定 xDomain 场景 |
| 4 | `domainPoints` 兼容 API | 暂缓，等出现自动 domain 需求 |
| 5 | 迁入 `components/Chart` | 暂缓 |

---

## 8. 最终决策

| 问题 | 结论 |
|---|---|
| 是否存在 y 轴动态抖动风险 | 当前消费方整体低风险 |
| 是否需要立即加 `domainPoints` | 不需要 |
| 是否需要迁目录到 `components/Chart` | 不需要 |
| 是否需要实现改动 | 已完成 cursor clamp / warning 小修 |
| 下一轮若实现 | 暂无 `domainPoints` 任务；如后续有自动 domain 需求再重评 |

```txt
MiniChart 当前不需要 domainPoints；
它的问题不是“points 与 domainPoints 混用”。
第六轮已补 cursor clamp / warning，显式 domain 语义继续保持。
```
