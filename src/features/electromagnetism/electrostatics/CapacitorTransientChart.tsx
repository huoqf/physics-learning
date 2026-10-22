import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { MiniChart } from '@/components/UI'
import type { MiniChartLine, MiniChartStaticLine } from '@/components/UI'
import {
  computeRCTransient,
  sampleRCTransient,
  rcTauFromParams,
  RC_WINDOW_TAUS,
  type RCPhase,
} from '@/physics/electromagnetism/rcTransient'
import { PHYSICS_COLORS } from '@/theme/physics'

/**
 * RC 充放电暂态曲线：左 i–t（阴影面积 = ΔQ），右 u_C–t。
 *
 * 两条曲线各自独立纵轴：i 的量级是 mA、u_C 的量级是 V，共用一根纵轴必然把其中一条压成直线。
 * 曲线按解析模型采样，由 MiniChart 在游标处裁剪，播放/暂停/拖动都只取决于当前 time。
 */
export default function CapacitorTransientChart() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const emf = params.emf ?? 6
  const R = (params.R_t ?? 10) * 1e3
  const C = (params.C_t ?? 200) * 1e-6
  const phase: RCPhase = (params.phase ?? 0) === 1 ? 'discharge' : 'charge'

  // τ 与窗口长度都从 physics 层取，注册表的 maxTime / 临界点用的是同一个函数
  const tau = rcTauFromParams(params)
  const windowSec = RC_WINDOW_TAUS * tau
  const t = Math.min(Math.max(time, 0), windowSec)
  const state = computeRCTransient(emf, R, C, t, phase)

  const points = useMemo(() => {
    const raw = sampleRCTransient(emf, R, C, phase, windowSec, 160)
    // 电流换成 mA、电量换成 μC，图例读数才不会全是 0.0x
    return raw.map((p) => ({ t: p.t, i: p.i * 1e3, uC: p.uC, q: p.q * 1e6 }))
  }, [emf, R, C, phase, windowSec])

  const iMaxMA = (emf / R) * 1e3
  const phaseName = phase === 'charge' ? '充电' : '放电'

  const iLines: MiniChartLine[] = useMemo(
    () => [{ key: 'i', color: PHYSICS_COLORS.velocity, name: 'i (mA)', strokeWidth: 2, valueDigits: 3 }],
    [],
  )
  const uLines: MiniChartLine[] = useMemo(
    () => [{ key: 'uC', color: PHYSICS_COLORS.electricPotential, name: 'u_C (V)', strokeWidth: 2, valueDigits: 2 }],
    [],
  )

  const iStatic: MiniChartStaticLine[] = useMemo(
    () => [
      {
        value: phase === 'charge' ? iMaxMA : -iMaxMA,
        color: PHYSICS_COLORS.velocity,
        strokeDasharray: '4,4',
        name: phase === 'charge' ? '+I₀' : '−I₀',
        valueDigits: 3,
      },
    ],
    [iMaxMA, phase],
  )
  const uStatic: MiniChartStaticLine[] = useMemo(
    () => [
      { value: emf, color: PHYSICS_COLORS.electricPotential, strokeDasharray: '4,4', name: 'E', valueDigits: 2 },
      { value: emf * Math.exp(-1), color: PHYSICS_COLORS.electricPotential, strokeDasharray: '2,4', name: 'E·e⁻¹ (t=τ)', valueDigits: 2 },
    ],
    [emf],
  )

  return (
    <div className="flex h-full w-full gap-2">
      <div className="flex-1 min-w-0">
        <MiniChart
          title={`${phaseName}电流 i − t（阴影面积 = ΔQ）`}
          xMin={0}
          xMax={windowSec}
          yMin={-iMaxMA * 1.2}
          yMax={iMaxMA * 1.2}
          points={points}
          lines={iLines}
          xKey="t"
          yLabel="i / mA"
          xLabel="t / s"
          currentVals={{ i: state.i * 1e3 }}
          currentXVal={t}
          staticLines={iStatic}
          shadedArea={{ key: 'i', color: PHYSICS_COLORS.capacitor, opacity: 0.22 }}
          minWidth={220}
          minHeight={120}
        />
      </div>
      <div className="flex-1 min-w-0">
        <MiniChart
          title={`${phaseName}电压 u_C − t`}
          xMin={0}
          xMax={windowSec}
          yMin={0}
          yMax={emf * 1.2}
          points={points}
          lines={uLines}
          xKey="t"
          yLabel="u_C / V"
          xLabel="t / s"
          currentVals={{ uC: state.uC }}
          currentXVal={t}
          staticLines={uStatic}
          minWidth={220}
          minHeight={120}
        />
      </div>
    </div>
  )
}
