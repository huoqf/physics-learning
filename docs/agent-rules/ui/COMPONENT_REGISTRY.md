# COMPONENT_REGISTRY — 公共组件调用索引

> 优先级：遵循 `02_UI_RULES.md` 约束
> AI 任务入口：新增或修改动画场景前必须查阅本文件
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

## Import 规则

```ts
// 推荐：子目录 barrel
import { VectorArrow } from '@/components/Physics'
import { Button, ParamControl } from '@/components/UI'
import { AnimationSvgCanvas } from '@/components/Layout'
import { BasePhysicsChart } from '@/components/Chart'

// 页面层可接受：顶层 barrel
import { VectorArrow, Button } from '@/components'

// 禁止：子路径导入
import { VectorArrow } from '@/components/Physics/VectorArrow'
```

---

## Physics 组件（`@/components/Physics`）

### VectorArrow

用途：绘制物理矢量箭头（力、速度、加速度、电场等）。所有矢量必须使用此组件，禁止手写 `<line>` + `<marker>`。

```ts
import { VectorArrow } from '@/components/Physics'
```

必需 props：
- `origin: Vector2` — 矢量起点（物理坐标）
- `vector: Vector2` — 矢量值（物理坐标，y↑正方向）
- `type: VectorType` — 矢量类型（决定默认颜色和参考量级）
- `sceneScale: SceneScale` — 场景缩放参数

常见可选 props：`label`、`color`、`dashed`、`glow`、`strokeWidth`、`pixelLength`

最小示例（来源：`ObliqueThrowAnimation.tsx`）：

```tsx
<VectorArrow
  origin={{ x: ballCanvas.cx, y: -ballCanvas.cy }}
  vector={{ x: currentState.vx, y: currentState.vy }}
  type="velocity"
  sceneScale={sceneScale}
/>
```

禁止：手写 `<line markerEnd="url(#arrow)" />` 实现箭头。

---

### ParticleTrajectory / drawCanvasParticleTrajectory

用途：粒子轨迹统一渲染（历史轨迹 + 预测轨迹 + 拖尾 + 本体球）。所有带电粒子在电场/磁场中的偏转运动页面**必须**使用此组件，禁止手写 `<polyline>` + `<Ball>` 或自定义 Canvas 拖尾绘制。

**选型规则**：
- SVG 页面（使用 `AnimationSvgCanvas`）→ `<ParticleTrajectory />`（React 组件）
- Canvas 页面（使用 `useCanvasViewport`）→ `drawCanvasParticleTrajectory()`（命令式函数）
- 力学直线运动（自由落体、匀加速等）→ 不需要此组件，用 `Ball` 即可

```ts
// SVG 版
import { ParticleTrajectory } from '@/components/Physics'
// Canvas 版
import { drawCanvasParticleTrajectory } from '@/components/Physics'
```

必需 props：
- `historyPoints: { x: number; y: number }[]` — 已走过的历史点集（时间过滤）
- `predictedPoints: { x: number; y: number }[]` — 完整理论/预测轨迹点集（全局虚线参考）
- `tailPoints: { x: number; y: number }[]` — 短拖尾点集（运动增强，取最近 8 个点）
- `isFocus: boolean` — 是否焦点粒子（影响透明度和球体大小）
- `chargeSign: '+' | '-' | 'none'` — 电荷极性（决定基准色）

常见可选 props：`customBaseColor`（经典力学自定义颜色）

最小示例（来源：`ChargeInEField.tsx`）：

```tsx
<ParticleTrajectory
  historyPoints={historyPoints}
  predictedPoints={predictedPoints}
  tailPoints={tailPoints}
  isFocus
  chargeSign="+"
/>
```

派生数据模式：

```tsx
const historyPoints = useMemo(() => {
  return trajectory
    .filter(pt => pt.t <= currentTime)
    .map(pt => ({ x: pt.x, y: pt.y }))
}, [trajectory, currentTime])

const predictedPoints = useMemo(() => {
  return trajectory.map(pt => ({ x: pt.x, y: pt.y }))
}, [trajectory])

const tailPoints = useMemo(() => {
  return historyPoints.slice(-8)
}, [historyPoints])
```

渲染层级（从底到顶）：
A. 预测轨迹虚线（`CANVAS_STYLE.dash.predictedTrajectory` [2,3]，更淡更密）
B. 历史轨迹虚线（`CANVAS_STYLE.dash.trajectory` [5,4]）
C. 拖尾实线渐变（`CANVAS_STYLE.stroke.tailLineWidth` 2.4）
D. 粒子本体球（`CANVAS_STYLE.object.pointMassRadius` 6）

禁止：手写 `<polyline>` + `<Ball>` 组合实现粒子轨迹。

#### drawCanvasParticleTrajectory（Canvas 版）

用途：Canvas 2D 粒子轨迹渲染，功能与 SVG `ParticleTrajectory` 对等。适用于使用 `useCanvasViewport` + `setupFrame()` 的 Canvas 渲染页面。

```ts
import { drawCanvasParticleTrajectory } from '@/components/Physics'
```

必需参数（`DrawParticleTrajectoryOptions`）：
- `ctx: CanvasRenderingContext2D` — Canvas 上下文（来自 `setupFrame()`）
- `px: number` — 粒子当前 X 像素坐标
- `py: number` — 粒子当前 Y 像素坐标
- `historyPoints: { x: number; y: number }[]` — 已走过的历史点集
- `isFocus: boolean` — 是否焦点粒子

常见可选参数：`predictedPoints`、`tailPoints`、`chargeSign`（`'+' | '-' | 'none'`）、`customBaseColor`

最小示例（来源：`CircularGeometryModel.tsx`）：

```tsx
const historyPoints = useMemo(() => {
  const pts: { x: number; y: number }[] = []
  for (let t = 0; t <= time; t += 0.01) {
    const s = getParticleState(t)
    pts.push({ x: px(s.px), y: py(s.py) })
  }
  return pts
}, [time, getParticleState, px, py])

const tailPoints = useMemo(() => {
  return historyPoints.slice(-8)
}, [historyPoints])

useEffect(() => {
  const ctx = setupFrame()
  if (!ctx) return
  const curState = getParticleState(time)
  drawCanvasParticleTrajectory({
    ctx,
    px: px(curState.px),
    py: py(curState.py),
    historyPoints,
    tailPoints,
    isFocus: true,
    chargeSign: q > 0 ? '+' : '-',
  })
}, [time, historyPoints, tailPoints, ...])
```

禁止：手写 `ctx.arc()` + `ctx.globalAlpha` 渐变循环实现粒子拖尾。

### PhysicsGround

用途：绘制地面/斜面/传送带，支持多种纹理和角度。

```ts
import { PhysicsGround } from '@/components/Physics'
```

最小示例（来源：`FreeFallScene.tsx`）：

```tsx
<PhysicsGround
  x={0} y={groundY}
  width={designWidth}
  fontFamily={font}
/>
```

---

### Ball

用途：质点/小球渲染，含材质变体（钢珠、摆球、行星等）。禁止手绘 `<circle>` + `<radialGradient>`。
> **注意**：带轨迹的粒子运动场景（平抛、斜抛、电磁偏转等）应使用 `ParticleTrajectory`（SVG）或 `drawCanvasParticleTrajectory`（Canvas），它们内部已包含粒子本体渲染。`Ball` 仅用于静态展示的球体或不需要轨迹的场景（如参考对照球、弹簧振子、自由落体等）。

```ts
import { Ball } from '@/components/Physics'
```

最小示例（来源：`FreeFallScene.tsx`）：

```tsx
<Ball
  cx={ballX}
  cy={groundY - ballRadius}
  r={ballRadius}
  type="steel"
/>
```

---

### Block

用途：滑块/木块/小车渲染，含摩擦面、标注。禁止手绘 `<rect>`。

```ts
import { Block } from '@/components/Physics'
```

最小示例（来源：`KinematicsAdvancedAnimation.tsx`）：

```tsx
<Block
  x={blockX}
  y={groundY - blockHeight}
  width={blockWidth}
  height={blockHeight}
  type="metal"
/>
```

---

### VectorDefs

用途：SVG `<defs>` 箭头 marker 定义，与 VectorArrow 配套使用。

```ts
import { VectorDefs } from '@/components/Physics'
```

最小示例：

```tsx
<svg>
  <VectorDefs />
  {/* 使用 VectorArrow 的场景内容 */}
</svg>
```

---

### Spring

用途：弹簧 SVG 组件（位于 `@/components/UI`）。

```ts
import { Spring } from '@/components/UI'
```

最小示例（来源：`SimpleHarmonicAnimation.tsx`）：

```tsx
<Spring
  x1={springOriginX}
  y1={springOriginY}
  x2={blockCenterX}
  y2={springOriginY}
  coils={8}
  amplitude={12}
/>
```

---

### SportsCar

用途：流线型运动小车，含车轮旋转和空气尾流线。禁止手绘跑车车身。

```ts
import { SportsCar } from '@/components/Physics'
```

最小示例（来源：`AccelerationAnimation.tsx`）：

```tsx
<SportsCar
  x={carX}
  y={groundY - carHeight}
  width={56}
  height={26}
/>
```

---

### EnergyBars

用途：能量柱状条（动能/势能/总能），用于能量守恒等场景。

```ts
import { EnergyBars } from '@/components/Physics'
```

---

### CapacitorPlates

用途：平行板电容器，支持电荷标识。

```ts
import { CapacitorPlates } from '@/components/Physics'
```

---

### ConductingRod

用途：导体棒，用于电磁感应场景（切割磁感线等）。

```ts
import { ConductingRod } from '@/components/Physics'
```

---

## Layout 组件（`@/components/Layout`）

### AnimationSvgCanvas

用途：动画 SVG 画布容器，配合 `useAnimationViewport` 使用。所有新动画页面必须使用此组件。

```ts
import { AnimationSvgCanvas } from '@/components/Layout'
```

必需 props：
- `containerRef: RefObject<HTMLDivElement | null>` — 容器 ref
- `transform: string` — vp.transform 字符串
- `children: React.ReactNode` — SVG 场景内容

最小示例（来源：`project_rules.md §4 铁律 1 展开`）：

```tsx
const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })

<AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
  <Scene font={canvasSize.font} />
</AnimationSvgCanvas>
```

禁止：使用固定 `viewBox` + `vp.transform` 双重缩放。

---

### ThreePanel

用途：三栏主布局（左参数 / 中画布 / 右公式）。

```ts
import { ThreePanel } from '@/components/Layout'
```

最小示例：

```tsx
<ThreePanel
  left={<LeftPanel>...</LeftPanel>}
  center={<AnimationSvgCanvas ...>...</AnimationSvgCanvas>}
  right={<PhysicsPanel>...</PhysicsPanel>}
/>
```

---

## UI 组件（`@/components/UI`）

### LeftPanel / LeftPanelSection

用途：左屏控制台顶层容器和分区卡片。左屏必须使用此体系。

```ts
import { LeftPanel, LeftPanelSection, LeftPanelScrollArea } from '@/components/UI'
```

最小示例：

```tsx
<LeftPanel>
  <LeftPanelScrollArea>
    <LeftPanelSection title="模型选择">
      <ControlPanel ... />
    </LeftPanelSection>
    <LeftPanelSection title="参数调节">
      <ParamControl ... />
    </LeftPanelSection>
  </LeftPanelScrollArea>
</LeftPanel>
```

---

### ParamControl

用途：参数滑块控件，由 `paramMeta` 驱动生成左屏数值参数区。

```ts
import { ParamControl } from '@/components/UI'
```

必需 props：
- `params: ParamConfig[]` — 参数配置数组
- `onParamChange: (key: string, value: number) => void` — 参数变更回调

最小示例：

```tsx
<ParamControl
  params={[
    { key: 'mass', label: '质量 m', value: params.mass, min: 0.1, max: 10, step: 0.1, unit: 'kg' },
  ]}
  onParamChange={(key, val) => updateParam(key, val)}
/>
```

---

### ControlPanel

用途：声明式左屏控件渲染器，由 `controlMeta` 生成模式/开关/预设/提示。

```ts
import { ControlPanel } from '@/components/UI'
```

必需 props：
- `controls: ControlMeta[]` — 控件配置数组（来自 `@/data/types`）
- `params: Record<string, number>` — 当前参数
- `updateParam / setParams / resetAnimation / restartAnimation` — 回调函数

---

### BasePhysicsChart

用途：所有新图表的原子容器（双轴/网格/刻度/轴标签）。

```ts
import { BasePhysicsChart } from '@/components/Chart'
```

必需 props：
- `xDomain: [number, number]` — X 轴范围
- `yDomain: [number, number]` — Y 轴范围
- `xLabel: string` — X 轴标签
- `yLabel: string` — Y 轴标签

最小示例：

```tsx
<BasePhysicsChart
  xDomain={[0, tMax]}
  yDomain={[yMin, yMax]}
  xLabel="t / s"
  yLabel="v / (m·s⁻¹)"
>
  <ChartCursor x={currentTime} />
</BasePhysicsChart>
```

---

### Button / Slider / SegmentedControl / ToggleSwitch

用途：基础 UI 控件，详见源码 interface。

```ts
import { Button, Slider, SegmentedControl, ToggleSwitch } from '@/components/UI'
```
