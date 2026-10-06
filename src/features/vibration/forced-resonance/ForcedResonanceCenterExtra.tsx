import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve } from '@/components/Chart/CharacteristicCurve'
import { MiniChart, type MiniChartLine } from '@/components/UI/MiniChart'
import { CHART_COLORS, PHYSICS_COLORS, DYNAMICS_COLORS } from '@/theme/physics'
import {
  calculateSteadyStateResonance,
  generateResonanceCurvePoints,
  calculateForcedVibrationState,
} from '@/physics/vibration/forcedResonance'

export default function ForcedResonanceCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const m = params.m ?? 1.0
  const k = params.k ?? 39.5
  const gamma = params.gamma ?? 0.5
  const F0 = params.F0 ?? 2.0
  const f = params.f ?? 1.0
  const mode = params.mode ?? 1

  const steady = useMemo(() => {
    return calculateSteadyStateResonance({ m, k, gamma, F0, f })
  }, [m, k, gamma, F0, f])

  const curvePoints = useMemo(() => {
    return generateResonanceCurvePoints(m, k, gamma, F0, 2.5, 75)
  }, [m, k, gamma, F0])

  const additionalSeries = useMemo(() => {
    if (mode === 2) {
      const weakPoints = generateResonanceCurvePoints(m, k, 0.2, F0, 2.5, 75)
      const strongPoints = generateResonanceCurvePoints(m, k, 1.2, F0, 2.5, 75)
      return [
        {
          points: weakPoints,
          label: '较小阻力 (γ=0.2)',
          series: 'success' as const,
          strokeWidth: 2,
        },
        {
          points: strongPoints,
          label: '较大阻力 (γ=1.2)',
          series: 'warm' as const,
          strokeWidth: 2,
          strokeDasharray: [4, 4],
        },
      ]
    }
    return []
  }, [mode, m, k, F0])

  const thresholds = useMemo(() => {
    return [
      {
        y: steady.maxAmplitude,
        label: `共振点 (f₀=${steady.f0.toFixed(2)}Hz, A_max=${(steady.maxAmplitude * 100).toFixed(0)}cm)`,
        color: CHART_COLORS.criticalPt,
        dasharray: '4 4',
      },
    ]
  }, [steady.maxAmplitude, steady.f0])

  // 振动图像与驱动力图像对比（采样当前时间附近的 2 个完整驱动周期）
  const period = 1 / Math.max(0.1, f)
  const windowDuration = Math.min(4.0, Math.max(1.2, 2 * period))
  const tStart = Math.max(0, time - windowDuration)
  const tEnd = Math.max(windowDuration, time)

  const timeSeriesPoints = useMemo(() => {
    const pts: Record<string, number>[] = []
    const sampleCount = 60
    const dt = (tEnd - tStart) / sampleCount
    const config = { m, k, gamma, F0, f }

    // 对比基准：将位移与驱动力按各自振幅与外力幅值缩放，以便在同一坐标系观察周期与步调
    const xNorm = Math.max(0.01, steady.amplitude)
    const fNorm = Math.max(0.1, F0)

    for (let i = 0; i <= sampleCount; i++) {
      const sampleT = tStart + i * dt
      const st = calculateForcedVibrationState(config, sampleT, mode)
      pts.push({
        t: sampleT,
        xNorm: (st.x / xNorm) * 1.0,
        fNorm: (st.fDriver / fNorm) * 1.0,
      })
    }
    return pts
  }, [m, k, gamma, F0, f, mode, tStart, tEnd, steady.amplitude])

  const currentState = useMemo(() => {
    return calculateForcedVibrationState({ m, k, gamma, F0, f }, time, mode)
  }, [m, k, gamma, F0, f, time, mode])

  const xNorm = Math.max(0.01, steady.amplitude)
  const fNorm = Math.max(0.1, F0)
  const currentVals = {
    xNorm: (currentState.x / xNorm) * 1.0,
    fNorm: (currentState.fDriver / fNorm) * 1.0,
  }

  const lines: MiniChartLine[] = useMemo(
    () => [
      {
        key: 'xNorm',
        color: PHYSICS_COLORS.displacement,
        strokeWidth: 2.2,
        name: '振子位移 x',
        showValueInLegend: false,
      },
      {
        key: 'fNorm',
        color: DYNAMICS_COLORS.appliedForce,
        strokeWidth: 2,
        strokeDasharray: '4 3',
        name: '周期驱动力 F_驱',
        showValueInLegend: false,
      },
    ],
    []
  )

  // 判定当前振动状态（共振区 / 低频跟随 / 高频避振）
  const isResonanceZone = Math.abs(f - steady.f0) < 0.08
  const isLowFreqZone = f <= steady.f0 - 0.08

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-neutral-50/50 rounded-xl overflow-hidden min-h-0">
      {/* 高中核心状态指示栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-neutral-100 shadow-xs shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-700">当前振动状态:</span>
          {isResonanceZone ? (
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold border border-red-200">
              ⚡ 强烈共振区 (f ≈ f₀，振幅极大)
            </span>
          ) : isLowFreqZone ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">
              🔄 低频区 (f &lt; f₀，振子跟随驱动)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold border border-purple-200">
              🛡️ 高频避振区 (f &gt; f₀，振幅极小)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-neutral-500">
          <span>
            驱动力频率: <strong className="text-neutral-800">{f.toFixed(2)} Hz</strong>
          </span>
          <span>
            系统固有频率: <strong className="text-neutral-800">{steady.f0.toFixed(2)} Hz</strong>
          </span>
        </div>
      </div>

      {/* 上半部：共振曲线 (A - f 图像) */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-xs border border-neutral-100 p-2 flex flex-col">
        <div className="flex-1 min-h-0">
          <CharacteristicCurve
            points={curvePoints}
            title="共振曲线：受迫振幅随驱动力频率变化 (A - f 图像)"
            xLabel="驱动力频率 f / Hz"
            yLabel="受迫振幅 A / m"
            xDomain={[0, 2.5]}
            currentX={f}
            thresholds={thresholds}
            additionalSeries={additionalSeries}
            series="primary"
          />
        </div>
      </div>

      {/* 下半部：振动图像与驱动力随时间变化 (x-t 与 F_驱-t 图像) */}
      <div className="h-48 shrink-0 bg-white rounded-xl shadow-xs border border-neutral-100 p-2 flex flex-col">
        <div className="flex items-center justify-between px-1 mb-1 shrink-0">
          <span className="text-xs font-semibold text-neutral-700">
            振动图像与驱动力图像对比 (x-t 与 F_驱-t 对比)
          </span>
          <span className="text-[11px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
            {isResonanceZone
              ? '⚡ 共振状态：速度与驱动力同向，持续做正功输入能量，振幅达到峰值！'
              : isLowFreqZone
              ? '🔄 低频状态：外力变化缓慢，振子同向随动起伏 (周期严格满足 T_受迫 = T_驱)'
              : '🛡️ 高频状态：外力交变过快，振子受惯性滞后振幅极小 (周期同样满足 T_受迫 = T_驱)'}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <MiniChart
            title=""
            xMin={tStart}
            xMax={tEnd}
            yMin={-1.2}
            yMax={1.2}
            points={timeSeriesPoints}
            lines={lines}
            xKey="t"
            yLabel="相对大小 (x/A, F/F₀)"
            xLabel="时间 t / s (右侧点为当前时刻)"
            currentVals={currentVals}
            currentXVal={time}
          />
        </div>
      </div>
    </div>
  )
}
