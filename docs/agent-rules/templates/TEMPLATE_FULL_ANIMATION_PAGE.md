# 全屏画布动画模板

> **用途**：动画独占中屏（`CANVAS_PRESETS.full`），无 CenterExtra 图表面板。最常见的布局。
>
> **典型场景**：自由落体、竖直上抛、牛顿第二定律、力的合成与分解等。
>
> **文件结构约定**：新页面推荐使用下方三文件结构（编排层 + hooks + components）。
> 存量动画约 64% 为单文件大包，逐步迁移，不强制一次性重构。

---

## 文件结构

```
features/<domain>/<topic>/
├── XxxAnimation.tsx          ← 薄编排层（本模板）
├── hooks/
│   └── useXxxPhysics.ts      ← 物理计算 hook（零 JSX）
├── components/
│   └── XxxScene.tsx          ← SVG 场景渲染（零物理公式）
└── index.ts                  ← 统一导出（可选）
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

### hooks/useXxxPhysics.ts — 纯计算模式（param 型）

适用于 `controlsMode: 'param'` 的动画，物理状态完全由参数和时间决定，无内部状态。

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

### hooks/useXxxPhysics.ts — 仿真模式（timed/loop 型）

适用于 `controlsMode: 'timed'` 或 `'loop'` 的动画，需要帧循环驱动内部状态。

```tsx
import { useRef, useCallback, useState, useEffect } from 'react'
import { useAnimationFrame } from '@/utils/animation'

interface XxxState {
  x: number; y: number; vx: number; vy: number; ax: number
}

interface XxxPhysicsResult {
  position: { x: number; y: number }
  velocity: { vx: number; vy: number }
  trajectory: { x: number; y: number }[]
}

interface UseXxxPhysicsParams {
  temperature: number
  isPlaying: boolean
}

export function useXxxPhysics({
  temperature, isPlaying,
}: UseXxxPhysicsParams): XxxPhysicsResult {
  const stateRef = useRef<XxxState>({ x: 0, y: 0, vx: 0, vy: 0, ax: 0 })
  const trajectoryRef = useRef<{ x: number; y: number }[]>([])
  const [, setTick] = useState(0)

  // 参数变化时重置
  useEffect(() => {
    stateRef.current = { x: 0, y: 0, vx: 0, vy: 0, ax: 0 }
    trajectoryRef.current = []
  }, [temperature])

  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return

    const s = stateRef.current
    // ── 物理步进（纯计算，无 DOM/React 依赖） ──
    s.vx += s.ax * dt
    s.x += s.vx * dt

    trajectoryRef.current.push({ x: s.x, y: s.y })
    if (trajectoryRef.current.length > 400) trajectoryRef.current.shift()

    setTick((t) => t + 1) // 触发重绘
  }, [temperature])

  useAnimationFrame(handleFrame, { playing: isPlaying })

  return {
    position: stateRef.current,
    velocity: { vx: stateRef.current.vx, vy: stateRef.current.vy },
    trajectory: trajectoryRef.current,
  }
}
```

### components/XxxScene.tsx

```tsx
import { VectorArrow, Block, PhysicsGround } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { XxxPhysicsResult } from '../hooks/useXxxPhysics'

interface XxxSceneProps {
  physics: XxxPhysicsResult
  showVectors: boolean
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
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
          originDesign={physics.position}
          vector={{ x: physics.velocity.vx, y: physics.velocity.vy }}
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

### index.ts（可选）

```tsx
// 统一导出，便于外部 import
export { default as XxxAnimation } from './XxxAnimation'
```

> 现存动画大多无 `index.ts`，按需添加。若编排层已是 `default export` 且 registry 直接 lazy import，可省略。

---

## SceneScale anchor 选项指南

| anchor | 适用场景 | 典型用法 |
|--------|---------|---------|
| `'center'` | 动画居中、无固定地面 | `anchor: 'center'` |
| `'viewport'` | 动画铺满视口、有世界坐标系 | `anchor: 'viewport', physicsWidth: 100, physicsHeight: 80` |
| `'custom'` | 需要精确定位原点 | `anchor: 'custom', customOriginX: 0, customOriginY: 200` |

当使用 `anchor: 'viewport'` 时，必须提供 `physicsWidth` / `physicsHeight` 定义物理世界尺寸，并可选 `originSource: 'bottomLeft'`（y 轴向上）。

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

    // controlsMode 选择（详见下方说明）：
    //   'timed'  — 有起点/终点的过程演示，底部显示播放/暂停+进度条
    //   'loop'   — 永续循环无终点（圆周运动、布朗运动），底部显示「循环运行中」+速度选择器
    //   'param'  — 纯参数驱动、无时间推进（静态受力图、电路计算），底部显示信息条
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

### controlsMode 判断流程

1. 动画是否调用 `useAnimationFrame` / `useSimulationFrame` 且受 `isPlaying` 控制？
   → 否：`'param'`
2. 动画是否有固定终点（时间耗尽/到达限位自动暂停）？
   → 是：`'timed'`；否：`'loop'`

---

## CenterExtra 图表面板（可选）

当动画需要实时图表（v-t、F-t 等）与场景并列显示时，使用 `CenterExtra` 模式。

### 注册方式

```ts
'anim-xxx': {
  // ... 其他配置
  CenterExtra: lazy(() => import('@/features/xxx/XxxCenterExtra')),
  // 可选：根据 mode 切换不同图表
  // centerExtraMode: 'mode',
}
```

### CenterExtra 组件编写

CenterExtra 渲染在右屏面板中，接收 store params 和 time，使用 `MiniChart` 或 `BasePhysicsChart`：

```tsx
// features/xxx/XxxCenterExtra.tsx
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { MiniChart } from '@/components/UI'

export default function XxxCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  return (
    <div className="w-full h-full p-2 bg-white rounded-xl border border-neutral-100 shadow-sm">
      <MiniChart title="实时图表" ... />
    </div>
  )
}
```

### 与 splitH 手写布局的区别

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| `CenterExtra` | 图表面板由框架自动注入右屏 | 更简洁，图表与动画解耦；推荐用于大多数 splitH 场景 |
| 手写 flex 布局 | 需要自定义分区比例或多个并列面板 | 更灵活，但与动画组件耦合；用于复杂自定义布局 |

---

## 检查清单

- [ ] `tsc --noEmit` 通过
- [ ] `npm test` 通过
- [ ] `useAnimationViewport` 使用正确的 preset
- [ ] 物理计算在 hook 中，不在 JSX 中
- [ ] Scene 组件零物理公式
- [ ] Registry 已注册（id：`anim-xxx`）
- [ ] `controlsMode` 选择正确（timed / loop / param）
- [ ] 知识树节点已关联
- [ ] 如有图表：已添加 `CenterExtra` 或手写 split 布局
- [ ] 视觉验证：播放/暂停/重置正常
