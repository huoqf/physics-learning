import { useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  DECAY_CHARGES,
  useDecayMagneticOrbitPhysics,
} from './hooks/useDecayMagneticOrbitPhysics'
import { DecayMagneticOrbitScene } from './components/DecayMagneticOrbitScene'

const NUCLEUS_WORLD_W = 10.0
const NUCLEUS_WORLD_H = 6.5

/**
 * 静止核在匀强磁场中衰变径迹（内切圆与外切圆）动画组件
 */
export default function DecayMagneticOrbitAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const decayType = params.decayType ?? 0
  const bField = params.bField ?? 1.5

  const decayData = useDecayMagneticOrbitPhysics(decayType, bField, time)

  const fitScale = Math.min(
    vp.designVisibleW / NUCLEUS_WORLD_W,
    vp.designVisibleH / NUCLEUS_WORLD_H,
  )
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    originSource: 'center',
    physicsWidth: vp.designVisibleW / Math.max(fitScale, 1e-6),
    physicsHeight: vp.designVisibleH / Math.max(fitScale, 1e-6),
  })

  const decayCharges = decayType === 0 ? DECAY_CHARGES.alpha : DECAY_CHARGES.beta
  const radiusChart = useMemo(() => {
    const { particle, daughter } = decayCharges
    const ratio = daughter / particle
    const isAlpha = decayType === 0

    const curve: { x: number; y: number }[] = []
    const step = Math.max(0.05, (daughter - particle) / 240)
    for (let q = particle; q <= daughter + 1e-9; q += step) {
      curve.push({ x: q, y: daughter / q })
    }

    return {
      curve,
      xDomain: [0, daughter * 1.5] as [number, number],
      yDomain: [0, ratio * 1.15] as [number, number],
      markers: [
        {
          axis: 'point' as const,
          x: particle,
          y: ratio,
          label: `${isAlpha ? 'α 粒子' : 'β 粒子'} |q|=${particle}e`,
          color: isAlpha ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge,
        },
        {
          axis: 'point' as const,
          x: daughter,
          y: 1,
          label: `${isAlpha ? '反冲钍核' : '反冲氮核'} |q|=${daughter}e`,
          color: PHYSICS_COLORS.appliedForce,
        },
      ],
    }
  }, [decayCharges, decayType])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-1">
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <RelationChart
          points={radiusChart.curve}
          xLabel="核电荷量绝对值 |q| (e)"
          yLabel="轨迹半径 R (以新核为 1)"
          title={`匀强磁场衰变径迹半径与电荷反比曲线 R ∝ 1/|q| — ${decayType === 0 ? 'α 衰变 (外切圆)' : 'β 衰变 (内切圆)'}`}
          xDomain={radiusChart.xDomain}
          yDomain={radiusChart.yDomain}
          showGrid={true}
          markers={radiusChart.markers}
          series="primary"
        />
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200/60 overflow-hidden relative">
        <div className="absolute top-2 left-2 z-10 bg-slate-900/90 text-slate-200 text-[11px] px-2 py-1 rounded border border-slate-700/80 font-mono shadow flex gap-3">
          <span>
            垂直纸面向里磁场 B ={' '}
            <span className="text-emerald-400 font-bold">{bField.toFixed(1)} T</span>
          </span>
          <span>
            切向几何：
            <span className={decayType === 0 ? 'text-amber-400 font-bold' : 'text-sky-400 font-bold'}>
              {decayType === 0 ? '外切圆 (α 衰变)' : '内切圆 (β 衰变)'}
            </span>
          </span>
        </div>

        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <DecayMagneticOrbitScene
            decayData={decayData}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
