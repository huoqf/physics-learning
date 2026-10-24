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

  // 物理坐标映射 (水平量程 48 m，原点在可视区几何正中心)
  //
  // 竖直量程不能写死 36 m：波前圆半径是 `w.radius * sceneScale.scaleX`（单一比例尺 → 正圆），
  // 而模式 2 的马赫锥切线走 worldToDesign（两轴分别缩放）。两个比例尺不等时，
  // 物理上本应与每条波前圆严格相切的激波包络线会与圆脱节（实测最大偏差 4.5 px，且随容器宽高比变大）。
  // 故按可视区宽高比反推 physicsHeight，使 scaleX === scaleY；physicsWidth 保持 48 m 不动，
  // 因为声源与观测者都在 y = 0 水平轴上，水平比例尺决定观感。
  const DOPPLER_WORLD_W = 48
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'viewport',
    originSource: 'center',
    physicsWidth: DOPPLER_WORLD_W,
    physicsHeight: DOPPLER_WORLD_W * (vp.designVisibleH / Math.max(vp.designVisibleW, 1)),
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
