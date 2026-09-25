import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useRelativityPhysics } from './hooks/useRelativityPhysics'
import { RelativityScene } from './components/RelativityScene'

export default function RelativityAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  const beta = params.beta ?? 0.6
  const m0 = params.m0 ?? 1.0
  const mode = params.mode ?? 0
  const showGeometry = params.showGeometry ?? 1

  const physics = useRelativityPhysics({
    beta,
    m0,
    time,
    mode,
    showGeometry: showGeometry === 1,
  })

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <RelativityScene physics={physics} font={canvasSize.font} />
      </AnimationSvgCanvas>
    </div>
  )
}

export { RelativityAnimation }
