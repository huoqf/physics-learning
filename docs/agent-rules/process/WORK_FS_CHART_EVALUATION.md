# WorkFSChart 限定评估

> 日期：2026-06-22  
> 范围：只评估 `src/features/mechanics/energy/WorkFSChart.tsx`，不做迁移、不改实现、不扩展到其他图表。  
> 目标：优先验证 `RelationChart + ChartArea + ChartCursor` 能否干净表达；若不能，再在“保留 `WorkFSChart` / 抽 `ForceDisplacementChart`”之间决策。

---

## 1. 当前真实能力

### 1.1 输入 props

`WorkFSChart` 当前是 Work 页面强业务适配组件，输入直接来自 `WorkAnimation`：

```ts
interface WorkFSChartProps {
  canvasSize: { width: number; height: number }
  font: (size: number) => number
  F: number
  angleDeg: number
  m: number
  mu: number
  g: number
  sTarget: number
  currentS: number
  mode: 0 | 1
}
```

这些 props 不是纯图表数据 API，而是物理业务参数 API：组件内部会自行计算 `Fx`、调用 `computeWorkFSeries`，并根据 `mode` 切换两套教学表达。

### 1.2 F-s / W-s 曲线逻辑

| 模式 | 曲线语义 | 数据来源 | 表达方式 |
|---|---|---|---|
| 基础模式 `mode=0` | 恒力水平分量 `Fx`-s | 组件内 `Fx = F cosθ` | 单条水平线 + 面积 `Fx·s` |
| 进阶模式 `mode=1` | `WF` / `|Wf|` / `Wnet` 随 s 变化 | `computeWorkFSeries(F, angleDeg, m, mu, g, sTarget)` | 多曲线：两条实线 + 一条合功虚线 |

注意：进阶模式虽然文件注释称“F-s 复合”，但实际 Y 轴是 `W / |f|·s (J)`，更接近 W-s / 功随位移变化图，不是单纯的力-位移图。

### 1.3 面积逻辑

| 模式 | 面积含义 | 实现方式 | 是否通用 |
|---|---|---|---|
| 基础模式 | `Fx·s = W`，用矩形面积解释恒力做功 | 理论总面积浅填充 + 当前已做功深填充 | 可抽象，但与 Work 教学文案强绑定 |
| 进阶模式 | `WF` 与 `|Wf|` 随位移增长的面积/区域视觉 | 两个多边形面积路径，随 `currentS` 截断 | 抽象难度较高，且语义不是通用 RelationChart 面积 |

### 1.4 动态与游标

| 能力 | 当前实现 |
|---|---|
| 动态增长 | 基础模式面积随 `currentS` 增长；进阶模式曲线按 `currentS` 截断 |
| 当前位移游标 | 基础模式：从 x 轴到 `Fx` 水平线；进阶模式：贯穿全图垂直虚线 |
| 理论参考线 | 基础模式：完整 `Fx` 水平线 / 总面积；进阶模式：`WF`、`|Wf|` 完整灰色虚线，`Wnet` 完整橙色虚线 |
| 教学注释 | `Fx = ... N`、`面积 = Fx·s = W`、三曲线图例 |

### 1.5 坐标轴与 domain

| 项 | 当前实现 |
|---|---|
| 布局 | 本地 `FS_LAYOUT`，按 `canvasSize` 百分比计算 padding |
| X domain | 硬编码 `sMax = 20` |
| Y domain | 硬编码 `fMax = 50` |
| scale | 本地 `toX(s)` / `toY(f)` |
| 坐标轴 / 网格 / 刻度 | 全部手写 SVG |
| 负值处理 | 当前 Y domain 从 0 到 `fMax`，对负功/负 `Fx` 的视觉表达能力有限，依赖页面参数范围与教学模式规避 |

这说明 `WorkFSChart` 的最大技术债不是“没迁到组件”，而是 domain/scale/axis/grid 规则仍在业务文件内硬编码。

### 1.6 与 WorkAnimation 的耦合程度

`WorkFSChart` 与 `WorkAnimation` 强耦合：

- 输入是 Work 业务参数，不是通用 `{x, y}` 数据；
- `mode=0/1` 与 Work 页面基础/进阶教学模式绑定；
- 进阶图依赖 `computeWorkFSeries` 的业务字段：`WF`、`Wf_abs`、`Wnet`；
- 颜色、图例、注释均围绕“恒力做功 / 摩擦力做功 / 合功”组织；
- 在 `WorkAnimation` 中与 `WorkVTChart`、`WorkEnergyBar` 组成固定左右布局。

---

## 2. 复用场景搜索结论

本轮只做检索，不迁移。

### 2.1 已发现的直接使用

| 使用点 | 结论 |
|---|---|
| `WorkAnimation.tsx` | 唯一直接 import / render `WorkFSChart` 的页面 |

### 2.2 已发现的相似图表语义

| 文件 | 图表语义 | 与 WorkFSChart 的相似点 | 差异 |
|---|---|---|---|
| `SpringForceCenterExtra.tsx` | F-x 胡克定律图，面积表示弹性势能 | 都是 F-x / 面积教学图 | 中心坐标轴、正负位移/弹力、三角形面积、嵌入式小图，和 WorkFSChart 的 Work 双模式差异较大 |
| `ForceMotionTripleChart.tsx` | F-t 面积表示冲量、v-t 面积表示位移 | 都有面积、游标、动态截断 | 是时间图三联图，不是 F-s/W-s；已有自定义 SingleChart + 公共插件 |
| `KineticEnergyCharts.tsx` | W-x / Ek-x / Ep-x | 都涉及功/能量随位移关系 | 已用 `RelationChart`，没有 WorkFSChart 的双模式面积教学 |
| `UniformAcceleration*` / `VerticalThrowCharts` | v-t 面积教学 | 都有面积教学 | 已属于 V-T / Y-T 语义，不是 F-s/W-s |

### 2.3 复用需求判断

当前项目中确实存在“F-x 面积”这一教学语义的潜在复用点（例如弹簧 F-x 图），但尚未形成足够一致的公共 API 需求：

- `WorkFSChart` 是恒力做功 / 摩擦做功 / 合功的业务图；
- `SpringForceCenterExtra` 是胡克定律与弹性势能三角形面积图；
- 二者都可归入“大类 F-x 面积图”，但图形结构、坐标域、轴位置、面积形状、业务注释差异明显。

因此，当前只能判定为：**有潜在复用方向，但不足以立即抽一个稳定的 `ForceDisplacementChart`。**

---

## 3. `RelationChart + 插件` 能力边界验证

补充信息确认了当前公共图表体系已有三层能力：

```txt
BasePhysicsChart / ChartContext
  ↓
ChartArea / ChartCursor / ChartTangent / ChartSecant
  ↓
VelocityTimeChart / DisplacementTimeChart / AccelerationTimeChart / RelationChart
```

因此，`ForceDisplacementChart` 不应作为第二选择之前的默认抽象。应先判断现有 `RelationChart + ChartArea + ChartCursor` 是否能覆盖。

### 3.1 RelationChart 已具备的能力

| 能力 | RelationChart 当前支持情况 | 对 WorkFSChart 的意义 |
|---|---|---|
| 多 series | ✅ `additionalSeries` | 可表达 `WF` / `|Wf|` / `Wnet` 多曲线 |
| 自定义 x/y label | ✅ `xLabel` / `yLabel` | 可表达 `s (m)`、`F (N)` 或 `W (J)` |
| 稳定 domain | ✅ `xDomain` / `yDomain` 显式传入 | 可避免硬编码轴范围，但需调用方计算完整 domain |
| reference line | ✅ `markers` vertical / horizontal / point | 可表达完整参考线、临界点、当前位移竖线的一部分 |
| cursor | ✅ `cursorX` + 插值 | 可表达当前 `currentS` 对主曲线及 additionalSeries 的点 |
| 自定义颜色 / 线型 | ✅ `color`、`series`、`strokeDasharray` | 可表达 work/friction/forceNet 多语义曲线 |
| 图例 | ✅ 多 series 时显示 | 可表达基础多曲线图例，但格式较通用 |
| 动态截断 | ⚠️ 不内建 | RelationChart 假设 `points` 是完整曲线；若传截断 points 会影响自动定标，必须显式 domain 或改渲染策略 |
| 面积填充 | ❌ 不内建 | WorkFSChart 的核心做功面积无法直接由 RelationChart 表达 |
| 插件插槽 | ❌ 当前无 `children` / `underlay` | `ChartArea` / 自定义面积层不能直接插入 RelationChart 内部坐标系 |

### 3.2 ChartArea / ChartCursor 能否补齐

| 插件 | 能力 | 当前组合限制 |
|---|---|---|
| `ChartArea` | 可在 `ChartContext` 内按物理坐标生成面积 | 需要处于 `BasePhysicsChart` 的 children 中；`RelationChart` 当前不暴露 children/underlay 插槽，不能作为外部 sibling 直接叠加 |
| `ChartCursor` | 可在 `ChartContext` 内绘制标准游标 | `RelationChart` 已有 cursorX；若需要 WorkFSChart 现有“基础模式短游标 / 进阶贯穿游标”差异，仍需自定义层 |
| `markers` | 可画 vertical/horizontal/point 参考线 | 可覆盖部分 reference line，但不覆盖面积和动态截断路径 |

关键点：**`ChartArea` 和 `ChartCursor` 是 ChartContext 插件，不是 DOM sibling 插件。** 现有 `RelationChart` 内部创建了 `BasePhysicsChart`，但没有向外暴露插件层，所以“`<RelationChart /> + <ChartArea />`”不能直接组合。要实现组合，至少需要：

```txt
方案 A：给 RelationChart 增加通用 children / underlay 插槽（非业务逻辑）；
方案 B：WorkFSChart 直接使用 BasePhysicsChart + ChartArea + ChartCursor + 自定义 paths；
方案 C：继续手写 SVG，但抽出底层规则。
```

### 3.3 对 WorkFSChart 覆盖率判断

| WorkFSChart 能力 | RelationChart 覆盖 | RelationChart + 插件理论覆盖 | 当前无需改公共组件的实际覆盖 |
|---|---:|---:|---:|
| 多曲线 | ✅ | ✅ | ✅ |
| 坐标轴 / 网格 | ✅ | ✅ | ✅ |
| 显式 domain | ✅ | ✅ | ✅ |
| 当前 `currentS` 游标 | ✅ 基础可覆盖 | ✅ 可自定义 | 部分覆盖 |
| reference line | ✅ markers/series | ✅ | 大部分覆盖 |
| 基础矩形面积 | ❌ | ⚠️ 需自定义/ChartArea | ❌ |
| 进阶多边形面积 | ❌ | ⚠️ 需 ChartArea 或自定义 path | ❌ |
| 动态截断曲线 | ❌ | ⚠️ 需 clip/自定义可见层 | ❌ |
| Work 专属注释 / 图例 | ⚠️ 通用图例 | ✅ 自定义层 | 部分覆盖 |
| 双模式教学表达 | ❌ | ⚠️ 业务层处理 | ❌ |

结论：`RelationChart` 能覆盖 `WorkFSChart` 的“坐标关系图骨架”和部分多曲线/参考线/游标能力，但**不能在不改公共组件的前提下干净覆盖核心面积与动态揭示能力**。若为了 WorkFSChart 向 `RelationChart` 加入业务 mode、面积语义或双模式逻辑，会污染通用组件。

---

## 4. 决策

决策优先级按补充信息调整为：

| 优先级 | 选项 | 结论 | 原因 |
|---:|---|---|---|
| 1 | 用 `RelationChart + ChartArea + ChartCursor` 组合 | 暂不采用 | 方向正确，但当前 `RelationChart` 无插件插槽；面积/动态截断需额外公共能力，不能靠现有 API 干净完成 |
| 2 | 保留 `WorkFSChart`，抽公共底层规则 | ✅ 推荐 | 不污染 `RelationChart`，同时能先解决 domain/scale/axis/cursor/area 样式分散问题 |
| 3 | 抽 `ForceDisplacementChart` | 暂不抽 | 目前复用不足；应等 F-s/W-s 面积图重复出现且组合用法稳定后再抽 |

**评估结论：**

```txt
WorkFSChart 当前应保留为功页面专用教学图；
优先不抽 ForceDisplacementChart；
也不直接迁 RelationChart；
RelationChart + 插件是未来轻适配方向，但当前缺少 underlay/children 插槽和面积/动态揭示能力；
下一步只做 WorkFSChart 的最小底层收口。
```

---

## 5. 若保留，最小收口项

保留 `WorkFSChart` 不等于继续放任它完全自管。下一步建议只做底层规则收口，不改教学结构。

| 收口项 | 当前问题 | 建议 |
|---|---|---|
| scale/domain 计算 | `sMax=20`、`fMax=50` 硬编码 | 抽本地 `computeWorkFSDomain`，至少由 `sTarget`、`Fx`、`fsSeries` 推导，保留必要 padding |
| axis/grid 样式 | 坐标轴、刻度、网格手写且与公共图表重复 | 可抽小型 helper，或逐步复用 `BasePhysicsChart`，但不引入业务 mode 到 `RelationChart` |
| cursor 样式 | 基础/进阶游标样式不完全统一 | 抽 `renderWorkFSCursor` 或统一 stroke、dash、opacity token |
| area fill 规则 | 基础矩形、进阶多边形分散实现 | 抽 `buildAreaPath` / `buildRectArea` 等纯函数；颜色继续用 theme token |
| reference line 样式 | 灰色参考线与公共图表参考线语义相同但实现独立 | 使用统一 `CHART_COLORS.reference`、`STROKE.vectorThin`、`DASH.guide` 规则 |
| 颜色 token | 已基本使用 token，但部分语义混在业务图中 | 保持 `PHYSICS_COLORS.work/friction/forceNet`，不要引入裸色 |
| 纯函数测试 | 路径生成与 domain 计算不可测 | 将 domain、visibleSeries、path 构造抽成纯函数后补单测 |

建议的最小实现边界：

```txt
不创建 ForceDisplacementChart
不迁 RelationChart
不改 WorkAnimation 布局
只在 WorkFSChart 内部或邻近 helper 中抽：
- domain/scale 规则
- visible series 截断规则
- area path 构造
- cursor/reference 样式常量
```

---

## 6. 后续触发重新评估的条件

只有出现以下情况之一，才重新考虑 `ForceDisplacementChart`：

1. 至少两个页面需要同类 F-s / F-x / W-s 面积图，且 API 能稳定收敛到数据驱动形式；
2. `SpringForceCenterExtra` 等 F-x 图准备组件化，并确认可与 WorkFSChart 共用 60% 以上能力；
3. 新增“变力做功 / 弹簧做功 / 图像法求功”专题，需要统一展示 F-x 面积积分；
4. `RelationChart` 自然拥有足够的面积、参考线、游标能力，且无需加入 Work 专属 mode。

在这些条件未满足前，`WorkFSChart` 应作为业务教学图保留，但底层规则要逐步标准化。
