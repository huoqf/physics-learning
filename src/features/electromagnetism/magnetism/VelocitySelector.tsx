import { useId, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationStore } from '@/stores'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  buildMagneticFieldSigns,
  buildVelocitySelectorChartData,
  buildVelocitySelectorChartGeometry,
  buildVelocitySelectorChartPath,
  buildVelocitySelectorHandPose,
  buildVelocitySelectorLayout,
  normalizeVelocitySelectorParams,
} from './velocity-selector/model/velocitySelectorModel'
import { useVelocitySelectorCanvas } from './velocity-selector/hooks/useVelocitySelectorCanvas'
import { VelocitySelectorScene } from './velocity-selector/components/VelocitySelectorScene'
import { VelocitySelectorHandRuleCard } from './velocity-selector/components/VelocitySelectorHandRuleCard'

export default function VelocitySelector() {
  const gradId = useId()
  const [sizeRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const { font } = canvasSize

  const { params: rawParams, time, isPlaying, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      showVectors: s.showVectors,
    })),
  )

  const params = useMemo(() => normalizeVelocitySelectorParams(rawParams), [rawParams])
  const layout = useMemo(() => buildVelocitySelectorLayout(canvasSize, params.mode), [canvasSize, params.mode])

  const { canvasRef, singleParticle } = useVelocitySelectorCanvas({
    params,
    time,
    isPlaying,
    sceneScale: layout.sceneScale,
    canvasSize,
  })

  const chartData = useMemo(
    () => buildVelocitySelectorChartData(params),
    [params],
  )
  const chartGeometry = useMemo(
    () => buildVelocitySelectorChartGeometry(canvasSize, layout),
    [canvasSize, layout],
  )
  const chartCurvePath = useMemo(
    () => (chartData ? buildVelocitySelectorChartPath(chartData, chartGeometry) : ''),
    [chartData, chartGeometry],
  )
  const magneticFieldSigns = useMemo(
    () => buildMagneticFieldSigns({
      mode: params.mode,
      B: params.B,
      cy: layout.cy,
      gapPlatePx: layout.gapPlatePx,
      wPlatePx: layout.wPlatePx,
      canvasHeight: canvasSize.height,
      cxIn: layout.cxIn,
    }),
    [params.mode, params.B, layout.cy, layout.gapPlatePx, layout.wPlatePx, layout.cxIn, canvasSize.height],
  )
  const handPoseParams = useMemo(
    () => buildVelocitySelectorHandPose({ mode: params.mode, singleParticle, q: params.q, time }),
    [params.mode, params.q, singleParticle, time],
  )

  return (
    <div ref={sizeRef} className="w-full h-full relative">
      <VelocitySelectorScene
        width={canvasSize.width}
        height={canvasSize.height}
        gradId={gradId}
        params={params}
        isPlaying={isPlaying}
        showVectors={showVectors}
        singleParticle={singleParticle}
        layout={layout}
        magneticFieldSigns={magneticFieldSigns}
        chartData={chartData}
        chartGeometry={chartGeometry}
        chartCurvePath={chartCurvePath}
        font={font}
      />

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {params.showHandRule && (
        <VelocitySelectorHandRuleCard
          mode={params.mode}
          charge={params.q}
          handPoseParams={handPoseParams}
          font={font}
        />
      )}
    </div>
  )
}
