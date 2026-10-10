import { useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import { CHART_COLORS } from '@/theme/physics'

interface EkNuCurveChartProps {
  cutoffFreq: number
  currentFreq: number
  currentEkm: number
  W0: number
  isPE: boolean
}

export default function EkNuCurveChart({
  cutoffFreq,
  currentFreq,
  currentEkm,
  W0,
  isPE,
}: EkNuCurveChartProps) {
  // 生成 Ekm-ν 曲线点 (频率范围 3.0 ~ 9.0 x 10^14 Hz)
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const minF = 3.0
    const maxF = 9.0
    const steps = 60
    for (let i = 0; i <= steps; i++) {
      const f = minF + (maxF - minF) * (i / steps)
      // h = 4.1357 x 10^-15 eV·s. 当 f 为 10^14 Hz 时, h * 10^14 ≈ 0.4136 eV / (10^14 Hz)
      const slope = 0.41357
      const ek = Math.max(0, slope * (f - cutoffFreq))
      pts.push({ x: parseFloat(f.toFixed(2)), y: parseFloat(ek.toFixed(2)) })
    }
    return pts
  }, [cutoffFreq])

  // 极限频率标记
  const markers = useMemo(() => {
    return [
      {
        axis: 'vertical' as const,
        x: cutoffFreq,
        label: `截止频率 ν₀ = ${cutoffFreq.toFixed(2)} (W₀ = ${W0.toFixed(2)} eV)`,
        color: CHART_COLORS.criticalPt,
      },
      ...(isPE ? [{
        axis: 'horizontal' as const,
        y: currentEkm,
        label: `E_km = ${currentEkm.toFixed(2)} eV`,
        color: CHART_COLORS.primary,
      }] : []),
    ]
  }, [cutoffFreq, currentEkm, isPE, W0])

  return (
    <RelationChart
      title="光电子最大初动能 Ekm 与入射光频率 ν 关系线 (斜率即 h)"
      points={points}
      xLabel="入射光频率 ν (×10¹⁴ Hz)"
      yLabel="最大初动能 Ekm (eV)"
      xDomain={[3.0, 9.0]}
      yDomain={[0, 2.5]}
      cursorX={currentFreq}
      markers={markers}
      series="accent"
      showZeroLine
      showGrid
      variant="standard"
      className="w-full h-full"
    />
  )
}
