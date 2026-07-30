---
name: new-animation-page
description: 新建动画页面 / 创建新的物理动画组件 / 新增动画场景 / 添加新的 feature 动画 / 实现新动画 / 新建高考模型页面 / 创建高考压轴模型组件
---

# 新建动画页面 Skill

> 本 Skill 提供新建页面的标准决策路径和骨架代码，按步骤执行即可。

---

## Step 0：三项设计决策（写代码前完成）

### A. 选 Preset（画布尺寸）

| 场景特征 | Preset | 设计尺寸 |
|---------|--------|---------|
| 水平运动 + 配套图表（v-t / x-t）| `CANVAS_PRESETS.splitV` | 840×325 |
| 垂直/斜向运动 + 配套图表 | `CANVAS_PRESETS.splitH` | 420×650 |
| 无图表纯动画（光学/磁场等） | `CANVAS_PRESETS.full` | 840×650 |
| 圆周/旋转对称 | `CANVAS_PRESETS.square` | 650×650 |

### B. 选 SceneScale anchor（坐标比例尺）

| 场景类型 | anchor | 必填参数 | 示例 |
|---------|--------|---------|------|
| 粒子/物体在视野内自由运动 | `'viewport'` | `physicsWidth`, `physicsHeight`（**真实物理米数**） | 10m 视野 → `physicsWidth: 10` |
| 圆周/对称，原点在中心 | `'center'` | `physicsScaleDesign`（1m=多少设计像素） | 50px/m → `physicsScaleDesign: 50` |
| 非标准原点（如平抛：原点在左上方某处） | `'custom'` | `customOriginX/Y`、`customScaleX/Y`（**X=Y 等比**） | 见骨架代码 |
| 全固定设计坐标（光学折射/干涉等） | 不调用 useSceneScale | — | 直接写坐标值 |

### C. 选 controlsMode

- 绝大多数情况用 `'timed'`（有时间轴的过程动画，默认可省略）
- 永续循环无终点 → `'loop'`；仅参数变化无时间轴 → `'param'`

---

## Step 1：文件结构

```
src/features/<domain>/<topic>/
├── <Topic>Animation.tsx      ← 编排层：Store + Viewport + SceneScale + 渲染
├── hooks/
│   └── use<Topic>Physics.ts  ← 纯物理计算（无 JSX/DOM/副作用）
├── components/
│   └── <Topic>Scene.tsx      ← SVG 渲染（无物理公式/Store）
└── index.ts
```

---

## Step 2：骨架代码

### `<Topic>Animation.tsx` — full preset + viewport anchor（最常用）

```tsx
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { use<Topic>Physics } from './hooks/use<Topic>Physics'
import { <Topic>Scene } from './components/<Topic>Scene'

export default function <Topic>Animation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )
  const { v0 = 10, a = 2 } = params

  // Viewport — 无需 presetCompensation，新建页面一律不传
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  const physics = use<Topic>Physics({ v0, a, time })

  // SceneScale — physicsWidth/Height 填真实物理米数（如 20m × 15m 视野）
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    physicsWidth: 20,   // 物理视野宽 20m
    physicsHeight: 15,  // 物理视野高 15m
    refMagnitudes: { velocity: v0 },
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <<Topic>Scene physics={physics} canvasSize={canvasSize} sceneScale={sceneScale} vp={vp} />
      </AnimationSvgCanvas>
    </div>
  )
}
```

### splitV 分屏布局（图表 + 动画）

```tsx
// 两个区域均用 flex-1 自适应，不写死像素高度
return (
  <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
    <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
      <VelocityTimeChart points={vtPoints} currentTime={time} tMax={10} title="v-t" />
    </div>
    <div ref={containerRef} className="flex-1 min-h-0 relative">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <<Topic>Scene ... />
      </AnimationSvgCanvas>
    </div>
  </div>
)
```

### `<Topic>Scene.tsx` — 标准坐标转换

```tsx
import { Ball, PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS, STROKE } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { <Topic>PhysicsResult } from '../hooks/use<Topic>Physics'

interface <Topic>SceneProps {
  physics: <Topic>PhysicsResult
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
  vp: ViewportInfo  // 用于 vp.designLeft / vp.designVisibleW 撑满地面/网格线
}

export function <Topic>Scene({ physics, canvasSize, sceneScale, vp }: <Topic>SceneProps) {
  const { font } = canvasSize

  // worldToDesign(x, y, sceneScale) → { px, py }（设计坐标）
  const ballPos = worldToDesign(physics.x, physics.y, sceneScale)

  return (
    <g>
      {/* 地面：x=vp.designLeft，width=vp.designVisibleW，撑满可视区 */}
      <PhysicsGround x={vp.designLeft} y={560} width={vp.designVisibleW} type="ground" />

      <Ball cx={ballPos.px} cy={ballPos.py} r={14} type="steel" />

      <PhysicsVectorArrow
        originDesign={{ x: ballPos.px, y: ballPos.py }}
        vector={{ x: physics.vx, y: physics.vy }}
        type="velocity"
        sceneScale={sceneScale}
        strokeWidth={STROKE.vectorMain}
      />

      {/* 字号用 font(N)，禁止裸 fontSize={N} */}
      <text x={ballPos.px} y={ballPos.py - 20} fontSize={font(11)}
        fill={PHYSICS_COLORS.velocity} textAnchor="middle">
        {`v = ${physics.v.toFixed(1)} m/s`}
      </text>
    </g>
  )
}
```

### `hooks/use<Topic>Physics.ts` — 纯物理 Hook

```ts
import { useMemo } from 'react'

export interface <Topic>PhysicsResult {
  x: number   // m，物理坐标（y↑正）
  y: number   // m
  vx: number  // m/s
  vy: number  // m/s
  v: number   // m/s
}

export function use<Topic>Physics({ v0, a, time }: { v0: number; a: number; time: number }) {
  return useMemo(() => {
    const x = v0 * time + 0.5 * a * time * time
    const vx = v0 + a * time
    return { x, y: 0, vx, vy: 0, v: Math.abs(vx) }
  }, [v0, a, time])
}
```

---

## Step 3：Registry 注册（5 个文件，同一任务必须全部完成）

### `src/data/registries/<domain>.ts`

```ts
import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const <domain>Animations = defineAnimations({
  'anim-<topic>': {
    title: '<动画标题>',
    knowledgeId: '<domain>-x-x',
    Component: lazy(() => import('@/features/<domain>/<topic>/<Topic>Animation')),
    controlsMode: 'timed',
    defaultParams: { v0: 10, a: 2 } as const,
    paramMeta: [
      { key: 'v0', label: '初速度', min: 0, max: 30, step: 1, unit: 'm/s', group: '运动参数' },
      { key: 'a',  label: '加速度', min: 0, max: 10, step: 0.5, unit: 'm/s²' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '模型', resetOnChange: true,
        options: [{ label: '基础', value: 0 }, { label: '进阶', value: 1 }] },
      { type: 'tip', group: '提示', content: '拖动滑块观察运动变化' },
    ],
  },
})
```

### `src/data/quantities/<domain>/<topic>.ts`

```ts
import type { PhysicsPanelData } from '../types'
import { normalizeParams, type ParamDefs } from '../types'

const DEFAULTS: ParamDefs<{ v0: number; a: number }> = {
  v0: { default: 10 }, a: { default: 2 },
}

export function build<Topic>Quantities(
  _animId: string, params: Record<string, number>, time: number,
): PhysicsPanelData | null {
  const p = normalizeParams(params, DEFAULTS)
  return {
    quantities: [
      { label: '速度', symbol: 'v', value: +(p.v0 + p.a * time).toFixed(2), unit: 'm/s' },
    ],
    formulas: [
      { name: '速度公式', latex: 'v = v_0 + at', level: 'core' },
    ],
    examPoints: [],
  }
}
```

### `src/data/physicsQuantities.ts` — 追加一行

```ts
'anim-<topic>': { loader: () => import('./quantities/<domain>/<topic>'), builderName: 'build<Topic>Quantities' },
```

### `src/data/knowledge/<domain>.ts` — 确认 knowledgeId 存在

---

## Step 4：组件速查

### Physics（`@/components/Physics`）

| 需求 | 组件 | 关键 Props |
|------|------|-----------|
| 质点/球 | `Ball` | `cx cy r type="steel"` |
| 滑块/箱 | `Block` | `x y width height type="metal"` |
| 地面/斜面 | `PhysicsGround` | `x={vp.designLeft} y width={vp.designVisibleW} type="ground"` |
| 斜面体 | `Incline` | `x0 y0 width height` |
| 弹簧 | `Spring` | `x1 y1 x2 y2 coils amplitude` |
| 物理矢量（带自动缩放） | `PhysicsVectorArrow` | `originDesign vector type sceneScale` |
| 示意矢量（固定比例） | `VectorArrow` | `originDesign vector type sceneScale label font` |
| 粒子轨迹 | `ParticleTrajectory` | `historyPoints predictedPoints tailPoints isFocus chargeSign` |

### Chart（`@/components/Chart`）

| 需求 | 组件 |
|------|------|
| v-t 图 | `VelocityTimeChart` |
| x-t 图 | `DisplacementTimeChart` |
| a-t 图 | `AccelerationTimeChart` |
| 自定义关系图 | `BasePhysicsChart` + `ChartLine` + `ChartCursor` |
| 轻量实时图（CenterExtra） | `MiniChart`（`@/components/UI`） |

### 颜色使用规则

```ts
// 统一从 @/theme/physics 导入，按语义选择
PHYSICS_COLORS.*   // 力、速度、加速度、位移等物理量标注
SCENE_COLORS.*     // 器材外观（磁铁、线圈、球体材质）
CANVAS_COLORS.*    // 坐标轴、网格线、参考线
withAlpha(token, 0.3)  // 半透明色，禁止手拼 rgba(...)
font(N)            // SVG 字号，禁止裸 fontSize={N}
```

---

## Checklist（提交前确认）

- [ ] Viewport：`useAnimationViewport({ preset })` 无 presetCompensation
- [ ] SceneScale：`physicsWidth/Height` 是真实物理视野（米）；`customScaleX === customScaleY`；`worldToDesign(x, y, sceneScale)` → `{ px, py }`
- [ ] 地面/网格线：`x={vp.designLeft} width={vp.designVisibleW}`，无魔法数字
- [ ] splitV 图表区：`flex-1 min-h-0`，不写死高度
- [ ] 组件：Ball / Block / PhysicsGround / PhysicsVectorArrow / 图表组件均已复用
- [ ] 颜色：PHYSICS_COLORS / SCENE_COLORS / CANVAS_COLORS 按语义使用；font(N) 包裹字号
- [ ] Registry：5 个文件全部完成；`defaultParams as const`；controlsMode 正确
- [ ] `tsc --noEmit` 通过
