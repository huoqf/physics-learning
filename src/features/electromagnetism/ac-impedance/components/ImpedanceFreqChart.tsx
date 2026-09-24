import { useMemo } from 'react'
import { RelationChart, type RelationMarker } from '@/components/Chart'
import { CHART_COLORS } from '@/theme/physics'

interface ImpedanceFreqChartProps {
  frequency: number
  isDC: boolean
  XL: number
  XC: number
  f0: number
  xlCurvePoints: { x: number; y: number }[]
  xcCurvePoints: { x: number; y: number }[]
}

export function ImpedanceFreqChart({
  frequency,
  isDC,
  XL,
  XC,
  f0,
  xlCurvePoints,
  xcCurvePoints,
}: ImpedanceFreqChartProps) {
  // 辅助标记：谐振频率 f0 垂直参考线
  const markers = useMemo((): RelationMarker[] => {
    if (f0 <= 0 || f0 > 150) return []
    return [
      {
        axis: 'vertical',
        x: f0,
        label: `f₀ 谐振点 (${f0.toFixed(1)} Hz)`,
        color: CHART_COLORS.reference,
      },
    ]
  }, [f0])

  const additionalSeries = useMemo(
    () => [
      {
        points: xcCurvePoints,
        label: '容抗 X_C = 1/(2πfC)',
        series: 'secondary' as const,
      },
    ],
    [xcCurvePoints],
  )

  const cursorLabel = (x: number) => {
    if (isDC) return '直流 (f=0): X_L=0, X_C=∞'
    return `f=${x.toFixed(0)}Hz | X_L=${XL.toFixed(1)}Ω | X_C=${Number.isFinite(XC) ? XC.toFixed(1) + 'Ω' : '∞'}`
  }

  return (
    <div className="w-full h-full min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
      <RelationChart
        title="感抗 X_L 与容抗 X_C 随交流电频率 f 变化特性曲线"
        points={xlCurvePoints}
        additionalSeries={additionalSeries}
        xLabel="频率 f (Hz)"
        yLabel="电抗 X (Ω)"
        xDomain={[0, 150]}
        yDomain={[0, 450]}
        cursorX={isDC ? 0 : frequency}
        cursorLabel={cursorLabel}
        markers={markers}
        series="primary"
        showZeroLine
        showGrid
      />
    </div>
  )
}
