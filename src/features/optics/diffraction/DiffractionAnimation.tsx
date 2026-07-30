import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useDiffractionPhysics } from './hooks/useDiffractionPhysics'
import { DiffractionScene } from './components/DiffractionScene'

export default function DiffractionAnimation() {
  // ── 1. Store 精确订阅 ──
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  // ── 2. Viewport 视口设置 ──
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  // ── 3. 提取左侧调节与模式参数 ──
  const modeVal = params.mode ?? 0
  const mode = modeVal === 0 ? 'single-slit' : modeVal === 1 ? 'circular' : 'poisson'
  const wavelength = params.wavelength ?? 650       // nm
  const obstacleSize = params.obstacleSize ?? 0.1   // mm (可以是缝宽、孔径、圆盘直径)
  const screenDistance = params.screenDistance ?? 1.0 // m

  // ── 4. 物理计算 ──
  const physics = useDiffractionPhysics({
    mode,
    wavelength,
    obstacleSize,
    screenDistance,
    time,
  })

  // ── 5. 场景坐标全部基于固定设计坐标系（840×650），无需 SceneScale

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <DiffractionScene
          physics={physics}
          canvasSize={canvasSize}
          mode={mode}
          wavelength={wavelength}
          obstacleSize={obstacleSize}
          screenDistance={screenDistance}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
