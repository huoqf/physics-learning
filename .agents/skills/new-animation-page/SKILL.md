---
name: new-animation-page
description: 新建动画页面 / 创建新的物理动画组件 / 新增动画场景 / 添加新的 feature 动画 / 实现新动画
---

# 新建动画页面 Skill

> 在开始写任何代码之前，必须先确认以下骨架结构和规范。本 Skill 自动触发于：新建、添加、实现动画页面/组件场景等任务。

---

## Step 0：确认 4 项基础决策

在写第一行代码前，必须明确：

| 决策项 | 可选值 | 决策依据 |
|-------|-------|---------|
| **preset** | `full` / `splitV` / `splitH` / `square` | 是否含图表？是否圆形对称？ |
| **anchor** | `'center'` / `'viewport'` / `'bottom'` | 场景主体在哪里？ |
| **physicsWidth / Height** | 数值（米） | 场景真实物理尺寸 |
| **CenterExtra** | 有/无 | 是否需要中屏额外图表 |

---

## Step 1：目录结构（必须遵守）

```
src/features/<domain>/<topic>/
├── <Topic>Animation.tsx        ← 薄编排层（仅组合 hook + 组件）
├── hooks/
│   └── use<Topic>Physics.ts   ← 纯物理计算 hook（零 JSX，零副作用）
├── components/
│   └── <Topic>Scene.tsx       ← SVG 场景渲染（零物理公式）
└── index.ts                   ← re-export
```

如需 CenterExtra 图表：在根目录追加 `<Topic>CenterExtra.tsx`。

---

## Step 2：骨架代码（逐字复制，替换 `Xxx` → 实际名称）

### `<Topic>Animation.tsx`（编排层）

```tsx
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS } from '@/theme/physics'
import { use<Topic>Physics } from './hooks/use<Topic>Physics'
import { <Topic>Scene } from './components/<Topic>Scene'

export default function <Topic>Animation() {
  // ── 1. Store 订阅 ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // ── 2. Viewport（新页面唯一路径）──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,  // ← 根据 Step 0 替换
  })

  // ── 3. 参数提取 ──
  const { paramA = 1 } = params

  // ── 4. 物理计算 ──
  const physics = use<Topic>Physics({ paramA, time })

  // ── 5. SceneScale ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,  // ← 与 Step 2 保持一致
    anchor: 'center',              // ← 根据 Step 0 替换
    physicsWidth: 10,              // ← 根据 Step 0 替换
    physicsHeight: 8,              // ← 根据 Step 0 替换
  })

  // ── 6. 渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <rect
          width={CANVAS_PRESETS.full.width}
          height={CANVAS_PRESETS.full.height}
          fill={PHYSICS_COLORS.background}
        />
        <<Topic>Scene
          physics={physics}
          canvasSize={canvasSize}
          sceneScale={sceneScale}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
```

### `hooks/use<Topic>Physics.ts`（物理层）

```ts
import { useMemo } from 'react'

interface Use<Topic>PhysicsParams {
  paramA: number
  time: number   // 单位：s
}

interface <Topic>PhysicsResult {
  positionX: number  // 单位：m（物理坐标，y↑正）
  positionY: number
  velocity: number   // 单位：m/s
}

/**
 * 计算 <Topic> 物理状态
 * @param paramA - 参数A描述 (单位: xxx)
 * @param time - 时间 (s)
 */
export function use<Topic>Physics({
  paramA,
  time,
}: Use<Topic>PhysicsParams): <Topic>PhysicsResult {
  return useMemo(() => {
    // 纯物理计算，无副作用，无 DOM/React/window 依赖
    const x = paramA * time
    const v = paramA
    return { positionX: x, positionY: 0, velocity: v }
  }, [paramA, time])
}
```

### `components/<Topic>Scene.tsx`（渲染层）

```tsx
import { VectorArrow, Ball, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
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

  // 物理坐标 → 设计坐标（唯一合法转换路径）
  const ballPos = worldToDesign(
    { x: physics.positionX, y: physics.positionY },
    sceneScale
  )

  return (
    <g>
      <PhysicsGround x={40} y={560} width={760} type="ground" />
      <Ball cx={ballPos.x} cy={ballPos.y} r={20} type="standard" />
      <VectorArrow
        originDesign={ballPos}
        vector={{ x: physics.velocity, y: 0 }}
        type="velocity"
        sceneScale={sceneScale}
        label="v"
        font={font}
      />
    </g>
  )
}
```

---

## Step 3：Registry 注册（必须在同一 PR 完成）

在 `src/data/registries/<domain>.ts` 添加：

```ts
'anim-<topic>': {
  title: '动画标题',
  knowledgeId: '<domain>-x-x',
  Component: lazy(() => import('@/features/<domain>/<topic>/<Topic>Animation')),
  controlsMode: 'timed',
  defaultParams: { paramA: 1 } as const,
  paramMeta: [
    { key: 'paramA', label: '参数A', min: 0, max: 10, step: 0.1, unit: 'm' },
  ],
  controlMeta: [
    { type: 'tip', group: '教学提示', content: '...' },
  ],
},
```

---

## Step 4：颜色规范速查

| 用途 | 正确引用 |
|------|---------|
| 物理量（速度/力/加速度/能量） | `PHYSICS_COLORS.velocity` / `.force` / `.acceleration` 等 |
| 场景器材（磁铁/灯泡/电阻） | `SCENE_COLORS.magnet` / `.bulb` 等 |
| 图表线条 | `CHART_COLORS.primary` / `VT_CHART_COLORS` 等 |
| 透明度变体 | `withAlpha(PHYSICS_COLORS.velocity, 0.3)` |
| ❌ 禁止 | 任何 hex 直接量 `"#3B82F6"` / `"blue"` |

---

## 执行前 Checklist

- [ ] 目录结构：Animation / hooks / components 三层分离
- [ ] 未使用 `viewBox={...}` + `vp.transform` 双重缩放
- [ ] 未直接调用 `requestAnimationFrame`
- [ ] 未手写 `<line>` + `<marker>` 矢量箭头
- [ ] 坐标转换走 `worldToDesign`，未手写 `x * scale + offset`
- [ ] 所有颜色来自主题 token，无 hex 硬编码
- [ ] Registry 已注册（`paramMeta` / `controlMeta` 驱动左屏）
- [ ] `tsc --noEmit` 通过
