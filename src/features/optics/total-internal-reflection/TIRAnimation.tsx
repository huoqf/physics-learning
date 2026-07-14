import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateCriticalAngle } from '@/physics/optics'
import SingleBeamMode from './components/SingleBeamMode'
import PointSourceMode from './components/PointSourceMode'

/** 场景设计坐标尺寸（与 CANVAS_PRESETS.full 840×650 对齐） */
const VIEW_WIDTH = 840
const VIEW_HEIGHT = 650
const WATER_SURFACE_Y_RATIO = 0.4

export default function TIRAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    presetCompensation: 1.2,
  })

  const mode = params.mode ?? 0
  const theta1 = params.theta1 ?? 30
  const n = params.n ?? 1.33
  const depth = params.depth ?? 2

  const { font } = canvasSize

  const { theta_c_deg } = calculateCriticalAngle(n, 1)
  const isTotalReflection = theta1 >= theta_c_deg

  const cx = VIEW_WIDTH / 2
  const cy = VIEW_HEIGHT * WATER_SURFACE_Y_RATIO

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {mode === 1 ? (
        <PointSourceMode
          depth={depth} n={n} theta_c_deg={theta_c_deg}
          cx={VIEW_WIDTH * 0.35} cy={cy}
          font={font}
        />
      ) : (
        <SingleBeamMode
          theta1={theta1} n={n} theta_c_deg={theta_c_deg}
          isTotalReflection={isTotalReflection}
          cx={cx} cy={cy}
          font={font}
        />
      )}
    </AnimationSvgCanvas>
  )
}
