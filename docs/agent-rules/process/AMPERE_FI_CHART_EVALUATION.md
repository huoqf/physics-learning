# AmpereFIChart 限定评估

> 日期：2026-06-22  
> 范围：只评估 `src/features/electromagnetism/magnetism/components/AmpereFIChart.tsx`，不迁移、不改公共组件、不碰其他图表。  
> 目标：判断 `AmpereFIChart` 是否可由 `RelationChart` 干净表达。  
>
> 第四轮执行结果：已在 `AmpereFIChart` 业务适配层内部完成迁移，未改 `RelationChart`，未碰其他图表。

---

## 1. 当前真实能力

### 1.1 输入 props

```ts
interface AmpereFIChartProps {
  x: number
  y: number
  w: number
  h: number
  I: number
  B: number
  L?: number
}
```

该组件当前是嵌入 `AmpereForce.tsx` 主 SVG 的 `<g>` 图表，位置和尺寸由父组件传入：

```tsx
<AmpereFIChart
  x={520}
  y={40}
  w={260}
  h={210}
  I={I}
  B={B}
  L={L}
/>
```

### 1.2 图表语义

| 项 | 当前实现 |
|---|---|
| 图表类型 | F-I 线性关系图 |
| 主曲线 | 一条直线，斜率 `k = B·L` |
| 当前状态 | 当前 `I` 对应的力点 `currentF` |
| 额外标注 | 标题、轴标签、刻度、斜率 `k = BL`、当前力 `F = ... N` |
| 面积 | 无 |
| hover / 拖拽 | 无 |
| 动态增长 | 无；随参数变化整体重算 |
| 教学态 / mode | 无独立 mode；仅在 AmpereForce 基础模式中展示 |

因此它是典型低风险单曲线关系图。

---

## 2. 当前实现风险

### 2.1 domain / scale 硬编码

当前硬编码：

```ts
const iMin = -10.0
const iMax = 10.0
const fMax = 80.0
```

其中 I 范围与参数面板一致：

```ts
I: [-10, 10]
```

但 `fMax = 80` 只覆盖了注释里的示例：

```txt
B = 2.0 T, I = 10.0 A, L = 4.0 m → 80 N
```

实际参数面板里：

```txt
B: [-2, 2]
L: [2, 5]
```

所以理论最大幅值可能是：

```txt
|F|max = |B|max · |I|max · Lmax = 2 · 10 · 5 = 100 N
```

结论：当前 Y domain 有硬编码风险，`L = 5` 且 `|B|`、`|I|` 较大时可能超出既有 `[-80, 80]` 视觉范围。

### 2.2 符号约定需要迁移前确认

当前实现中：

```ts
const slopeK = B * L
line: F = I * slopeK
const currentF = -B * I * L
```

也就是说：

- 理论线按 `F = BLI` 画；
- 当前点按 `F = -BLI` 画。

这会导致在部分参数下“当前点不在理论线上”。这可能来自 SVG 方向约定、安培力方向约定或历史实现误差。无论是否迁移，都应在后续实现前明确：

```txt
F-I 图的纵轴到底表达物理有向力 F，还是画布方向力，或只表达大小 |F|？
```

该问题不是 RelationChart 能力问题，而是业务符号语义需要先统一。

### 2.3 场景绑定程度

`AmpereFIChart` 当前以 `<g>` 形式直接嵌入父 SVG，并使用 `x/y/w/h` 完成布局。这是布局绑定，不是强物理场景绑定：

- 不依赖父 SVG 的坐标变换；
- 不参与主动画几何；
- 不与导轨、手势、粒子轨迹共享 scale；
- 只是右侧信息卡片中的关系图。

因此后续如迁移到 `RelationChart`，可通过 `foreignObject` 嵌入，不必改动主场景物理逻辑。

---

## 3. RelationChart 覆盖情况

| AmpereFIChart 能力 | RelationChart 覆盖情况 | 说明 |
|---|---|---|
| 单曲线 F-I | ✅ | `points={[{x:I, y:F}, ...]}` 可表达 |
| 固定 xDomain | ✅ | 可传 `xDomain={[-10, 10]}` |
| 固定 / 稳定 yDomain | ✅ | 可传 `yDomain={[-100, 100]}` 或按参数上限计算 |
| 当前点 | ✅ | `cursorX={I}` 可插值出当前 F；也可用 marker point |
| 当前数值标签 | ✅ | `cursorLabel` 可显示 `F=...N` |
| 水平 / 垂直 0 参考线 | ✅ 部分 | `showZeroLine` 可显示 Y=0；`markers={[{axis:'vertical', x:0}]}` 可显示 I=0 |
| 多曲线 | 不需要 | 当前无多曲线需求 |
| 面积 | 不需要 | 无面积语义 |
| hover / 切线 | 不需要 | 无交互求导 |
| 图例 | 不需要 | 单曲线 + 公式标注即可 |
| 中心十字箭头轴 | ⚠️ 非完全一致 | `RelationChart` 不画箭头轴，Y 轴默认在左侧；可用 vertical marker 表达 I=0，但视觉不会 1:1 还原 |
| SVG `<g>` 嵌入 | ⚠️ 需适配 | `RelationChart` 是 DOM 图表，需通过 `foreignObject` 嵌入现有父 SVG |

结论：`RelationChart` 能覆盖图表核心语义，不需要新增公共业务能力；差异主要是视觉表现（中心箭头轴）和嵌入方式（`foreignObject`）。

---

## 4. 三选一决策

| 结论 | 判断 | 动作 |
|---|---|---|
| A. `RelationChart` 可干净覆盖 | ✅ 推荐 | 后续可进入小步迁移，但迁移前必须先统一 F-I 符号约定与 yDomain |
| B. 保留组件并收口底层规则 | 可作为备选 | 如果希望保留中心箭头轴视觉，则保留 `<g>` 实现，但至少抽 domain/scale/token/current point |
| C. RelationChart 缺能力 | 不成立 | 当前不需要面积、hover、插件层或业务 mode；无需扩展公共组件 |

**评估结论：**

```txt
AmpereFIChart 是低风险单曲线 F-I 关系图；
RelationChart 可以干净覆盖核心图表语义；
后续可进入小步迁移；
第四轮已完成迁移：统一 F-I 符号约定为 F=-BIL，并把 yDomain 从硬编码 [-80,80] 修正为稳定 ±100N。
```

---

## 5. 若进入小步迁移，建议边界

后续实现应保持小步：

```txt
只改 AmpereFIChart 及必要 import；
不改 RelationChart；
不碰 AmpereForce 主场景物理逻辑；
不处理其他磁场图表；
不混入全量 lint 清理。
```

建议迁移策略：

| 项 | 建议 |
|---|---|
| 嵌入方式 | 保留 `AmpereFIChart` 文件作为业务适配层，内部用 `foreignObject + RelationChart` |
| 数据 | 生成完整 domain points，例如 I ∈ [-10, 10] 的两端点或多采样点 |
| yDomain | 使用参数上限稳定范围，至少覆盖 `[-100, 100]`，或按 `maxAbs = max(|B|,2) * 10 * max(L,5)` 推导 |
| 当前点 | 优先使用 `cursorX={I}`；若只想画点不画十字线，可评估 `markers` point 或 `cursorLabel={() => null}` |
| 参考线 | `showZeroLine` + vertical marker `x=0` |
| 符号 | 迁移前先统一主曲线和当前点公式，避免当前点不在线上 |
| 视觉差异 | 接受不再使用中心箭头轴，除非教学上强依赖；不要为了箭头轴污染 RelationChart |

---

## 6. 若不迁移，最小收口项

若后续决定保留当前 SVG 实现，也只需要做低成本收口：

| 收口项 | 建议 |
|---|---|
| domain | 把 `iMin/iMax/fMax` 抽成 `computeAmpereFIDomain`，修正 `fMax` 覆盖参数上限 |
| scale | 抽 `createAmpereFIScale`，避免 `toPixelX/toPixelY` 分散 |
| path/point | 抽 `buildLineGeometry`、`buildCurrentPoint` |
| token | 集中 axis/grid/currentPoint/line/text token |
| 符号 | 明确主线与当前点使用同一公式 |

但从当前能力看，优先路线仍是后续小步迁移到 `RelationChart`。
