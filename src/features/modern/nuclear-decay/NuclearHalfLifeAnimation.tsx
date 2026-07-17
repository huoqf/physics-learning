import { useEffect } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useNuclearHalfLifePhysics } from './hooks/useNuclearHalfLifePhysics'
import { NuclearHalfLifeScene } from './components/NuclearHalfLifeScene'

export default function NuclearHalfLifeAnimation() {
  // ── 1. Zustand Store ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  // ── 2. Viewport ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV, // 上图下动画
  })

  // ── 3. 参数解构 ──
  const halfLife = params.halfLife ?? 4.0
  const initCount = params.initCount ?? 100
  const temperature = params.temperature ?? 20
  const pressure = params.pressure ?? 1.0
  const resetTrigger = params.resetTrigger ?? 0
  
  const updateParam = useAnimationStore((s) => s.updateParam)
  // 当 resetTrigger 为 1 时，生成一个新随机种子
  useEffect(() => {
    if (resetTrigger === 1) {
      updateParam('resetTrigger', Math.floor(Math.random() * 10000) + 2)
    }
  }, [resetTrigger, updateParam])

  // ── 4. 物理计算 (无条件调用 hooks) ──
  const physics = useNuclearHalfLifePhysics({
    halfLife,
    initCount,
    temperature,
    pressure,
    resetTrigger,
    time,
  })

  // ── 5. SceneScale (无条件调用 hooks) ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    originSource: 'center',
    physicsWidth: 10.0,
    physicsHeight: 6.5,
  })

  // ── 6. 渲染 ──
  return (
    <div className="w-full h-full flex flex-col gap-2 p-1">
      {/* 上半屏：图表展示区 */}
      <div className="h-[310px] shrink-0 w-full overflow-hidden">
        <RelationChart
          points={physics.theoryPoints}
          additionalSeries={[
            {
              points: physics.simPoints,
              label: `模拟实际核数 (剩余: ${physics.remainingCount}个)`,
              color: PHYSICS_COLORS.alertRed,
              strokeWidth: 2,
            },
          ]}
          xLabel="时间 t (s)"
          yLabel="未衰变核数 N"
          title="放射性元素衰变规律 (N-t 理论与实际对比)"
          xDomain={[0, 15.0]}
          yDomain={[0, initCount]}
          cursorX={time}
          cursorLabel={(x, y) => `t = ${x.toFixed(1)}s, N_理 = ${y.toFixed(0)}`}
          mainLabel="理论衰变曲线"
          series="primary"
          showGrid={true}
        />
      </div>

      {/* 下半屏：动画画布区 */}
      <div className="flex-1 min-h-0 bg-slate-950/65 rounded-lg border border-slate-800/80 overflow-hidden relative">
        {/* 半衰期核数标签浮层 */}
        <div className="absolute top-2 left-2 z-10 bg-slate-900/90 text-slate-200 fontSize-[11px] px-2 py-1 rounded border border-slate-700/80 font-mono shadow flex gap-4">
          <span>初始核数 N₀ = <span className="text-blue-400 font-bold">{initCount}</span></span>
          <span>当前剩余 N = <span className="text-orange-400 font-bold">{physics.remainingCount}</span></span>
          <span>已衰变比例 = <span className="text-emerald-400 font-bold">{((1 - physics.remainingCount / initCount) * 100).toFixed(0)}%</span></span>
        </div>

        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <NuclearHalfLifeScene
            time={time}
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
