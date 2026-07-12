import { useId, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationStore } from '@/stores'
import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks/useSceneScale'
import { AnimationSvgCanvas } from '@/components/Layout'
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
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
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
  const layout = useMemo(() => buildVelocitySelectorLayout(preset, params.mode), [preset, params.mode])

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customScaleX: layout.scaleX,
    customScaleY: layout.scaleY,
    customOriginX: layout.cxIn,
    customOriginY: layout.cy,
    refMagnitudes: {
      force: 20,
      velocity: 20,
    },
  })

  const { canvasRef, singleParticle } = useVelocitySelectorCanvas({
    params,
    time,
    isPlaying,
    sceneScale,
    canvasSize,
    vp,
  })

  const chartData = useMemo(
    () => buildVelocitySelectorChartData(params),
    [params],
  )
  const chartGeometry = useMemo(
    () => buildVelocitySelectorChartGeometry(preset.height, layout),
    [preset.height, layout],
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
      presetHeight: preset.height,
      cxIn: layout.cxIn,
    }),
    [params.mode, params.B, layout.cy, layout.gapPlatePx, layout.wPlatePx, preset.height, layout.cxIn],
  )
  const handPoseParams = useMemo(
    () => buildVelocitySelectorHandPose({ mode: params.mode, singleParticle, q: params.q, time }),
    [params.mode, params.q, singleParticle, time],
  )

  return (
    <div className="w-full h-full relative">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} canvasRef={canvasRef}>
        <VelocitySelectorScene
          gradId={gradId}
          params={params}
          isPlaying={isPlaying}
          showVectors={showVectors}
          singleParticle={singleParticle}
          layout={layout}
          sceneScale={sceneScale}
          magneticFieldSigns={magneticFieldSigns}
          chartData={chartData}
          chartGeometry={chartGeometry}
          chartCurvePath={chartCurvePath}
          font={font}
        />
      </AnimationSvgCanvas>

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
