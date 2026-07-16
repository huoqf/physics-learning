# 分屏图表面板模板

> **用途**：中屏上下/左右分区，动画 + 图表并列。适用于需要实时图象（v-t、x-t 等）的场景。
>
> **典型场景**：碰撞实验（v-t + Ek-t 图）、运动学图像扩展、简谐振动等。
>
> **两种分区方式**：
> - **CenterExtra**（推荐）：通过 registry 的 `CenterExtra: lazy(...)` 声明，框架自动注入右屏。更简洁、解耦。
> - **手写 flex 布局**：在编排层中直接写 flex 分区。更灵活，用于复杂自定义布局。

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
└── XxxCenterExtra.tsx        ← CenterExtra 图表面板（可选）
```

---

## 方式一：CenterExtra（推荐）

通过 registry 声明，框架自动将图表注入右屏。编排层只需关注动画本身。

### Registry 注册

```ts
'anim-xxx': {
  title: '动画标题',
  knowledgeId: 'domain-x-x',
  Component: lazy(() => import('@/features/xxx/XxxAnimation')),
  controlsMode: 'timed',  // timed / loop / param，详见 TEMPLATE_FULL_ANIMATION_PAGE
  centerLayout: 'splitH', // 或 'splitV'，决定中屏分区方向
  defaultParams: { ... } as const,
  paramMeta: [ ... ],
  controlMeta: [ ... ],
  CenterExtra: lazy(() => import('@/features/xxx/XxxCenterExtra')),
  // 可选：根据 mode 切换不同图表
  // centerExtraMode: 'mode',
}
```

### CenterExtra 组件

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
    <div className="w-full h-full p-2 bg-white rounded-xl border border-neutral-100 shadow-sm flex flex-col justify-between gap-4">
      <div className="flex-1 min-h-0">
        <MiniChart title="实时图表" ... />
      </div>
    </div>
  )
}
```

### 编排层（与全屏模板相同）

编排层无需关心图表分区，只需正常渲染动画场景。框架根据 `centerLayout` 自动分区。

```tsx
// features/xxx/XxxAnimation.tsx
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
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

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })

  const { paramA = 1 } = params
  const physics = useXxxPhysics({ paramA, time })

  const sceneScale = useSceneScale({
    vp, preset,
    anchor: 'viewport',
    physicsWidth: 100,
    physicsHeight: 80,
    refMagnitudes: { velocity: 10 },
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
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

---

## 方式二：手写 flex 布局（灵活但耦合）

当需要自定义分区比例、多个并列面板、或非标准布局时，直接在编排层写 flex。

### splitV 变体（上下分区）

```tsx
export default function XxxAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
    }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const { paramA = 1 } = params
  const physics = useXxxPhysics({ paramA, time })

  const sceneScale = useSceneScale({
    vp, preset,
    anchor: 'viewport',
    physicsWidth: 100,
    physicsHeight: 40,
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
              points={[]}
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
      <div ref={containerRef} className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
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

### splitH 变体（左右分区）

```tsx
// 改动点：
// 1. preset: CANVAS_PRESETS.splitH
// 2. flex direction: flex-row
// 3. 左侧放动画，右侧放图表

return (
  <div className="w-full h-full flex flex-row gap-2 overflow-hidden">
    {/* 左侧：SVG 动画区 */}
    <div ref={containerRef} className="flex-1 min-h-0 bg-white rounded-xl shadow-sm overflow-hidden">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <XxxScene physics={physics} showVectors={showVectors} canvasSize={canvasSize} sceneScale={sceneScale} />
      </AnimationSvgCanvas>
    </div>

    {/* 右侧：图表面板 */}
    <div className="flex-1 min-h-0 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm overflow-hidden">
      <VelocityTimeChart
        mode="animated"
        points={[]}
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

### 多图表面板变体

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

## hooks/useXxxPhysics.ts

参考 `TEMPLATE_FULL_ANIMATION_PAGE.md` 中的两种模式：
- **纯计算模式**（param 型）：`useMemo` 驱动
- **仿真模式**（timed/loop 型）：`useRef` + `useAnimationFrame` 驱动

---

## components/XxxScene.tsx

参考 `TEMPLATE_FULL_ANIMATION_PAGE.md`，注意使用 `preset.width` / `preset.height` 作为设计坐标范围（而非 `CANVAS_PRESETS.full`）。

---

## 检查清单

- [ ] `tsc --noEmit` 通过
- [ ] `npm test` 通过
- [ ] `useAnimationViewport` 使用正确的 split preset（splitV / splitH）
- [ ] 图表区和动画区各占合理比例（默认各 50%）
- [ ] 物理计算在 hook 中，不在 JSX 中
- [ ] Scene 组件零物理公式
- [ ] `controlsMode` 选择正确（timed / loop / param）
- [ ] Registry 已注册
- [ ] 如使用 CenterExtra：已添加 `CenterExtra: lazy(...)` 声明
- [ ] 视觉验证：图表数据随动画实时更新
