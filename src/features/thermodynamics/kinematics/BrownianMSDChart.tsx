import { useMemo } from 'react'
import { MiniChart } from '@/components/UI'
import type { MiniChartLine } from '@/components/UI'
import { PHYSICS_COLORS } from '@/theme/physics'
import { BOLTZMANN_CONSTANT } from '@/physics'

/**
 * 爱因斯坦布朗运动扩散理论：均方位移 MSD (Mean Squared Displacement)
 * ⟨Δr²⟩ = 4 D t, 其中扩散系数 D = k_B T / (3 π η d)
 * 直观呈现：温度越高、微粒直径越小，扩散斜率越陡峭。
 */
export default function BrownianMSDChart({
  temperature,
  particleD,
  time,
}: {
  temperature: number
  particleD: number
  time: number
}) {
  const { points, currentVals, tMax, msdMax } = useMemo(() => {
    const steps = 60
    const duration = Math.max(10, Math.ceil(time / 10) * 10)
    const dt = duration / steps

    // 爱因斯坦-斯托克斯理论扩散系数 D = kB * T / (3 * π * η * d)
    const eta = 1.0e-3 // 水的动力黏度 1.0 mPa·s
    const dMeter = particleD * 1e-6
    const D = (BOLTZMANN_CONSTANT * temperature) / (3 * Math.PI * eta * dMeter) // m²/s
    const D_um2 = D * 1e12 // 换算为 μm²/s

    // 二维布朗运动理论均方位移斜率：⟨Δr²⟩ = 4 D t
    const diffusionSlope = 4 * D_um2

    const pts: Record<string, number>[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i * dt
      const msdTheory = diffusionSlope * t
      pts.push({ t, msd: msdTheory })
    }

    const currentMsd = diffusionSlope * (time % duration)

    return {
      points: pts,
      currentVals: { msd: currentMsd },
      tMax: duration,
      msdMax: Math.max(1, diffusionSlope * duration * 1.15),
    }
  }, [temperature, particleD, time])

  const chartLines: MiniChartLine[] = useMemo(
    () => [
      {
        key: 'msd',
        color: PHYSICS_COLORS.velocity,
        strokeWidth: 2,
        name: '均方位移 ⟨Δr²⟩',
        showValueInLegend: true,
      },
    ],
    [],
  )

  return (
    <div className="w-full">
      <MiniChart
        title="爱因斯坦扩散关系 ⟨Δr²⟩ = 4Dt (D ∝ T/d)"
        xMin={0}
        xMax={tMax}
        yMin={0}
        yMax={Math.max(10, msdMax)}
        points={points}
        lines={chartLines}
        xKey="t"
        xLabel="时间 t (s)"
        yLabel="均方位移 (μm²)"
        currentVals={currentVals}
        currentXVal={time % tMax}
        minWidth={360}
        minHeight={150}
      />
    </div>
  )
}
