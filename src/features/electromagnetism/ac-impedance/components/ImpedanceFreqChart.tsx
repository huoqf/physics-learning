import { useMemo } from 'react'
import { RelationChart, type RelationDataSeries, type RelationMarker } from '@/components/Chart'
import { Card } from '@/components/UI'
import { useChartTimeScrub } from '@/context/ChartTimeScrubContext'
import {
  SWEEP_F_MAX,
  SWEEP_F_MIN,
  TRANSIENT_DURATION,
  sweepTimeForFrequency,
} from '@/physics/electromagnetism/acImpedance'
import { CHART_COLORS, EM_COLORS, withAlpha } from '@/theme/physics'
import type { ACImpedancePhysicsResult } from '../hooks/useACImpedancePhysics'

interface ImpedanceFreqChartProps {
  physics: ACImpedancePhysicsResult
  time: number
}

export function ImpedanceFreqChart({ physics, time }: ImpedanceFreqChartProps) {
  const scrub = useChartTimeScrub()
  const {
    mode,
    isDC,
    compareTarget,
    filterType,
    chartType,
    frequency,
    XL,
    XC,
    f0,
    fixedCurrentYMax,
    fixedOscYMax,
    iRCurvePoints,
    iLCurvePoints,
    iCCurvePoints,
    xlCurvePoints,
    xcCurvePoints,
    oscWave,
    compareCurves,
    filterWave,
  } = physics

  // ── 1. 模式 2：扼流滤波波形对比图 ──────────────────────────────────────
  const filterTitle =
    filterType === 0
      ? '低频扼流圈：输入混合信号 vs 负载输出波形'
      : filterType === 1
        ? '高频扼流圈：输入混合信号 vs 负载输出波形'
        : '高频旁路电容：输入混合信号 vs 负载输出波形'

  const filterSeries = useMemo(
    (): RelationDataSeries[] => [
      {
        points: filterWave.inputWave,
        label: '输入混合信号',
        color: CHART_COLORS.reference,
        strokeDasharray: [4, 3],
        strokeWidth: 1.6,
      },
    ],
    [filterWave.inputWave],
  )

  // ── 2. 模式 0：扫频 I–f 曲线 ───────────────────────────────────────────
  const sweepCurrentSeries = useMemo((): RelationDataSeries[] => {
    const base: RelationDataSeries[] = [
      {
        points: iCCurvePoints,
        label: '电容支路 I_C',
        color: EM_COLORS.capacitor,
      },
      {
        points: iRCurvePoints,
        label: '电阻支路 I_R',
        color: EM_COLORS.resistance,
        strokeDasharray: [5, 4],
      },
    ]
    if (compareCurves?.iLCurve && compareCurves?.iCCurve) {
      base.push(
        {
          points: compareCurves.iLCurve,
          label: '对照 I_L',
          color: withAlpha(EM_COLORS.inductor, 0.5),
          strokeDasharray: [3, 3],
          strokeWidth: 1.5,
        },
        {
          points: compareCurves.iCCurve,
          label: '对照 I_C',
          color: withAlpha(EM_COLORS.capacitor, 0.5),
          strokeDasharray: [3, 3],
          strokeWidth: 1.5,
        },
      )
    }
    return base
  }, [iCCurvePoints, iRCurvePoints, compareCurves])

  // ── 3. 模式 0：扫频 X–f 曲线 ───────────────────────────────────────────
  const reactanceMarkers = useMemo((): RelationMarker[] => {
    if (f0 <= 15 || f0 > 145) return []
    return [
      {
        axis: 'vertical',
        x: f0,
        position: 'top',
        label: `X_L = X_C (${f0.toFixed(1)} Hz)`,
        color: CHART_COLORS.reference,
      },
    ]
  }, [f0])

  const reactanceSeries = useMemo((): RelationDataSeries[] => {
    const base: RelationDataSeries[] = [
      {
        points: xcCurvePoints,
        label: '容抗 X_C = 1/(2πfC)',
        color: EM_COLORS.capacitor,
      },
    ]
    if (compareCurves?.xlCurve && compareCurves?.xcCurve) {
      base.push(
        {
          points: compareCurves.xlCurve,
          label: '对照 X_L',
          color: withAlpha(EM_COLORS.inductor, 0.5),
          strokeDasharray: [3, 3],
          strokeWidth: 1.5,
        },
        {
          points: compareCurves.xcCurve,
          label: '对照 X_C',
          color: withAlpha(EM_COLORS.capacitor, 0.5),
          strokeDasharray: [3, 3],
          strokeWidth: 1.5,
        },
      )
    }
    return base
  }, [xcCurvePoints, compareCurves])

  // ── 4. 模式 1：实时 i–t 示波器 ─────────────────────────────────────────
  const oscSeries = useMemo((): RelationDataSeries[] => {
    const targetColor = compareTarget === 0 ? EM_COLORS.capacitor : EM_COLORS.inductor
    const base: RelationDataSeries[] = [
      {
        points: oscWave.i1Full,
        color: EM_COLORS.resistance,
        strokeDasharray: [3, 3],
        strokeWidth: 1.2,
      },
      {
        points: oscWave.i2Full,
        color: targetColor,
        strokeDasharray: [3, 3],
        strokeWidth: 1.2,
      },
      {
        points: oscWave.i1Revealed,
        label: '对照支路 i₁(t)',
        color: EM_COLORS.resistance,
        strokeWidth: 2,
      },
    ]
    if (compareCurves?.i2Full) {
      base.push({
        points: compareCurves.i2Full,
        label: '参考线 i₂(t)',
        color: withAlpha(targetColor, 0.5),
        strokeDasharray: [4, 3],
        strokeWidth: 1.6,
      })
    }
    return base
  }, [compareTarget, oscWave.i1Full, oscWave.i2Full, oscWave.i1Revealed, compareCurves])

  if (mode === 2) {
    return (
      <Card className="w-full h-full min-h-0 p-2 flex flex-col">
        <RelationChart
          title={filterTitle}
          points={filterWave.outputWave}
          mainLabel="负载 R 输出"
          color={EM_COLORS.electricCurrent}
          additionalSeries={filterSeries}
          xLabel="时间 t (ms)"
          yLabel="相对信号"
          xDomain={[0, 40]}
          yDomain={[-0.5, 1.5]}
          showZeroLine
          showGrid
        />
      </Card>
    )
  }

  if (mode === 1) {
    const targetColor = compareTarget === 0 ? EM_COLORS.capacitor : EM_COLORS.inductor
    const targetLabel = compareTarget === 0 ? '电容支路 i₂(t)' : '电感支路 i₂(t)'
    const oscTitle = isDC
      ? compareTarget === 0
        ? '直流接通瞬间：电容充电脉冲与断路过程 i(t)'
        : '直流接通瞬间：自感阻滞电流爬升过程 i(t)'
      : compareTarget === 0
        ? '正弦交流示波：电容支路与电阻支路电流波形 i(t)'
        : '正弦交流示波：电感支路与电阻支路电流波形 i(t)'

    const oscCursorLabel = (tVal: number) => {
      const i1 = physics.transient?.i1 ?? 0
      const i2 = physics.transient?.i2 ?? 0
      return `t=${tVal.toFixed(2)}s | i₁=${i1.toFixed(2)}A | i₂=${i2.toFixed(2)}A`
    }

    return (
      <Card className="w-full h-full min-h-0 p-2 flex flex-col">
        <RelationChart
          title={oscTitle}
          points={oscWave.i2Revealed}
          mainLabel={targetLabel}
          color={targetColor}
          additionalSeries={oscSeries}
          xLabel="时间 t (s)"
          yLabel="电流 i (A)"
          xDomain={[0, TRANSIENT_DURATION]}
          yDomain={isDC ? [0, fixedOscYMax] : [-fixedOscYMax, fixedOscYMax]}
          cursorX={Math.min(TRANSIENT_DURATION, Math.max(0, time))}
          cursorLabel={oscCursorLabel}
          onScrubX={scrub ? (physT) => scrub.scrubToTime(physT) : undefined}
          showZeroLine
          showGrid
        />
      </Card>
    )
  }

  // 模式 0：扫频演示（点击或拖拽曲线任意频率，反向联动动画时间与三灯亮度）
  if (chartType === 0) {
    const currentCursorLabel = (x: number) => {
      const bR = physics.branches[0]?.current ?? 0
      const bL = physics.branches[1]?.current ?? 0
      const bC = physics.branches[2]?.current ?? 0
      return `f=${x.toFixed(0)}Hz | I_R=${bR.toFixed(2)}A | I_L=${bL.toFixed(2)}A | I_C=${bC.toFixed(2)}A`
    }

    return (
      <Card className="w-full h-full min-h-0 p-2 flex flex-col">
        <RelationChart
          title="扫频电流特性：拖动曲线或播放，对比三支路电流 I–f"
          points={iLCurvePoints}
          mainLabel="电感支路 I_L"
          color={EM_COLORS.inductor}
          additionalSeries={sweepCurrentSeries}
          xLabel="交流频率 f (Hz)"
          yLabel="电流 I (A)"
          xDomain={[SWEEP_F_MIN, SWEEP_F_MAX]}
          yDomain={[0, fixedCurrentYMax]}
          cursorX={frequency}
          cursorLabel={currentCursorLabel}
          onScrubX={scrub ? (physF) => scrub.scrubToTime(sweepTimeForFrequency(physF)) : undefined}
          showZeroLine
          showGrid
        />
      </Card>
    )
  }

  const reactanceCursorLabel = (x: number) =>
    `f=${x.toFixed(0)}Hz | X_L=${XL.toFixed(1)}Ω | X_C=${Number.isFinite(XC) ? XC.toFixed(1) + 'Ω' : '∞'}`

  return (
    <Card className="w-full h-full min-h-0 p-2 flex flex-col">
      <RelationChart
        title="扫频电抗特性：感抗 X_L 与容抗 X_C 随频率 f 变化曲线"
        points={xlCurvePoints}
        mainLabel="感抗 X_L = 2πfL"
        color={EM_COLORS.inductor}
        additionalSeries={reactanceSeries}
        xLabel="交流频率 f (Hz)"
        yLabel="电抗 X (Ω)"
        xDomain={[SWEEP_F_MIN, SWEEP_F_MAX]}
        yDomain={[0, 500]}
        cursorX={frequency}
        cursorLabel={reactanceCursorLabel}
        markers={reactanceMarkers}
        onScrubX={scrub ? (physF) => scrub.scrubToTime(sweepTimeForFrequency(physF)) : undefined}
        showZeroLine
        showGrid
      />
    </Card>
  )
}
