# 全屏画布动画模板

> **用途**：动画独占中屏（`CANVAS_PRESETS.full`），无 CenterExtra 图表面板。最常见的布局。
>
> **典型场景**：自由落体、竖直上抛、牛顿第二定律、力的合成与分解等。

---

## 文件结构

```
features/<domain>/<topic>/
├── XxxAnimation.tsx          ← 薄编排层（本模板）
├── hooks/
│   └── useXxxPhysics.ts      ← 物理计算 hook（零 JSX）
├── components/
│   └── XxxScene.tsx          ← SVG 场景渲染（零物理公式）
└── index.ts                  ← 导出
```

---

## 骨架代码

### XxxAnimation.tsx

```tsx
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useXxxPhysics } from './hooks/useXxxPhysics'
import { XxxScene } from './components/XxxScene'

export default function XxxAnimation() {
  // ── 1. Store 订阅 ──
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  // ── 2. Viewport ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  // ── 3. 参数提取 ──
  const { paramA = 1, paramB = 2 } = params

  // ── 4. 物理计算 ──
  const physics = useXxxPhysics({ paramA, paramB, time })

  // ── 5. SceneScale（矢量箭头缩放，按需） ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'center',
    refMagnitudes: { velocity: 10, force: 5 },
  })

  // ── 6. 渲染 ──
  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <defs>
          {/* 渐变、滤镜等 */}
        </defs>
        <rect
          width={CANVAS_PRESETS.full.width}
          height={CANVAS_PRESETS.full.height}
          fill={PHYSICS_COLORS.white}
        />
        <XxxScene
          physics={physics}
          showVectors={showVectors}
          canvasSize={canvasSize}
          sceneScale={sceneScale}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
```

### hooks/useXxxPhysics.ts

```tsx
import { useMemo } from 'react'

interface UseXxxPhysicsParams {
  paramA: number
  paramB: number
  time: number
}

interface XxxPhysicsResult {
  position: { x: number; y: number }
  velocity: number
  acceleration: number
}

export function useXxxPhysics({
  paramA,
  paramB,
  time,
}: UseXxxPhysicsParams): XxxPhysicsResult {
  return useMemo(() => {
    // ── 物理计算（纯函数，无副作用） ──
    const x = paramA * time
    const v = paramA
    const a = 0
    return {
      position: { x, y: 0 },
      velocity: v,
      acceleration: a,
    }
  }, [paramA, paramB, time])
}
```

### components/XxxScene.tsx

```tsx
import { VectorArrow, Block, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import type { XxxPhysicsResult } from '../hooks/useXxxPhysics'

interface XxxSceneProps {
  physics: XxxPhysicsResult
  showVectors: boolean
  canvasSize: { font: (size: number) => number }
  sceneScale: typeof IDENTITY_SCENE_SCALE
}

export function XxxScene({
  physics,
  showVectors,
  canvasSize,
  sceneScale,
}: XxxSceneProps) {
  const { font } = canvasSize

  return (
    <g>
      {/* 背景 */}
      <PhysicsGround x={40} y={400} width={760} type="ground" />

      {/* 物体 */}
      <Block
        x={physics.position.x}
        y={physics.position.y}
        width={40}
        height={30}
        type="wood"
        font={font}
        showCenterOfMass
      />

      {/* 矢量箭头 */}
      {showVectors && (
        <VectorArrow
          originPixel={physics.position}
          vector={{ x: physics.velocity, y: 0 }}
          type="velocity"
          sceneScale={sceneScale}
          label="v"
          font={font}
        />
      )}
    </g>
  )
}
```

---

## Registry 注册

在 `data/registries/<domain>.ts` 中添加：

```ts
import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const xxxAnimations = defineAnimations({
  'anim-xxx': {
    title: '动画标题',
    knowledgeId: 'domain-x-x',
    Component: lazy(() => import('@/features/xxx/XxxAnimation')),
    controlsMode: 'timed',
    defaultParams: {
      paramA: 1,
      paramB: 2,
    } as const,
    paramMeta: [
      { key: 'paramA', label: '参数A', min: 0, max: 10, step: 0.1, unit: 'm' },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { label: '基础', value: 0 },
          { label: '进阶', value: 1 },
        ],
      },
      { type: 'tip', group: '教学提示', content: '提示内容' },
    ],
  },
})
```

---

## 检查清单

- [ ] `tsc --noEmit` 通过
- [ ] `npm test` 通过
- [ ] `useAnimationViewport` 使用 `CANVAS_PRESETS.full`
- [ ] 物理计算在 hook 中，不在 JSX 中
- [ ] Scene 组件零物理公式
- [ ] Registry 已注册（id：`anim-xxx`）
- [ ] 知识树节点已关联
- [ ] 视觉验证：播放/暂停/重置正常
