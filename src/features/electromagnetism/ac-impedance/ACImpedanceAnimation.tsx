import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useACImpedancePhysics } from './hooks/useACImpedancePhysics'
import { ImpedanceFreqChart } from './components/ImpedanceFreqChart'
import { ACImpedanceScene } from './components/ACImpedanceScene'

export default function ACImpedanceAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time })),
  )

  const {
    voltage = 100,
    frequency = 50,
    inductance = 0.5,
    capacitance = 100,
    resistance = 30,
    isDC = 0,
    mode = 0,
  } = params

  // 标准 splitV Viewport (840 × 325)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 物理计算 Hook
  const physics = useACImpedancePhysics({
    voltage,
    frequency,
    inductance,
    capacitance,
    resistance,
    isDC,
    mode,
    time,
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* ══════════ 上半部分：感抗与容抗频响图表（仪表盘区） ══════════ */}
      <div className="flex-1 min-h-0">
        <ImpedanceFreqChart
          frequency={physics.frequency}
          isDC={physics.isDC}
          XL={physics.XL}
          XC={physics.XC}
          f0={physics.f0}
          xlCurvePoints={physics.xlCurvePoints}
          xcCurvePoints={physics.xcCurvePoints}
        />
      </div>

      {/* ══════════ 下半部分：双支路对比实验电路（舞台区） ══════════ */}
      <div ref={containerRef} className="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <ACImpedanceScene
            physics={physics}
            canvasSize={canvasSize}
            time={time}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
