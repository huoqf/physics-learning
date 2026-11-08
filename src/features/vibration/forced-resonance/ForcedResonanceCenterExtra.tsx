import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve, type CharacteristicCurveSeries } from '@/components/Chart/CharacteristicCurve'
import { MiniChart, type MiniChartLine, type MiniChartStaticLine } from '@/components/UI/MiniChart'
import { Card } from '@/components/UI/Card'
import { CHART_COLORS, PHYSICS_COLORS, SERIES_MAP } from '@/theme/physics'
import {
  calculateSteadyStateResonance,
  generateResonanceCurvePoints,
  calculateForcedVibrationState,
  FORCED_RESONANCE_INITIAL_DISPLACEMENT,
} from '@/physics/vibration/forcedResonance'

/** 不同阻尼对比模式（mode = 2）的参考弱阻尼与强阻尼系数 */
const WEAK_GAMMA = 0.3
const STRONG_GAMMA = 1.2

/** 将米 (m) 单位的 A-f 采样点转换为厘米 (cm)，并补齐 f=0 处的准静态截距 A(0)=F0/k */
function toCmResonancePoints(
  m: number,
  k: number,
  gamma: number,
  F0: number,
  fMax = 2.5,
  stepCount = 75,
): { x: number; y: number }[] {
  const staticAmpCm = (F0 / Math.max(0.1, k)) * 100
  const raw = generateResonanceCurvePoints(m, k, gamma, F0, fMax, stepCount)
  return [{ x: 0, y: staticAmpCm }, ...raw.map((p) => ({ x: p.x, y: p.y * 100 }))]
}

export default function ForcedResonanceCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const m = params.m ?? 1.0
  const k = params.k ?? 39.5
  const gamma = params.gamma ?? 0.6
  const F0 = params.F0 ?? 2.0
  const f = params.f ?? 1.0
  const mode = params.mode ?? 1

  const steady = useMemo(() => {
    return calculateSteadyStateResonance({ m, k, gamma, F0, f })
  }, [m, k, gamma, F0, f])

  // ── 上/下图表共享的统一纵轴量程 yBound (cm) ─────────────────────────────
  // 标准基准为 120 cm（4 等分刻度：30/60/90/120 与 -120/-60/0/60/120），
  // 锁定量程使调节 γ 或 F0 时，上半部 A-f 共振峰高度与下半部 x-t 波形高度按 1:1 真实伸缩。
  const yBound = useMemo(() => {
    if (mode === 0) {
      const initPeakCm = (FORCED_RESONANCE_INITIAL_DISPLACEMENT + steady.amplitude) * 100 * 1.15
      return Math.max(80, Math.ceil(initPeakCm / 20) * 20)
    }
    const weakPeakCm =
      mode === 2
        ? calculateSteadyStateResonance({ m, k, gamma: WEAK_GAMMA, F0, f }).maxAmplitude * 100
        : 0
    const requiredMaxCm = Math.max(steady.maxAmplitude * 100, weakPeakCm) * 1.12
    return Math.max(120, Math.ceil(requiredMaxCm / 40) * 40)
  }, [mode, m, k, F0, f, steady.amplitude, steady.maxAmplitude])

  // ── Mode 1 & 2 上半部：A-f 共振特性曲线数据 ─────────────────────────────
  const curvePoints = useMemo(() => {
    return toCmResonancePoints(m, k, gamma, F0, 2.5, 75)
  }, [m, k, gamma, F0])

  const additionalSeries = useMemo<CharacteristicCurveSeries[]>(() => {
    const f0VerticalLine: CharacteristicCurveSeries = {
      points: [
        { x: steady.f0, y: 0 },
        { x: steady.f0, y: steady.maxAmplitude * 100 },
      ],
      color: CHART_COLORS.criticalPt,
      strokeWidth: 1.5,
      strokeDasharray: [4, 4],
    }

    if (mode === 2) {
      const weakPoints = toCmResonancePoints(m, k, WEAK_GAMMA, F0, 2.5, 75)
      const strongPoints = toCmResonancePoints(m, k, STRONG_GAMMA, F0, 2.5, 75)
      return [
        f0VerticalLine,
        {
          points: weakPoints,
          series: 'success' as const,
          strokeWidth: 2,
        },
        {
          points: strongPoints,
          series: 'warm' as const,
          strokeWidth: 2,
          strokeDasharray: [4, 4],
        },
      ]
    }
    return [f0VerticalLine]
  }, [mode, m, k, F0, steady.f0, steady.maxAmplitude])

  const thresholds = useMemo(() => {
    return [
      {
        y: steady.maxAmplitude * 100,
        label: 'Amax',
        color: CHART_COLORS.criticalPt,
        dasharray: '4 4',
      },
    ]
  }, [steady.maxAmplitude])

  // ── 统一时序窗口与实时同步采样（上/下图表及左半区动画 100% 同步推进） ─────
  const period = 1 / Math.max(0.1, f)
  const windowDuration = mode === 0 ? 8.0 : Math.min(4.0, Math.max(1.5, 2 * period))
  const tStart = Math.max(0, time - windowDuration)
  const tEnd = Math.max(windowDuration, time)

  const timeSeriesPoints = useMemo(() => {
    const pts: Record<string, number>[] = []
    const activeEnd = Math.max(tStart, Math.min(tEnd, time))
    const span = activeEnd - tStart
    const config = { m, k, gamma, F0, f }
    const weakConfig = { m, k, gamma: WEAK_GAMMA, F0, f }
    const strongConfig = { m, k, gamma: STRONG_GAMMA, F0, f }

    const buildPoint = (sampleT: number) => {
      const st = calculateForcedVibrationState(config, sampleT, mode)
      const envCm = (steady.amplitude + st.transientEnvelope) * 100
      const weakXCm =
        mode === 2 ? calculateForcedVibrationState(weakConfig, sampleT, 1).x * 100 : 0
      const strongXCm =
        mode === 2 ? calculateForcedVibrationState(strongConfig, sampleT, 1).x * 100 : 0
      return {
        t: sampleT,
        xCm: st.x * 100,
        envUpperCm: envCm,
        envLowerCm: -envCm,
        xTransientCm: st.xTransient * 100,
        xSteadyCm: st.xSteady * 100,
        xWeakCm: weakXCm,
        xStrongCm: strongXCm,
      }
    }

    if (span < 1e-4) {
      pts.push(buildPoint(tStart))
      return pts
    }

    const sampleCount = mode === 0 ? 120 : 90
    const dt = span / sampleCount

    for (let i = 0; i <= sampleCount; i++) {
      const sampleT = i === sampleCount ? activeEnd : tStart + i * dt
      pts.push(buildPoint(sampleT))
    }
    return pts
  }, [m, k, gamma, F0, f, mode, tStart, tEnd, time, steady.amplitude])

  const currentState = useMemo(() => {
    return calculateForcedVibrationState({ m, k, gamma, F0, f }, time, mode)
  }, [m, k, gamma, F0, f, time, mode])

  const currentVals: Record<string, number> = useMemo(() => {
    const envCm = (steady.amplitude + currentState.transientEnvelope) * 100
    const weakXCm =
      mode === 2
        ? calculateForcedVibrationState({ m, k, gamma: WEAK_GAMMA, F0, f }, time, 1).x * 100
        : 0
    const strongXCm =
      mode === 2
        ? calculateForcedVibrationState({ m, k, gamma: STRONG_GAMMA, F0, f }, time, 1).x * 100
        : 0
    return {
      xCm: currentState.x * 100,
      envUpperCm: envCm,
      envLowerCm: -envCm,
      xTransientCm: currentState.xTransient * 100,
      xSteadyCm: currentState.xSteady * 100,
      xWeakCm: weakXCm,
      xStrongCm: strongXCm,
    }
  }, [currentState, steady.amplitude, mode, m, k, F0, f, time])

  // 图表内部不渲染任何压线图例文字（name 均置空）
  const mode0UpperLines: MiniChartLine[] = useMemo(
    () => [
      {
        key: 'xCm',
        color: PHYSICS_COLORS.displacement,
        strokeWidth: 2,
        name: '',
      },
      {
        key: 'envUpperCm',
        color: SERIES_MAP.warm,
        strokeWidth: 1.5,
        strokeDasharray: '4 3',
        name: '',
      },
      {
        key: 'envLowerCm',
        color: SERIES_MAP.warm,
        strokeWidth: 1.5,
        strokeDasharray: '4 3',
        name: '',
      },
    ],
    []
  )

  const steadyStaticLines: MiniChartStaticLine[] = useMemo(() => {
    const ampCm = steady.amplitude * 100
    return [
      {
        value: ampCm,
        color: CHART_COLORS.criticalPt,
        strokeDasharray: '3 3',
        name: '',
      },
      {
        value: -ampCm,
        color: CHART_COLORS.criticalPt,
        strokeDasharray: '3 3',
        name: '',
      },
    ]
  }, [steady.amplitude])

  const lowerLines: MiniChartLine[] = useMemo(() => {
    if (mode === 0) {
      return [
        {
          key: 'xTransientCm',
          color: SERIES_MAP.warm,
          strokeWidth: 1.8,
          strokeDasharray: '4 3',
          name: '',
        },
        {
          key: 'xSteadyCm',
          color: PHYSICS_COLORS.displacement,
          strokeWidth: 2,
          name: '',
        },
      ]
    }
    if (mode === 2) {
      // 不同阻尼模式下，下半部 x-t 图同步绘制弱阻尼 (γ=0.3)、强阻尼 (γ=1.2) 与当前阻尼三条实时波形，与上半部 A-f 图一一对应
      return [
        {
          key: 'xWeakCm',
          color: SERIES_MAP.success,
          strokeWidth: 1.6,
          name: '',
        },
        {
          key: 'xStrongCm',
          color: SERIES_MAP.warm,
          strokeWidth: 1.6,
          strokeDasharray: '4 4',
          name: '',
        },
        {
          key: 'xCm',
          color: SERIES_MAP.primary,
          strokeWidth: 2.4,
          name: '',
        },
      ]
    }
    return [
      {
        key: 'xCm',
        color: PHYSICS_COLORS.displacement,
        strokeWidth: 2.2,
        name: '',
      },
    ]
  }, [mode])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-neutral-50/50 rounded-xl overflow-hidden min-h-0">
      {/* 上半部图表（flex-1 占 50% 高度） */}
      <Card className="flex-1 min-h-0 p-2 flex flex-col">
        {mode === 0 ? (
          <>
            <div className="text-xs font-semibold text-neutral-600 px-3 pt-1 shrink-0 flex items-center justify-between">
              <span>总位移包络 (x - t)</span>
              <div className="flex items-center gap-3 text-[11px] font-normal text-neutral-600">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-3 h-0.5 rounded-full"
                    style={{ backgroundColor: PHYSICS_COLORS.displacement }}
                  />
                  总位移
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-3 h-0 border-t-2 border-dashed"
                    style={{ borderColor: SERIES_MAP.warm }}
                  />
                  衰减包络
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MiniChart
                title=""
                xMin={tStart}
                xMax={tEnd}
                yMin={-yBound}
                yMax={yBound}
                points={timeSeriesPoints}
                lines={mode0UpperLines}
                staticLines={steadyStaticLines}
                xKey="t"
                yLabel="x / cm"
                xLabel="t / s"
                currentVals={currentVals}
                currentXVal={time}
                minWidth={460}
                minHeight={230}
              />
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold text-neutral-600 px-3 pt-1 shrink-0 flex items-center justify-between">
              <span>共振曲线 (A - f)</span>
              {mode === 2 && (
                <div className="flex items-center gap-3 text-[11px] font-normal text-neutral-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SERIES_MAP.primary }} />
                    当前 γ={gamma.toFixed(2)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SERIES_MAP.success }} />
                    弱阻尼 γ=0.3
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="w-3 h-0 border-t-2 border-dashed"
                      style={{ borderColor: SERIES_MAP.warm }}
                    />
                    强阻尼 γ=1.2
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <CharacteristicCurve
                points={curvePoints}
                xLabel="f / Hz"
                yLabel="A / cm"
                xDomain={[0, 2.5]}
                yDomain={[0, yBound]}
                currentX={f}
                thresholds={thresholds}
                additionalSeries={additionalSeries}
                series="primary"
              />
            </div>
          </>
        )}
      </Card>

      {/* 下半部图表（flex-1 占 50% 高度） */}
      <Card className="flex-1 min-h-0 p-2 flex flex-col">
        <div className="text-xs font-semibold text-neutral-600 px-3 pt-1 shrink-0 flex items-center justify-between">
          <span>
            {mode === 0
              ? '分量分解 (x - t)'
              : mode === 2
                ? '不同阻尼稳态波形对比 (x - t)'
                : '振动图像 (x - t)'}
          </span>
          {mode === 0 && (
            <div className="flex items-center gap-3 text-[11px] font-normal text-neutral-600">
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-3 h-0 border-t-2 border-dashed"
                  style={{ borderColor: SERIES_MAP.warm }}
                />
                固有衰减项
              </span>
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-3 h-0.5 rounded-full"
                  style={{ backgroundColor: PHYSICS_COLORS.displacement }}
                />
                受迫稳态项
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <MiniChart
            title=""
            xMin={tStart}
            xMax={tEnd}
            yMin={-yBound}
            yMax={yBound}
            points={timeSeriesPoints}
            lines={lowerLines}
            staticLines={mode === 0 ? undefined : steadyStaticLines}
            xKey="t"
            yLabel="x / cm"
            xLabel="t / s"
            currentVals={currentVals}
            currentXVal={time}
            minWidth={460}
            minHeight={230}
          />
        </div>
      </Card>
    </div>
  )
}
