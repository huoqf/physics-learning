import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useRelativityPhysics } from './hooks/useRelativityPhysics'
import { RelativityScene } from './components/RelativityScene'

export default function RelativityAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
  })

  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])

  const beta = params.beta ?? 0.6
  const m0 = params.m0 ?? 1.0
  const mode = params.mode ?? 0
  const showGeometry = params.showGeometry ?? 0

  const physics = useRelativityPhysics({
    beta,
    m0,
    time,
    mode,
    showGeometry: showGeometry === 1,
  })

  // 动钟地面参考系统一等比物理比例尺：保证光速合速度恒定且飞船不与右侧表盘重叠
  const trackLeft = 70
  const trackWidth = 490
  const worldSpanX = Math.max(2.6, physics.clockState.totalHorizWorld + 1.4)
  const unifiedScale = Math.min(82, trackWidth / worldSpanX)
  const originX = trackLeft + (trackWidth - physics.clockState.totalHorizWorld * unifiedScale) / 2
  const originY = 550

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customScaleX: unifiedScale,
    customScaleY: unifiedScale,
    customOriginX: originX,
    customOriginY: originY,
  })

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      title="相对论时空观与牛顿力学的局限性交互图解"
      desc="交互展示狭义相对论动钟变慢、动尺收缩与同时的相对性、牛顿力学低速宏观弱引力适用边界及质能关系。"
    >
      <RelativityScene
        physics={physics}
        vp={vp}
        sceneScale={sceneScale}
        font={canvasSize.font}
        reducedMotion={reducedMotion}
      />
    </AnimationSvgCanvas>
  )
}

export { RelativityAnimation }
