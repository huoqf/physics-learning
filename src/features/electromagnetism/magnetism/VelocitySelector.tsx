import { useId, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationStore } from '@/stores'
import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks/useSceneScale'
import { peakOverRays, refFromPeak } from '@/utils/vectorRefs'
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
  VELOCITY_SELECTOR_BOUNDS,
} from './velocity-selector/model/velocitySelectorModel'
import { useVelocitySelectorCanvas } from './velocity-selector/hooks/useVelocitySelectorCanvas'
import { VelocitySelectorScene } from './velocity-selector/components/VelocitySelectorScene'
import { VelocitySelectorHandRuleCard } from './velocity-selector/components/VelocitySelectorHandRuleCard'

/** 滑杆默认值（模型自身的兜底值，避免在基准里另写一份） */
const DEFAULT_PARAMS = normalizeVelocitySelectorParams({})

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

  /**
   * 洛伦兹力矢量基准（F = |q|·|v|·|B|）。
   *
   * 该力**不随时间变化**（单粒子在匀强磁场里做匀速圆周运动），若基准跟着当前 v、B 一起放大，
   * 箭头长度恒定不变 —— 改滑杆时看不到力的变化（正是本批要清掉的「恒定箭头」病）。
   * 故基准取「单滑杆极值扫描」：v 取量程上界（B 不动）/ B 取量程上界（v 不动）两情形的较大者，
   * 取全角点（v=20、B=4 → 80 N）会把默认帧压到 13px 以下。
   *
   * 进阶模式（速度选择器）的粒子受力由 canvas 直接绘制、不走 VectorArrow，
   * 因此本基准只在单粒子模式下生效。
   */
  const lorentzForceRef = useMemo(() => {
    const peak = peakOverRays(
      (p) => Math.abs(p.v0) * Math.abs(p.B),
      { v0: DEFAULT_PARAMS.v0, B: DEFAULT_PARAMS.B },
      { v0: VELOCITY_SELECTOR_BOUNDS.v0, B: VELOCITY_SELECTOR_BOUNDS.B },
    )
    return refFromPeak(peak)
  }, [])

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
      lorentzForce: lorentzForceRef,
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
