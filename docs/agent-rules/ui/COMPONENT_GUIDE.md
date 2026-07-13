# COMPONENT_GUIDE — 组件详细参考

> 按需阅读：当 `COMPONENT_REGISTRY.md` 速查索引不够用时查阅本文件。
> 包含：完整 props 说明、禁止写法、派生数据模式、渲染层级。
> 最后更新：2026-07-13

---

## 编写铁律

Registry 中的示例**不得凭经验手写**，必须同时满足：

1. 读取组件源码 interface / type 定义；
2. 至少参考一个 `src/features/` 中的真实调用；
3. 示例中的必需 props 不得省略；
4. 如源码与文档冲突，以源码为准；
5. 示例应保持"最小可运行"，而不是"伪代码"。

---

## VectorArrow

**禁止**：手写 `<line markerEnd="url(#arrow)" />` 实现箭头。

- `origin: Vector2` — 矢量起点（物理坐标）
- `vector: Vector2` — 矢量值（物理坐标，y↑正方向）
- `type: VectorType` — 矢量类型（决定默认颜色和参考量级）
- `sceneScale: SceneScale` — 场景缩放参数
- 可选：`label`、`color`、`dashed`、`glow`、`strokeWidth`、`pixelLength`

---

## ParticleTrajectory

**选型规则**：
- SVG 页面 → `<ParticleTrajectory />`
- Canvas 页面 → `drawCanvasParticleTrajectory()`
- 力学直线运动 → 用 `Ball`，不需要此组件

**必需 props**：
- `historyPoints: { x: number; y: number }[]` — 已走过的历史点集
- `predictedPoints: { x: number; y: number }[]` — 完整理论轨迹点集
- `tailPoints: { x: number; y: number }[]` — 短拖尾点集（取最近 8 个点）
- `isFocus: boolean` — 是否焦点粒子
- `chargeSign: '+' | '-' | 'none'` — 电荷极性

**派生数据模式**：

```tsx
const historyPoints = useMemo(() =>
  trajectory.filter(pt => pt.t <= currentTime).map(pt => ({ x: pt.x, y: pt.y })),
  [trajectory, currentTime])

const predictedPoints = useMemo(() =>
  trajectory.map(pt => ({ x: pt.x, y: pt.y })),
  [trajectory])

const tailPoints = useMemo(() => historyPoints.slice(-8), [historyPoints])
```

**渲染层级**（从底到顶）：
A. 预测轨迹虚线（`[2,3]`，更淡更密）
B. 历史轨迹虚线（`[5,4]`）
C. 拖尾实线渐变（线宽 2.4）
D. 粒子本体球（半径 6）

**禁止**：手写 `<polyline>` + `<Ball>` 组合实现粒子轨迹。

---

## drawCanvasParticleTrajectory（Canvas 版）

**必需参数**：
- `ctx: CanvasRenderingContext2D`
- `px: number` — 粒子当前 X 像素坐标
- `py: number` — 粒子当前 Y 像素坐标
- `historyPoints` — 历史点集
- `isFocus: boolean`

**禁止**：手写 `ctx.arc()` + `ctx.globalAlpha` 渐变循环实现粒子拖尾。

---

## EnergyBars

- `items: EnergyBarItem[]` — 每项：`{ key, label, value, color, textColor?, displayValue? }`
- 可选：`initialEtot`（总能参考线）、`title`、`font`、`compact`、`hasCollision` + `collisionKey`

**禁止**：手写 `<div>` 柱状图实现能量分配。

---

## CapacitorPlates

- `x`, `y`, `width`, `gap` — 极板位置和尺寸
- `chargeSign?: ChargeSign | number` — 电荷极性
- `showField?: boolean` — 电荷符号（默认 true）
- `thickness?: number` — 极板厚度（默认 10）
- `showElectricFieldLines?: boolean` — 匀强电场线（默认 false）

**禁止**：手绘 `<rect>` + `<line>` 模拟电容器极板。

---

## ConductingRod

- `type: 'horizontal' | 'inclined' | 'side-view'` — 渲染模式
- 可选：`x`（默认 250）、`theta`（默认 30）、`currentDir`（`'in' | 'out' | 'none'`）、`spacing`（默认 100）、`L`（默认 4.0）

**禁止**：手绘 `<line>` + `<circle>` 模拟导体棒。

---

## Incline

- `x0`, `y0` — 左下角直角顶点坐标
- `width`, `height` — 底边宽度和垂直高度

**禁止**：手绘 `<polygon>` 模拟斜面体。

---

## Pulley

- `cx`, `cy` — 滑轮圆心坐标
- 可选：`r`（默认 12）、`hangerTopY`（不传则只渲染滑轮主体）

**禁止**：手绘 `<circle>` + `<line>` 模拟滑轮。

---

## BarMagnet

- `pole: 1 | -1` — 1=左S右N，-1=左N右S
- 可选：`x`/`y`、`width`（默认 120）、`height`（默认 36）

**禁止**：手绘 `<rect>` + `<text>` 模拟条形磁铁。

---

## HandRule

- `mode: 'right' | 'left' | 'fist'` — 右手定则/左手定则/握拳
- `thumbDir: Vec2` — 拇指方向（右→v，左→F）
- `indexDir: Vec2` — 食指方向（B）
- `middleDir: Vec2` — 中指方向（I）
- `cx`, `cy` — 掌心中心
- 可选：`scale`、`draggable`、`active`、`font`、`isBack`

---

## VelocityTimeChart

- `points: { t: number; v: number }[]` — 数据点
- 可选：`mode`（`'animated'` | `'static'`）、`currentTime`、`tMax`、`vRange`、`title`、`xLabel`/`yLabel`、`additionalSeries`、`showArea`、`showCursor`、`stages`（阶段着色）

**禁止**：手绘 `<polyline>` + `<rect>` 实现 v-t 图。

---

## RelationChart

- `points: { x: number; y: number }[]` — 完整数据点
- `xDomain`, `yDomain` — 坐标轴范围
- 可选：`title`、`xLabel`/`yLabel`、`cursorX`、`cursorVariant`、`series`、`additionalSeries`、`markers`

**注意**：`points` 必须是完整曲线，不适用于随时间截断的场景（会触发坐标轴拉伸 bug）。此类需求用 `VelocityTimeChart` + `domainPoints`。

---

## ChartCursor

- `x: number` — 当前 X 值
- `dataPoints: { y: number; label: string; series?: ChartSeriesVariant }[]`

---

## ChartLine

- `points: { x: number; y: number }[]` — 数据点
- 可选：`series`、`color`、`strokeWidth`（默认 2）、`dash`、`xRange`
