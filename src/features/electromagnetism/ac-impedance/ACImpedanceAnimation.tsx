import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { Card } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useACImpedancePhysics } from './hooks/useACImpedancePhysics'
import { ImpedanceFreqChart } from './components/ImpedanceFreqChart'
import { ACImpedanceScene } from './components/ACImpedanceScene'

export default function ACImpedanceAnimation() {
  const { params, time, ghostSnapshot } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time, ghostSnapshot: s.ghostSnapshot })),
  )

  const {
    voltage = 100,
    frequency = 50,
    inductance = 0.5,
    capacitance = 100,
    resistance = 30,
    isDC = 0,
    mode = 0,
    compareTarget = 0,
    filterType = 0,
    hasCore = 1,
    chartType = 0,
  } = params

  // 标准 splitV Viewport (840 × 325)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  // 物理计算 Hook（单一真源）
  const physics = useACImpedancePhysics({
    voltage,
    frequency,
    inductance,
    capacitance,
    resistance,
    isDC,
    mode,
    compareTarget,
    filterType,
    hasCore,
    chartType,
    compareParams: ghostSnapshot?.params ?? null,
    time,
  })

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-neutral-50 rounded-lg">
      {/* ══════════ 上半部分：频响特性曲线 / 滤波波形（仪表盘区） ══════════ */}
      <div className="flex-1 min-h-0">
        <ImpedanceFreqChart physics={physics} time={time} />
      </div>

      {/* ══════════ 下半部分：电路原理图实验场景（舞台区） ══════════ */}
      <Card className="flex-1 min-h-0 relative overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <ACImpedanceScene
            physics={physics}
            canvasSize={canvasSize}
            time={time}
          />
        </AnimationSvgCanvas>
      </Card>
    </div>
  )
}
