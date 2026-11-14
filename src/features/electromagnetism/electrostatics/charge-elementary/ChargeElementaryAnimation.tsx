import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart, useChartContext } from '@/components/Chart'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { CHART_COLORS, EM_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useShallow } from 'zustand/react/shallow'
import type { MillikanSamplePoint } from '@/physics'
import {
  useChargeElementaryPhysics,
  type ChargeElementaryPhysicsResult,
} from './hooks/useChargeElementaryPhysics'
import { ChargeElementaryScene } from './components/ChargeElementaryScene'

/** 密立根油滴量子化散点图层（复用 RelationChart 坐标系） */
function MillikanScatterOverlay({
  samples,
}: {
  samples: MillikanSamplePoint[]
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx
  return (
    <g>
      {samples.map((pt, idx) => {
        const isCurrent = idx === samples.length - 1
        const cx = toSvgX(pt.x)
        const cy = toSvgY(pt.y)
        return (
          <circle
            key={pt.x}
            cx={cx}
            cy={cy}
            r={isCurrent ? 6 : 4.5}
            fill={isCurrent ? EM_COLORS.electricForce : PHYSICS_COLORS.velocity}
            stroke={CHART_COLORS.highlight}
            strokeWidth={isCurrent ? 2 : 1}
          />
        )
      })}
    </g>
  )
}

/** 模式 0：三种起电方式与电荷守恒视图（full preset 840×650） */
function ChargingStage({
  physics,
}: {
  physics: ChargeElementaryPhysicsResult
}) {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 8,
    intentionalNonUniformScale: true,
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <ChargeElementaryScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        mode={0}
      />
    </AnimationSvgCanvas>
  )
}

/** 模式 1：密立根油滴实验与元电荷量子化视图（splitV preset 840×325 + 下半屏图表） */
function MillikanStage({
  physics,
}: {
  physics: ChargeElementaryPhysicsResult
}) {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    intentionalNonUniformScale: true,
    maxVectorLength: 54,
    refMagnitudes: {
      electricForce: 8e-14,
      gravity: 8e-14,
    },
  })

  const markers = [1, 2, 3, 4, 5, 6].map((n) => ({
    axis: 'horizontal' as const,
    y: +(n * 1.6).toFixed(1),
    label: `${n}e`,
    color: CHART_COLORS.equilibrium,
  }))

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 上半屏：密立根油滴实验装置 */}
      <div className="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <ChargeElementaryScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            vp={vp}
            mode={1}
          />
        </AnimationSvgCanvas>
      </div>

      {/* 下半屏：多组油滴电量量子化分布图 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
        <RelationChart
          points={physics.millikan.measuredSamples}
          xDomain={[0, 10]}
          yDomain={[0, 12]}
          xLabel="油滴样本序号 k（第 8 号为当前油滴）"
          yLabel="q / 10⁻¹⁹ C"
          title="油滴电荷量分布（均呈元电荷 e = 1.6×10⁻¹⁹ C 的整数倍）"
          strokeWidth={0}
          markers={markers}
          cursorX={8}
          cursorLabel={() => null}
        >
          <MillikanScatterOverlay samples={physics.millikan.measuredSamples} />
        </RelationChart>
      </div>
    </div>
  )
}

export default function ChargeElementaryAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const mode = params.mode ?? 0
  const physics = useChargeElementaryPhysics({
    mode,
    method: params.method ?? 1,
    step: params.step ?? 0,
    qAInit: params.qAInit ?? 4,
    qBInit: params.qBInit ?? -2,
    inducerQ: params.inducerQ ?? 6,
    isGrounded: params.isGrounded ?? 0,
    voltageU: params.voltageU ?? 490,
    plateGapMm: params.plateGapMm ?? 5,
    chargeMultipleN: params.chargeMultipleN ?? 2,
    dropMass1e15: params.dropMass1e15 ?? 3.2,
  })

  if (mode === 1) {
    return <MillikanStage physics={physics} />
  }
  return <ChargingStage physics={physics} />
}
