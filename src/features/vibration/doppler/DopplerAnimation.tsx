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

  // 标准 splitV Viewport (840 × 325)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
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

  // 物理坐标映射 (物理视野宽 60m，高 25m，居中)
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: 60,
    physicsHeight: 25,
    refMagnitudes: { velocity: Math.max(10, sourceSpeed * 0.1) },
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* ══════════ 上半部分：示波器时域接收波形与视在频率（仪表盘区） ══════════ */}
      <div className="flex-1 min-h-0">
        <DopplerFrequencyChart
          frequency={physics.frequency}
          fFront={physics.fFront}
          fBack={physics.fBack}
          sourceWaveform={physics.sourceWaveform}
          frontWaveform={physics.frontWaveform}
          backWaveform={physics.backWaveform}
        />
      </div>

      {/* ══════════ 下半部分：波源运动与偏心圆波阵面（舞台区） ══════════ */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      >
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
    </div>
  )
}
