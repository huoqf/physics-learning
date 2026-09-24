import { useShallow } from 'zustand/react/shallow'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useLCPhysics } from './hooks/useLCPhysics'
import { useEMWavePhysics } from './hooks/useEMWavePhysics'
import { useEMSpectrumLayout } from './hooks/useEMSpectrumLayout'
import { LCOscillationScene } from './components/LCOscillationScene'
import { EMWaveScene } from './components/EMWaveScene'
import { EMSpectrumScene } from './components/EMSpectrumScene'

/** 场次索引（与 registry 的 defaultParams.scene 一一对应） */
const SCENE_LC = 0
const SCENE_WAVE = 1
const SCENE_SPECTRUM = 2

/** 默认参数（与 registry 的 defaultParams 保持一致） */
const LC_L_DEFAULT = 1
const LC_C_DEFAULT = 1
const LC_Q0_DEFAULT = 1

type FontFn = (size: number) => number

/**
 * 电磁振荡与电磁波 — 编排层薄壳。
 *
 * 3 个知识节点（LC 振荡 / 电磁波 / 电磁波谱）共用本薄壳，
 * 由 `params.scene` 分派到 3 个独立场景组件；每个场次各自持有自己的
 * 物理 Hook，避免"未使用场次仍消耗逐帧计算"。
 *
 * 画布统一使用 CANVAS_PRESETS.splitV（840×325）：
 * 中屏上半屏交给 EMOscillationCenterExtra 承载图表，
 * 下半屏由本画布呈现装置 —— 因此画布内不得出现任何整段教学说明。
 */
export default function EMOscillationAnimation() {
  const scene = useAnimationStore((s) => s.params.scene ?? SCENE_LC)

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {scene === SCENE_WAVE ? (
          <EMWaveStage font={canvasSize.font} />
        ) : scene === SCENE_SPECTRUM ? (
          <EMSpectrumStage font={canvasSize.font} />
        ) : (
          <LCStage font={canvasSize.font} />
        )}
      </AnimationSvgCanvas>
    </div>
  )
}

// ─── 场次 0：LC 振荡电路 ───────────────────────────────────────────────────

function LCStage({ font }: { font: FontFn }) {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const physics = useLCPhysics({
    L: params.L ?? LC_L_DEFAULT,
    C: params.C ?? LC_C_DEFAULT,
    Q0: params.Q0 ?? LC_Q0_DEFAULT,
    time,
    showDamping: (params.showDamping ?? 0) === 1,
  })

  return <LCOscillationScene physics={physics} font={font} />
}

// ─── 场次 1：麦克斯韦电磁场理论与电磁波 ───────────────────────────────────

function EMWaveStage({ font }: { font: FontFn }) {
  const { fEM, time } = useAnimationStore(
    useShallow((s) => ({ fEM: s.params.fEM ?? 100, time: s.time })),
  )

  const physics = useEMWavePhysics({ fMHz: fEM, time })

  return <EMWaveScene physics={physics} font={font} />
}

// ─── 场次 2：电磁波谱 ─────────────────────────────────────────────────────

function EMSpectrumStage({ font }: { font: FontFn }) {
  const band = useAnimationStore((s) => s.params.band ?? 0)
  const layout = useEMSpectrumLayout(band)

  return <EMSpectrumScene layout={layout} font={font} />
}
