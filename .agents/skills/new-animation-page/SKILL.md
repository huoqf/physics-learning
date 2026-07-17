---
name: new-animation-page
description: 新建动画页面 / 创建新的物理动画组件 / 新增动画场景 / 添加新的 feature 动画 / 实现新动画
---

# 新建动画页面 Skill

> 在写第一行代码前，必须逐项过完本 Skill。所有「❌ 禁止」一旦出现即视为任务无效。

---

## Step 0：设计决策（代码前确认）

### 0A：布局 preset 选择

> **分屏是主流**：动画配合物理图表更能帮助学生理解过程和解题，大量页面使用 `splitV` 或 `splitH`。`full` 适合无需图表的纯场景演示。

| preset | 设计尺寸 | 选用条件 |
|--------|---------|---------|
| `CANVAS_PRESETS.splitV` | 840×325 | **水平运动**场景（追及、碰撞、平抛水平分量）：动画横向展开，图表放上方；或多图表并列展示（v-t + x-t + a-t）|
| `CANVAS_PRESETS.splitH` | 420×650 | **垂直/斜向运动**场景（自由落体、斜抛、弹簧振子）：动画纵向展开，图表放右侧 |
| `CANVAS_PRESETS.full` | 840×650 | 无需配套图表的纯动画演示（光的折射/反射、磁场分布、静电场分布等） |
| `CANVAS_PRESETS.square` | 650×650 | 圆形/旋转对称（圆周运动、向心力） |

**决策直觉**：
- 物体主要在**水平方向**运动 → `splitV`（图表在上，动画在下，画布矮宽）
- 物体主要在**垂直/竖直方向**运动 → `splitH`（动画在左，图表在右，画布高窄）
- 需要**多图表同时展示**（如 v-t + x-t）→ `splitV`（上方宽度足够排列多图表）
- 无配套图表 → `full`；圆形对称 → `square`

> ❌ 严禁 `wide`/`tall` 等废弃 preset；严禁手写 `width={840}` 固定像素。


### 0B：三屏内容分配（铁律）

```
左屏（LeftPanel）         中屏（AnimationSvgCanvas）         右屏（由框架渲染）
─────────────────         ─────────────────────────         ─────────────────────
paramMeta → 数值参数      动画场景 SVG 主体                  QuantitySection 物理量
controlMeta → 模式开关    可选：CenterExtra 图表              FormulaSection 公式+条件
SidebarExtra（仅复杂）    ❌ 禁止大段教学文字                ExamPointSection 高考要点
                          ❌ 禁止完整公式推导                ❌ 禁止参数控件
                          ❌ 禁止高考考点总结
```

**主屏 SVG 文字约束**：只允许出现物理量数值标注（`v = 3.2 m/s`）和坐标轴标签。禁止教学说明段落。


### 0C：controlsMode 选择

**高中物理动画默认选 `timed`。**

| 模式 | 值 | 典型场景 |
|------|---|---------|
| 完整控制栏 | `'timed'`（**默认**，可省略） | 自由落体、碰撞、投射、气体、光学 — **绝大多数** |
| 参数提示条 | `'param'` | 静态受力图、平衡条件、娜娜、欧姆嵌套 |
| 循环速度栏 | `'loop'` | 圆周运动、分子热运动、交变波形 — 少数 |

判断顺序：
1. 动画有明确过程（起点/终点/时间推进）？→ `'timed'`
2. 画面只随参数变化，无时间轴？→ `'param'`
3. 永续循环无终点？→ `'loop'`


### 0D：其余参数

| 项 | 说明 |
|----|------|
| `anchor` | `'center'`（大多数）/ `'viewport'`（充满型）/ `'bottom'`（落地型） |
| `physicsWidth / physicsHeight` | 场景真实物理尺寸（米） |
| 是否需要 `CenterExtra` | 需要实时图表时才加 |

---

## Step 1：文件结构（必须遵守）

```
src/features/<domain>/<topic>/
├── <Topic>Animation.tsx          ← 薄编排层（store + 组件组合，零物理公式）
├── hooks/
│   └── use<Topic>Physics.ts     ← 纯物理计算 hook（零 JSX，零副作用）
├── components/
│   └── <Topic>Scene.tsx         ← SVG 渲染（零物理公式，零 store 访问）
└── index.ts
```

如有 CenterExtra：根目录追加 `<Topic>CenterExtra.tsx`。

**viewModel 约束**：如有 `model/viewModel.ts`，只返回物理坐标（y↑正），**禁止**引入 `vp.scale/transform/visibleW/H` 或任何 SVG 坐标。

---

## Step 2：骨架代码（替换 `<Topic>` → 实际名称）

### `<Topic>Animation.tsx`

```tsx
import { useAnimationViewport, useSceneScale, useAnimationLifecycle } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { use<Topic>Physics } from './hooks/use<Topic>Physics'
import { <Topic>Scene } from './components/<Topic>Scene'

export default function <Topic>Animation() {
  // ── 1. Store（精确订阅，高频字段单独隔离）──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // ── 2. Viewport（新页面唯一标准路径）──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,   // ← Step 0A 决策结果
  })

  // ── 3. 参数提取 ──
  const { v0 = 0, a = 1 } = params

  // ── 4. 物理计算（hook，不在 JSX 中写公式）──
  const physics = use<Topic>Physics({ v0, a, time })

  // ── 5. SceneScale（禁止手写 x * scale + offset）──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,   // ← 与上方一致
    anchor: 'center',               // ← Step 0D
    physicsWidth: 10,               // ← Step 0D（米）
    physicsHeight: 8,
  })

  // ── 6. 渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <<Topic>Scene physics={physics} canvasSize={canvasSize} sceneScale={sceneScale} />
      </AnimationSvgCanvas>
    </div>
  )
}
```

> **splitV/splitH 布局模式**（图表+动画分区）：
> ```tsx
> // splitV：上图表 + 下动画，flex-col，各自独立 div，禁止互相嵌套
> return (
>   <div className="w-full h-full flex flex-col">
>     <div className="h-[310px] shrink-0">
>       <VelocityTimeChart points={vtPoints} currentTime={time} tMax={10} title="v-t" />
>     </div>
>     <div className="flex-1 min-h-0">
>       <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
>         <<Topic>Scene ... />
>       </AnimationSvgCanvas>
>     </div>
>   </div>
> )
> ```

### `hooks/use<Topic>Physics.ts`

```ts
import { useMemo } from 'react'

interface Use<Topic>PhysicsParams {
  v0: number   // 初速度 m/s
  a: number    // 加速度 m/s²
  time: number // 时间 s
}

export interface <Topic>PhysicsResult {
  x: number    // 位置 m（物理坐标，y↑正）
  y: number
  v: number    // 速度 m/s
}

/**
 * 计算 <Topic> 物理状态
 * @param v0 - 初速度 (m/s)
 * @param a  - 加速度 (m/s²)
 * @param time - 时间 (s)
 */
export function use<Topic>Physics({ v0, a, time }: Use<Topic>PhysicsParams): <Topic>PhysicsResult {
  return useMemo(() => {
    // 纯物理计算，无副作用，无 DOM/React/window/store 依赖
    const x = v0 * time + 0.5 * a * time * time
    const v = v0 + a * time
    return { x, y: 0, v }
  }, [v0, a, time])
}
```

### `components/<Topic>Scene.tsx`

```tsx
// ✅ barrel import，禁止子路径 @/components/Physics/Ball
import { Ball, PhysicsGround, VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { <Topic>PhysicsResult } from '../hooks/use<Topic>Physics'

interface <Topic>SceneProps {
  physics: <Topic>PhysicsResult
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
}

export function <Topic>Scene({ physics, canvasSize, sceneScale }: <Topic>SceneProps) {
  const { font } = canvasSize

  // 物理坐标 → 设计坐标（唯一合法路径）
  const ballPos = worldToDesign({ x: physics.x, y: physics.y }, sceneScale)

  return (
    <g>
      {/* 场景器材：用现有组件，禁止手写 SVG 基础图形替代 */}
      <PhysicsGround x={40} y={560} width={760} type="ground" fontFamily={font} />

      {/* 物体：用 Ball/Block/SportsCar 等，禁止手画 circle/rect */}
      <Ball cx={ballPos.x} cy={ballPos.y} r={20} type="steel" />

      {/* 矢量箭头：禁止手写 <line>+<marker> */}
      <VectorArrow
        originDesign={ballPos}
        vector={{ x: physics.v, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        label="v"
        font={font}
      />

      {/* SVG 文字：只标注物理量数值，font() 包裹，禁止裸 fontSize={N} */}
      <text
        x={ballPos.x}
        y={ballPos.y - 30}
        fontSize={font(11)}
        fill={PHYSICS_COLORS.velocity}
        textAnchor="middle"
      >
        {`v = ${physics.v.toFixed(1)} m/s`}
      </text>

      {/* 网格/轴线：用 CANVAS_COLORS，禁止 colors.neutral[200] */}
      {/* <line stroke={CANVAS_COLORS.grid} ... /> */}
    </g>
  )
}
```

---

## Step 3：Registry 注册（5 个文件，同一任务必须全部完成）

### 3A：动画注册表（`src/data/registries/<domain>.ts`）

```ts
import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const <domain>Animations = defineAnimations({
  'anim-<topic>': {
    title: '动画标题',
    knowledgeId: '<domain>-x-x',
    Component: lazy(() => import('@/features/<domain>/<topic>/<Topic>Animation')),
    controlsMode: 'timed',   // ← Step 0C 决策结果
    defaultParams: {
      v0: 5,
      a: 2,
    } as const,              // ← 必须 as const（编译期类型校验）
    paramMeta: [
      { key: 'v0', label: '初速度', min: 0, max: 20, step: 0.5, unit: 'm/s', group: '运动参数' },
      { key: 'a',  label: '加速度', min: -10, max: 10, step: 0.1, unit: 'm/s²' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,  // 切换模式自动重置时间
        options: [{ label: '基础', value: 0 }, { label: '进阶', value: 1 }],
      },
      { type: 'tip', group: '教学提示', content: '拖动滑块观察运动状态变化' },
    ],
  },
})
```

### 3B：物理量构建器（`src/data/quantities/<domain>/`）

```ts
// src/data/quantities/<domain>/<topic>.ts
import type { PhysicsPanelData } from '../types'
import { normalizeParams, type ParamDefs } from '../types'

interface <Topic>Params {
  v0: number  // m/s
  a: number   // m/s²
}

const DEFAULTS: ParamDefs<<Topic>Params> = {
  v0: { default: 5 },
  a: { default: 2 },
}

export function build<Topic>Quantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const p = normalizeParams(params, DEFAULTS)
  const v = p.v0 + p.a * time
  const x = p.v0 * time + 0.5 * p.a * time * time
  return {
    quantities: [
      { label: '速度', symbol: 'v', value: parseFloat(v.toFixed(2)), unit: 'm/s' },
      { label: '位移', symbol: 'x', value: parseFloat(x.toFixed(2)), unit: 'm' },
    ],
    formulas: [
      { name: '速度公式', latex: 'v = v_0 + at', level: 'core', condition: '匀变速直线运动' },
      { name: '位移公式', latex: 'x = v_0 t + \\frac{1}{2}at^2', level: 'core' },
    ],
    examPoints: [
      { content: '能正确区分速度与位移的方向', importance: 'gaokao' },
    ],
  }
}
```

```ts
// src/data/physicsQuantities.ts 中添加
'anim-<topic>': {
  loader: () => import('./quantities/<domain>/<topic>'),
  builderName: 'build<Topic>Quantities',
},
```

### 3C：知识树（`src/data/knowledgeTree.ts`）

确认 `knowledgeId` 对应的节点已存在，或添加新节点。

---

## Step 4：物理量颜色选用（按语义层级严格隔离）

| 语义层级 | 来源 | 适用 | import |
|---------|------|------|--------|
| **物理量** | `PHYSICS_COLORS.*` | 力、速度、加速度、能量等矢量标注 | `@/theme/physics` |
| **场景器材** | `SCENE_COLORS.*` | 磁铁、线圈、滑块、球体材质 | `@/theme/physics` |
| **Canvas 基础设施** | `CANVAS_COLORS.*` | 网格线、参考线、坐标轴 | `@/theme/physics` |
| **图表** | `CHART_COLORS.*` / `VT_CHART_COLORS.*` | 图表曲线、填充 | `@/theme/physics` |
| **透明度变体** | `withAlpha(token, 0.3)` | 任意半透明色 | `@/theme/physics` |

```ts
// ❌ 禁止
fill="#3B82F6"                 // 硬编码 hex
stroke="red"
fill={colors.neutral[200]}    // UI 中性色用于 Canvas 基础设施
fill="rgba(0,0,0,0.3)"        // 手拼 rgba
import { withAlpha } from '@/theme/physics/colors'  // 子路径导入

// ✅ 正确
fill={PHYSICS_COLORS.velocity}
stroke={PHYSICS_COLORS.force}
stroke={CANVAS_COLORS.grid}   // 网格线
fill={withAlpha(PHYSICS_COLORS.velocity, 0.3)}  // 从 @/theme/physics 统一入口
```

---

## Step 5：组件复用速查（用现有组件，禁止手写等效实现）

### Physics 组件（`@/components/Physics`，barrel import）

| 需求 | 组件 | 最小调用 |
|------|------|---------|
| 质点/钢珠/摆球 | `Ball` | `<Ball cx={x} cy={y} r={14} type="steel" />` |
| 滑块/木箱/小车 | `Block` | `<Block x={x} y={y} width={48} height={24} type="metal" />` |
| 地面/斜面/传送带 | `PhysicsGround` | `<PhysicsGround x={0} y={gy} width={dw} type="ground" fontFamily={font} />` |
| 斜面体 | `Incline` | `<Incline x0={cx} y0={gy} width={W} height={H} />` |
| 定滑轮 | `Pulley` | `<Pulley cx={px} cy={py} r={12} hangerTopY={py-45} />` |
| 流线跑车 | `SportsCar` | `<SportsCar x={cx} y={gy-26} width={56} height={26} />` |
| 弹簧 | `Spring` | `<Spring x1={ox} y1={oy} x2={bx} y2={oy} coils={8} amplitude={12} />` |
| 能量柱 | `EnergyBars` | `<EnergyBars items={[{key:'Ek',label:'Ek',value:Ek,color:PHYSICS_COLORS.kineticEnergy}]} />` |
| 条形磁铁 | `BarMagnet` | `<BarMagnet x={mx} y={cy} width={120} height={36} pole={-1} />` |
| 物理矢量（力/速/加速度） | `PhysicsVectorArrow` | `<PhysicsVectorArrow originDesign={pos} vector={v} type="forceNet" sceneScale={ss} />` |
| 视觉标注/等长示意 | `VectorArrow` | `<VectorArrow originDesign={pos} vector={v} type="velocity" sceneScale={ss} label="v" font={font} />` |
| 粒子轨迹 | `ParticleTrajectory` | `<ParticleTrajectory historyPoints={hp} predictedPoints={pp} tailPoints={tp} isFocus chargeSign="+" />` |

> ❌ 禁止手画：`<circle>` 替代 Ball、`<rect>` 替代 Block、`<line>+<marker>` 替代矢量箭头、手写地面纹理

### Chart 组件（`@/components/Chart`，barrel import）

| 需求 | 组件 |
|------|------|
| 所有新图表底座（双轴/网格/刻度） | `BasePhysicsChart` |
| v-t 图 | `VelocityTimeChart` |
| x-t / s-t 图 | `DisplacementTimeChart` |
| a-t 图 | `AccelerationTimeChart` |
| 通用关系图（F-x、T²-a³ 等） | `RelationChart` |
| 游标十字线 | `ChartCursor`（作为 BasePhysicsChart 的 child） |

> ❌ 禁止手写 `toSvgX / toSvgY` 坐标轴；禁止 `<foreignObject>` 内嵌图表

---

## Step 6：import 路径规范

```ts
// ✅ 子目录 barrel（推荐）
import { VectorArrow, Ball, PhysicsGround } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { LeftPanel, ParamControl } from '@/components/UI'
import { BasePhysicsChart, VelocityTimeChart } from '@/components/Chart'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'

// ❌ 禁止子路径导入
import { Ball } from '@/components/Physics/Ball'
import { withAlpha } from '@/theme/physics/colors'
```

---

## 执行前 Checklist（全部 ✅ 才能提交）
## 执行前 Checklist

- [ ] **三屏**：主屏无教学文字；左屏参数走 `paramMeta`/模式走 `controlMeta`；右屏由框架渲染
- [ ] **布局**：preset 正确（full/splitV/splitH/square）；无 `viewBox`+`vp.transform` 双重缩放；坐标走 `worldToDesign`
- [ ] **组件**：矢量箭头用 `VectorArrow`/`PhysicsVectorArrow`；图表用 `BasePhysicsChart`/`VelocityTimeChart` 等；球/块/地面用现有组件
- [ ] **颜色**：无 hex 硬编码；物理量用 `PHYSICS_COLORS`，器材用 `SCENE_COLORS`，网格/轴线用 `CANVAS_COLORS`；SVG 字号用 `font(N)`
- [ ] **Registry**：动画表已注册（`defaultParams as const`，`controlsMode` 正确）；物理量构建器已实现并注册；知识点已确认
- [ ] **代码**：物理 hook 无副作用；barrel import；`tsc --noEmit` 通过
