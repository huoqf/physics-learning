# 分屏图表面板模板

> **用途**：中屏上下/左右分区，动画 + 图表并列。适用于需要实时图象（v-t、x-t 等）的场景。
>
> **典型场景**：碰撞实验（v-t + Ek-t 图）、运动学图像扩展、简谐振动等。

---

## 文件结构

```
features/<domain>/<topic>/
├── XxxAnimation.tsx          ← 编排层 + 分屏布局（本模板）
├── hooks/
│   └── useXxxPhysics.ts      ← 物理计算 hook
├── components/
│   ├── XxxScene.tsx          ← SVG 场景渲染
│   └── XxxChart.tsx          ← 图表渲染（可选，也可内联）
└── index.ts
```

---

## 骨架代码

### XxxAnimation.tsx（上下分屏 splitV）

```tsx
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VelocityTimeChart } from '@/components/Chart'
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

  // ── 2. Viewport（splitV = 上下分区） ──
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // ── 3. 参数 + 物理计算 ──
  const { paramA = 1, paramB = 2 } = params
  const physics = useXxxPhysics({ paramA, paramB, time })

  // ── 4. 图表数据 ──
  // const chartPoints = useMemo(() => ..., [physics, time])

  // ── 5. SceneScale ──
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: Math.round(preset.height * 0.55),
    refMagnitudes: { velocity: 10 },
  })

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ─── 上方：图表面板 ─── */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={/* chartPoints */[]}
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
            sceneScale={sceneScale}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
```

### XxxAnimation.tsx（左右分屏 splitH 变体）

```tsx
// 改动点：
// 1. preset: CANVAS_PRESETS.splitH
// 2. flex direction: flex-row
// 3. 左侧放动画，右侧放图表

const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
  preset: CANVAS_PRESETS.splitH,
})

return (
  <div className="w-full h-full flex flex-row gap-2 overflow-hidden">
    {/* 左侧：SVG 动画区 */}
    <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm overflow-hidden">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <rect width={preset.width} height={preset.height} fill="white" />
        <XxxScene physics={physics} showVectors={showVectors} canvasSize={canvasSize} />
      </AnimationSvgCanvas>
    </div>

    {/* 右侧：图表面板 */}
    <div className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm overflow-hidden">
      <VelocityTimeChart
        mode="animated"
        points={/* chartPoints */[]}
        currentTime={time}
        tMax={10}
        title="速度-时间图像 (V-T)"
        xLabel="时间 t (s)"
        yLabel="速度 v (m/s)"
      />
    </div>
  </div>
)
```

### hooks/useXxxPhysics.ts

同全屏模板，参考 `TEMPLATE_FULL_ANIMATION_PAGE.md`。

### components/XxxScene.tsx

同全屏模板，注意使用 `preset.width` / `preset.height` 作为设计坐标范围（而非 `CANVAS_PRESETS.full`）。

---

## 多图表面板变体

当需要多个图表并列时（如 CollisionAnimation 的 v-t + Ek-t）：

```tsx
{/* ─── 上方：双图表面板 ─── */}
<div className="flex gap-4 flex-1 min-h-0">
  {/* V-T 图 */}
  <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm overflow-hidden flex flex-col">
    <div className="flex-1 min-h-0 relative">
      <VelocityTimeChart title="V-T" ... />
    </div>
  </div>
  {/* Ek-T 图 */}
  <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm overflow-hidden flex flex-col">
    <div className="flex-1 min-h-0 relative">
      <VelocityTimeChart title="Ek-T" ... />
    </div>
  </div>
</div>
```

---

## Registry 注册

同全屏模板，参考 `TEMPLATE_FULL_ANIMATION_PAGE.md`。

---

## 检查清单

- [ ] `tsc --noEmit` 通过
- [ ] `npm test` 通过
- [ ] `useAnimationViewport` 使用正确的 split preset
- [ ] 图表区和动画区各占合理比例（默认各 50%）
- [ ] 物理计算在 hook 中，不在 JSX 中
- [ ] Scene 组件零物理公式
- [ ] Registry 已注册
- [ ] 视觉验证：图表数据随动画实时更新
