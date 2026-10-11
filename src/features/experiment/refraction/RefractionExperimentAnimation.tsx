import { useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { useRefractionExperimentPhysics } from './hooks/useRefractionExperimentPhysics'
import { RefractionExperimentScene } from './components/RefractionExperimentScene'
import { generateRefractionSeries } from '@/physics/experimentRefraction'

export default function RefractionExperimentAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const theta1 = Number.isFinite(Number(params?.theta1)) ? Number(params.theta1) : 45
  const n = Number.isFinite(Number(params?.n)) ? Number(params.n) : 1.5
  const d_mm = Number.isFinite(Number(params?.d_mm)) ? Number(params.d_mm) : 50
  const pinDist = Number.isFinite(Number(params?.pinDist)) ? Number(params.pinDist) : 45
  const errorOffset = Number.isFinite(Number(params?.errorOffset)) ? Number(params.errorOffset) : 0
  const step = Number.isFinite(Number(params?.step)) ? Number(params.step) : 0
  const method = Number.isFinite(Number(params?.method)) ? Number(params.method) : 0

  // 1. Viewport 适配 (使用 splitV 840×325 规范)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 2. 物理 Hook 求解
  const physicsResult = useRefractionExperimentPhysics({
    theta1,
    n,
    d_mm,
    pinDist,
    errorOffset,
    step,
    method,
  })

  // 3. 上屏高考拟合图表数据点：sin θ₁ - sin θ₂ 图像
  const chartData = useMemo(() => {
    const series = generateRefractionSeries(n, errorOffset, d_mm)
    return series.map((pt) => ({
      x: pt.sinTheta2Meas,
      y: pt.sinTheta1,
    }))
  }, [n, errorOffset, d_mm])

  const currentPoint = useMemo(() => {
    return {
      x: Math.sin(physicsResult.physics.theta2MeasRad),
      y: Math.sin(physicsResult.physics.theta1Rad),
    }
  }, [physicsResult.physics.theta2MeasRad, physicsResult.physics.theta1Rad])

  const xDomain = useMemo<[number, number]>(() => {
    const maxX = Math.max(0.75, ...chartData.map((d) => d.x))
    return [0, Math.min(1.0, Math.ceil(maxX * 105) / 100)]
  }, [chartData])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 上分屏 (50%)：高考数据拟合与图像法分析 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <RelationChart
          points={chartData}
          xDomain={xDomain}
          yDomain={[0, 1.0]}
          cursorX={currentPoint.x}
          title={`高考图像斜率法：sin θ₁ - sin θ₂ 关系图线 (割线斜率 k ≈ n = ${physicsResult.physics.nMeas.toFixed(3)})`}
          xLabel="sin θ₂ (折射角正弦)"
          yLabel="sin θ₁ (入射角正弦)"
        />
      </div>

      {/* 2. 下分屏 (50%)：主实验桌面 SVG 画布 */}
      <div
        className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
        ref={containerRef}
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <RefractionExperimentScene
            physics={physicsResult}
            canvasSize={canvasSize}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
