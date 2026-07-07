import { useMemo } from 'react'
import { RelationChart } from '@/components/Chart/RelationChart'
import { generateIUCurve } from '@/physics/photoelectric'
import { CHART_COLORS } from '@/theme/physics'

interface IUCurveChartProps {
  Uc: number
  Imax: number
  currentVoltage: number
  isPE: boolean
}

export default function IUCurveChart({
  Uc,
  Imax,
  currentVoltage,
  isPE,
}: IUCurveChartProps) {
  // 生成 I-U 曲线点阵
  const points = useMemo(
    () => generateIUCurve(Uc, Imax, -5.0, 3.0, 80),
    [Uc, Imax],
  )

  // 遏止电压标记
  const markers = useMemo(() => {
    if (!isPE || Uc <= 0) return []
    return [
      {
        axis: 'vertical' as const,
        x: -Uc,
        label: `Uc = ${Uc.toFixed(2)} V`,
        color: CHART_COLORS.criticalPt,
      },
    ]
  }, [isPE, Uc])

  // 饱和电流标记
  const saturationMarkers = useMemo(() => {
    if (!isPE || Imax <= 0) return []
    return [
      {
        axis: 'horizontal' as const,
        y: Imax,
        label: `Im = ${Imax.toFixed(1)} μA`,
        color: CHART_COLORS.reference,
      },
    ]
  }, [isPE, Imax])

  const allMarkers = [...markers, ...saturationMarkers]

  return (
    <RelationChart
      title="光电流 I 与极板电压 U 特性曲线"
      points={points}
      xLabel="极板电压 U (V)"
      yLabel="光电流 I (μA)"
      xDomain={[-5.0, 3.0]}
      yDomain={[0, Math.max(Imax * 1.2, 5)]}
      cursorX={currentVoltage}
      markers={allMarkers}
      series="primary"
      showZeroLine
      showGrid
      variant="standard"
      className="w-full h-full"
    />
  )
}
