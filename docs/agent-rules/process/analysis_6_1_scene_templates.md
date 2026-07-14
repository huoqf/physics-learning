# §6.1 场景模板实现方案

## 一、现状分析

### 当前模板状态
- `docs/agent-rules/templates/` 目录不存在
- AI 每次新建动画页面需手动拼接 `ThreePanel` + `AnimationSvgCanvas` + `LeftPanel` 结构
- 现有动画中有 **~65 个使用 `useAnimationViewport`**，但写法不统一

### 代码库中已有的两大布局模式

通过分析 `CANVAS_PRESETS` 的使用统计：

| 模式 | preset | 频率 | 典型文件 |
|------|--------|------|---------|
| **全屏画布** | `CANVAS_PRESETS.full` | ~35% | `FreeFallAnimation`, `ImpulseAnimation`, `NewtonSecondAnimation` |
| **上下分屏** | `CANVAS_PRESETS.splitV` | ~50% | `ConveyorAnimation`, `CollisionAnimation`, `ChargeInEField` |
| **左右分屏** | `CANVAS_PRESETS.splitH` | ~15% | `CircularModelsAnimation`, `BinaryStarsAnimation`, `SimplePendulumAnimation` |
| **方形画布** | `CANVAS_PRESETS.square` | 极少 | `OrbitTransferAnimation` |

### 三种组件组织风格（从代码库中归纳）

**风格 A：薄编排 + 场景组件分离**（目标架构，推荐）
```
XxxAnimation.tsx          ← 40-80 行，Store 订阅 + Viewport + 组合子组件
├── hooks/useXxxPhysics.ts ← 物理计算 + physicsToCanvas 映射，零 JSX
├── components/XxxScene.tsx ← 纯渲染，使用 AnimationSvgCanvas
└── model/viewModel.ts     ← 纯物理坐标计算（y↑ 正），不含 SVG/Canvas 依赖
```
代表：`CollisionAnimation`（192 行）、`FreeFallAnimation`（175 行）

**风格 B：单文件内联**（简单场景可接受）
```
XxxAnimation.tsx          ← 150-300 行，Store 订阅 + 物理计算 + 渲染混写
```
代表：`ConveyorAnimation`（416 行）、`BulletBlockAnimation`

**风格 C：极薄包装器**
```
XxxAnimation.tsx          ← <20 行，仅渲染一个场景组件
XxxScene.tsx              ← 自带 useAnimationViewport，独立完整
```
代表：`SpringForceAnimation`（13 行）、`SpringForceCutRopeScene`

---

## 二、模板设计方案

### 模板 1：全屏画布动画 (`TEMPLATE_FULL_ANIMATION_PAGE.md`)

**覆盖场景**：动画独占中屏，无 CenterExtra 图表面板，最常见布局。

**目标文件**：
- `XxxAnimation.tsx` — 薄编排层（~60-100 行）
- `hooks/useXxxPhysics.ts` — 物理计算 hook（按需）
- `components/XxxScene.tsx` — SVG 场景渲染（按需）
- `data/registries/xxx-registry.ts` — Registry 注册

**骨架结构**：

```tsx
// ══════════════════════════════════════════════════════════════════════════════
// XxxAnimation.tsx — 薄编排层
// ══════════════════════════════════════════════════════════════════════════════
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useXxxPhysics } from './hooks/useXxxPhysics'
import { XxxScene } from './components/XxxScene'

export default function XxxAnimation() {
  // ── 1. Store 订阅（低频字段用 useShallow 合并） ──
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  // ── 2. Viewport（选择合适的 preset） ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,  // 或 splitV / splitH
  })

  // ── 3. 从 params 提取参数 ──
  const { paramA = 1, paramB = 2 } = params

  // ── 4. 物理计算 hook（纯数据，零 JSX） ──
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
        <rect width={CANVAS_PRESETS.full.width} height={CANVAS_PRESETS.full.height} fill={PHYSICS_COLORS.white} />
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

```tsx
// ══════════════════════════════════════════════════════════════════════════════
// hooks/useXxxPhysics.ts — 物理计算 hook（零 JSX）
// ══════════════════════════════════════════════════════════════════════════════
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
  // ... 其他物理量
}

export function useXxxPhysics({ paramA, paramB, time }: UseXxxPhysicsParams): XxxPhysicsResult {
  return useMemo(() => {
    // 物理计算（纯函数，无副作用）
    const x = paramA * time
    const v = paramA
    const a = 0
    return { position: { x, y: 0 }, velocity: v, acceleration: a }
  }, [paramA, paramB, time])
}
```

```tsx
// ══════════════════════════════════════════════════════════════════════════════
// components/XxxScene.tsx — SVG 场景渲染（纯渲染，零物理计算）
// ══════════════════════════════════════════════════════════════════════════════
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

export function XxxScene({ physics, showVectors, canvasSize, sceneScale }: XxxSceneProps) {
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

      {/* 矢量箭头（条件渲染） */}
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

### 模板 2：分屏图表面板 (`TEMPLATE_SPLIT_CHART_SCENE.md`)

**覆盖场景**：中屏上下/左右分区，动画 + 图表并列。

**目标文件**：
- `XxxAnimation.tsx` — 编排层，含图表区布局（~80-120 行）
- `hooks/useXxxPhysics.ts` — 物理计算 hook
- `components/XxxScene.tsx` — SVG 场景渲染
- `components/XxxChart.tsx`（可选）— 图表渲染

**骨架结构**：

```tsx
// ══════════════════════════════════════════════════════════════════════════════
// XxxAnimation.tsx — 分屏编排层
// ══════════════════════════════════════════════════════════════════════════════
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VelocityTimeChart } from '@/components/Chart'
import { useXxxPhysics } from './hooks/useXxxPhysics'
import { XxxScene } from './components/XxxScene'

export default function XxxAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  // ── 分屏 preset：splitV（上下）或 splitH（左右） ──
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,  // 上下分区
  })

  const { paramA = 1, paramB = 2 } = params
  const physics = useXxxPhysics({ paramA, paramB, time })

  // ── 图表数据（在编排层计算，传给图表组件） ──
  // const chartPoints = useMemo(() => ..., [physics, time])

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ─── 上方：图表面板 ─── */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={/* chartPoints */}
              currentTime={time}
              tMax={10}
              title="速度-时间图像 (V-T)"
              xLabel="时间 t (s)"
              yLabel="速度 v (m/s)"
            />
          </div>
        </div>
      </div>

      {/* ─── 下方：SVG 动画区 ─── */}
      <div className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <defs>{/* gradients */}</defs>
          <rect width={preset.width} height={preset.height} fill="white" />
          <XxxScene
            physics={physics}
            showVectors={showVectors}
            canvasSize={canvasSize}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
```

**左右分屏变体**（`splitH`）：

```tsx
// 上下分区 → 左右分区：改 preset + 改 flex direction
const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
  preset: CANVAS_PRESETS.splitH,  // 左右分区
})

return (
  <div className="w-full h-full flex flex-row gap-2 overflow-hidden">
    {/* 左侧：SVG 动画区 */}
    <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm overflow-hidden">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* ... */}
      </AnimationSvgCanvas>
    </div>
    {/* 右侧：图表面板 */}
    <div className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm overflow-hidden">
      <VelocityTimeChart ... />
    </div>
  </div>
)
```

---

## 三、Registry 注册模板

每个新动画必须在 `data/registries/` 对应子模块文件中注册：

```ts
// data/registries/xxx.ts
import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const xxxAnimations = defineAnimations({
  'anim-xxx': {
    title: '动画标题',
    knowledgeId: 'domain-x-x',  // 知识树节点 ID
    Component: lazy(() => import('@/features/xxx/XxxAnimation')),
    defaultParams: {
      paramA: 1,
      paramB: 2,
    } as const,
    paramMeta: [
      { key: 'paramA', label: '参数A', min: 0, max: 10, step: 0.1, unit: 'm' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'mode', group: '模型选择', resetOnChange: true,
        options: [{ label: '基础', value: 0 }, { label: '进阶', value: 1 }] },
      { type: 'tip', group: '教学提示', content: '提示内容' },
    ],
    controlsMode: 'timed',  // 'timed' | 'loop' | 'param' | 'pause-only'
  },
})
```

---

## 四、实现步骤

### Step 1: 创建模板目录和文件

```
docs/agent-rules/templates/
├── TEMPLATE_FULL_ANIMATION_PAGE.md     ← 全屏画布模板
└── TEMPLATE_SPLIT_CHART_SCENE.md       ← 分屏图表面板模板
```

每个模板文件包含：
1. **用途说明** — 什么场景用这个模板
2. **文件结构** — 需要创建哪些文件
3. **完整骨架代码** — 可直接复制后填充业务逻辑
4. **Registry 注册示例** — 如何在 registry 中注册
5. **检查清单** — 新建动画后的验收步骤

### Step 2: 更新 TODO_deferred.md §6.1

将 §6.1 状态从 "当前无模板" 更新为已完成。

### Step 3: 可选 — 脚手架命令（P4，暂缓）

如果后续新建动画频率高，可考虑添加 `npm run scaffold` 脚本，自动从模板生成文件骨架。当前阶段手动复制即可。

---

## 五、模板使用规范

### 选择模板的决策树

```
新动画页面
├── 需要 CenterExtra 图表面板吗？
│   ├── 是 → 使用 TEMPLATE_SPLIT_CHART_SCENE
│   │   ├── 图表在上方/左侧 → splitV
│   │   └── 图表在右侧 → splitH
│   └── 否 → 动画独占中屏？
│       ├── 是 → 使用 TEMPLATE_FULL_ANIMATION_PAGE
│       └── 否（需要 CenterExtra 全屏接管） → 不用模板，直接参考 registry 中 centerExtraMode 模式
```

### 模板填充检查清单

新建动画后必须验证：
- [ ] `tsc --noEmit` 通过
- [ ] `npm test` 通过
- [ ] `useAnimationViewport` 使用正确的 preset
- [ ] 物理计算在 hook 中，不在 JSX 中
- [ ] Scene 组件零物理公式
- [ ] Registry 已注册（id 命名：`anim-xxx`）
- [ ] 知识树节点已关联（`knowledgeId` 正确）
- [ ] 视觉验证：播放/暂停/重置正常

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 模板过于死板，限制特殊布局 | 中 | 模板是起点非终点，特殊场景可自由扩展 |
| 模板与实际代码库不同步 | 低 | 模板基于现有代码库归纳，非凭空设计 |
| AI 过度依赖模板，忽略场景差异 | 低 | 模板注释明确标注"按需修改"区域 |
