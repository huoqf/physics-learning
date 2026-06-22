# CuttingEMF 图表限定评估

> 日期：2026-06-22  
> 范围：只评估 `src/features/electromagnetism/induction/CuttingEMF.tsx` 内的 V-T / a-T 图表；不迁移、不修既有 lint、不碰其他电磁图表。  
> 目标：判断当前局部 `ChartSVG` 是否可复用 `VelocityTimeChart` / `AccelerationTimeChart`。

---

## 1. 当前真实实现

`CuttingEMF.tsx` 内部定义了局部图表封装：

```tsx
const ChartSVG = React.memo(function ChartSVG(...) {
  return (
    <BasePhysicsChart ...>
      <ChartSVGContent ... />
    </BasePhysicsChart>
  )
})
```

页面上方同时渲染两张图：

| 图表 | 当前标题 | 数据字段 | 当前实现 |
|---|---|---|---|
| V-T | `速度－时间图像 (v-t 图)` | `samplePoints[].v` | `BasePhysicsChart` + 局部 `ChartSVGContent` |
| a-T | `加速度－时间图像 (a-t 图)` | `samplePoints[].a` | `BasePhysicsChart` + 局部 `ChartSVGContent` |

当前已经不是完全裸手写坐标轴，而是**局部使用了 `BasePhysicsChart`**。风险主要在“同类 TimeChart 预设没有复用”和“局部图表内容层重复”。

---

## 2. 当前图表能力清单

| 能力 | V-T | a-T | 说明 |
|---|:---:|:---:|---|
| 显式 xDomain | ✅ | ✅ | `[0, T_max]` |
| 显式 yDomain | ✅ | ✅ | V-T 为 `[-yMax, yMax]`；a-T 为 `[0, yMax]` |
| 完整理论曲线 | ✅ | ✅ | 灰/彩色虚线 `ptsStr`，完整 samplePoints |
| 动态已发生曲线 | ✅ | ✅ | `activePts = samplePoints.filter(p.t <= time)` |
| 当前点 | ✅ | ✅ | 圆点 + pulse 动画 |
| 游标线 | ❌ | ❌ | 当前只画点，不画标准 ChartCursor 竖线/数值卡片 |
| V=0 参考线 | ✅ | 不适用 | V-T 专属 |
| 收尾速度渐近线 | ✅ | 不适用 | V-T 且 `mode===1` 时显示 `v_m` |
| 面积填充 | ❌ | ❌ | 不需要 |
| hover / 拖拽 | ❌ | ❌ | 不需要 |
| 多曲线 | ❌ | ❌ | 不需要 |

---

## 3. 与公共 TimeChart 预设的匹配度

### 3.1 V-T → `VelocityTimeChart`

| 当前需求 | VelocityTimeChart 支持情况 | 结论 |
|---|---|---|
| `{t,v}` 数据 | ✅ | 直接适配 |
| 动态揭示 | ✅ `mode="animated"` + `currentTime` | 可覆盖 |
| 稳定定标 | ✅ `domainPoints` / `vRange` | 可覆盖 |
| 完整理论参考线 | ✅ `showReferenceLine` / `referencePoints` | 可覆盖 |
| V=0 基准线 | ✅ yDomain 跨 0 时 BasePhysicsChart baseline | 可覆盖 |
| 收尾速度渐近线 | ⚠️ 需 children 自定义层 | `VelocityTimeChart` 有 children 插槽，可局部画 horizontal line + label |
| pulse 当前点 | ⚠️ 标准游标不同 | 可接受标准 `ChartCursor`，或 children 自定义当前点 |
| 标题 / 标签 | ✅ title，x/yLabel | 可覆盖 |

**结论：V-T 图可以较干净迁入 `VelocityTimeChart`。** 迁移时建议保留 `CuttingEMF` 内局部业务适配层，把 `samplePoints` 映射为：

```ts
const vtPoints = samplePoints.map(p => ({ t: p.t, v: p.v }))
```

并传入：

```tsx
<VelocityTimeChart
  mode="animated"
  points={vtPoints}
  domainPoints={vtPoints}
  referencePoints={vtPoints}
  currentTime={time}
  tMax={T_max}
  vRange={[-vYMax, vYMax]}
  showReferenceLine
/>
```

收尾速度 `v_m` 可通过 `children` 使用 `useChartContext` 画水平渐近线，避免扩展公共组件。

### 3.2 a-T → `AccelerationTimeChart`

| 当前需求 | AccelerationTimeChart 支持情况 | 结论 |
|---|---|---|
| `{t,a}` 数据 | ✅ | 直接适配 |
| 动态揭示 | ✅ `mode="animated"` + `currentTime` | 可覆盖 |
| 稳定定标 | ✅ `domainPoints` / `aRange` | 可覆盖 |
| 当前点 / 游标 | ✅ `showCursor` + ChartCursor | 可覆盖，但视觉不同于 pulse point |
| 完整理论参考线 | ❌ 当前无 `showReferenceLine` | 不能无改动 1:1 覆盖 |
| children / underlay 插槽 | ❌ 当前无 | 不能局部补参考线 |
| 面积 | ✅ 但不需要 | 无关 |

**结论：a-T 图可部分迁入 `AccelerationTimeChart`，但若要求保留完整理论虚线参考曲线，则当前公共预设能力不足。**

可选策略：

| 策略 | 代价 | 建议 |
|---|---|---|
| 接受视觉简化，仅显示已发生曲线 + cursor | 最小 | 可行，但会丢失当前“完整预测虚线”教学表达 |
| 给 `AccelerationTimeChart` 补 `showReferenceLine` / `referencePoints` | 小幅公共能力扩展 | 更一致，但本轮不做 |
| 继续保留局部 `ChartSVG` | 零迁移 | 当前已经用 `BasePhysicsChart`，风险可控 |

---

## 4. 既有 lint 风险说明

`CuttingEMF.tsx` 当前已有既有 lint 问题，例如：

```txt
React Hook "useMemo" is called conditionally
Unexpected any
```

本轮明确不修。若后续迁移 CuttingEMF 图表，需要单独规划，避免把图表迁移和既有 lint 清理混在一起。

---

## 5. 三选一决策

| 结论 | 判断 | 动作 |
|---|---|---|
| V-T 可迁入 `VelocityTimeChart` | ✅ 推荐后续小步迁移 | 可保持完整参考线，渐近线用 children 自定义 |
| a-T 可迁入 `AccelerationTimeChart` | ⚠️ 部分可行 | 若保留完整参考线，需要先给 AT 预设补通用参考线/children 能力，或接受视觉简化 |
| 保留局部 `ChartSVG` | ✅ 当前可接受 | 已经基于 `BasePhysicsChart`，且不是裸手写坐标轴 |

**评估结论：**

```txt
CuttingEMF 的 V-T 图具备较高迁移可行性，可后续小步迁入 VelocityTimeChart；
a-T 图可复用 AccelerationTimeChart 的动态与定标能力，但当前缺少完整理论参考线/children 插槽，不能无损迁移；
因此不建议一轮强迁两图。后续若推进，优先迁 V-T，或先补齐 AccelerationTimeChart 的通用参考线能力后再迁 a-T。
```

---

## 6. 后续建议边界

如果后续进入实现，建议仍限定：

```txt
只改 CuttingEMF 图表层；
不修既有 lint；
不碰其他电磁图表；
不处理主场景导轨 / 磁场 / 手势层；
不扩展 RelationChart；
如需扩展 AccelerationTimeChart，只加与 VelocityTimeChart 对齐的通用 reference line / children 能力。
```
