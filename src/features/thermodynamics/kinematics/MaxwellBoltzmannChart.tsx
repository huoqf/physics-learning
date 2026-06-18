import { useMemo } from 'react'
import { MiniChart } from '@/components/UI'
import type { MiniChartLine, MiniChartStaticLine } from '@/components/UI/MiniChart'
import { generateMBCurve, averageSpeed } from '@/physics/brownianMotion'
import { THERMO_COLORS } from '@/theme/physics'

const CHART_LINES: MiniChartLine[] = [
  { key: 'fv', color: THERMO_COLORS.heatAbsorb, strokeWidth: 2, name: 'f(v)' },
]

export default function MaxwellBoltzmannChart({
  temperature,
  particleD,
}: {
  temperature: number
  particleD: number
}) {
  const dMeters = particleD * 1e-6

  const { points, vMax, fvMax, vAvg } = useMemo(() => {
    const curve = generateMBCurve(temperature, dMeters)
    const vMaxVal = curve[curve.length - 1]?.v ?? 1
    const fvMaxVal = Math.max(...curve.map((p) => p.fv), 1e-10)
    const vAvgVal = averageSpeed(temperature, dMeters)
    return { points: curve, vMax: vMaxVal, fvMax: fvMaxVal, vAvg: vAvgVal }
  }, [temperature, dMeters])

  const staticLines: MiniChartStaticLine[] = useMemo(
    () => [
      {
        value: vAvg,
        color: THERMO_COLORS.temperatureHigh,
        strokeDasharray: '4 2',
        name: `v_avg=${vAvg.toFixed(1)}m/s`,
      },
    ],
    [vAvg],
  )

  const currentVals = useMemo(() => ({ fv: 0 }), [])

  return (
    <div className="w-full">
      <MiniChart
        title="麦克斯韦-玻尔兹曼速率分布"
        xMin={0}
        xMax={vMax}
        yMin={0}
        yMax={fvMax * 1.1}
        points={points}
        lines={CHART_LINES}
        xKey="v"
        xLabel="速率 v (m/s)"
        yLabel="f(v)"
        currentVals={currentVals}
        currentXVal={0}
        staticLines={staticLines}
        minWidth={400}
        minHeight={160}
      />
    </div>
  )
}
