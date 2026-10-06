import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useDopplerPhysics } from './hooks/useDopplerPhysics'
import { DopplerFrequencyChart } from './components/DopplerFrequencyChart'
import { DopplerWavefrontScene } from './components/DopplerWavefrontScene'

export default function DopplerAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const {
    waveSpeed = 340,
    sourceSpeed = 100,
    frequency = 10,
    observerSpeed = 0,
    mode = 0,
  } = params

  // 标准 full Viewport (840 × 650)，顶部预留 68px 供 HUD 示波器浮层避让
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,
    overlayTop: 68,
  })

  // 物理计算 Hook
  const physics = useDopplerPhysics({
    waveSpeed,
    sourceSpeed,
    frequency,
    observerSpeed,
    mode,
    time,
  })

  // 物理坐标映射 (物理视野宽 48m，高 36m，原点在可视区几何正中心)
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    originSource: 'center',
    physicsWidth: 48,
    physicsHeight: 36,
    refMagnitudes: { velocity: Math.max(10, sourceSpeed * 0.1) },
  })

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50">
      {/* ══════════ 顶部 HUD：时域示波器与接收视在频率（规范场景 2 悬浮层） ══════════ */}
      <div className="absolute top-2.5 left-3 right-3 z-10 bg-white/92 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-sm pointer-events-none">
        <DopplerFrequencyChart
          mode={physics.mode}
          frequency={physics.frequency}
          fFront={physics.fFront}
          fBack={physics.fBack}
          fObserver={physics.fObserver}
          observerSpeed={physics.observerSpeed}
          sourceWaveform={physics.sourceWaveform}
          frontWaveform={physics.frontWaveform}
          backWaveform={physics.backWaveform}
          observerWaveform={physics.observerWaveform}
          isSupersonic={physics.isSupersonic}
        />
      </div>

      {/* ══════════ 核心视觉舞台：二维波前偏心圆族与声学运动场景 (840×650 全景) ══════════ */}
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <DopplerWavefrontScene
          physics={physics}
          canvasSize={canvasSize}
          sceneScale={sceneScale}
          vp={vp}
          time={time}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
