import { useMemo } from 'react'
import { MiniChart } from '@/components/UI'
import { PHYSICS_COLORS } from '@/theme/physics'

export default function BrownianForceNetChart({
  temperature,
  particleD,
  time,
}: {
  temperature: number
  particleD: number
  time: number
}) {
  // 生成最近 80 帧 (约 4 秒历史) 的确定性受力涨落序列
  const { points, currentVals, xMin, xMax, fNetMax } = useMemo(() => {
    const dt = 0.05
    const steps = 80
    const xMinVal = Math.max(0, time - steps * dt)
    const xMaxVal = Math.max(steps * dt, time)

    // 基于时间确定性伪随机函数，保证暂停、重置、快进完全同步
    const forcePoints: Record<string, number>[] = []
    
    // 不平衡合力振幅随温度升高而增大，随直径增大而减小 (质量大、抵消多)
    const amp = 4.0 * Math.sqrt(temperature / 300) / (0.8 + particleD * 0.15)

    for (let i = 0; i <= steps; i++) {
      const t = xMinVal + i * dt
      // 用多个不同频率的正弦波和余弦波叠加模拟高频热撞击的白噪声
      const w1 = Math.sin(t * 45) * Math.cos(t * 17)
      const w2 = Math.sin(t * 95) * 0.4
      const w3 = Math.cos(t * 150) * 0.2
      const noise = Math.abs(w1 + w2 + w3)
      
      const fVal = Math.max(0.05, noise * amp)
      forcePoints.push({ t, fMag: fVal })
    }

    const currentF = forcePoints[forcePoints.length - 1]?.fMag ?? 0.1

    return {
      points: forcePoints,
      currentVals: { fMag: currentF },
      xMin: xMinVal,
      xMax: xMaxVal,
      fNetMax: amp * 1.6, // 动态 Y 轴上限
    }
  }, [temperature, particleD, time])

  const chartLines = useMemo(
    () => [
      { key: 'fMag', color: PHYSICS_COLORS.forceNet, strokeWidth: 1.6, name: '瞬间合力', showValueInLegend: true },
    ],
    []
  )

  return (
    <div className="w-full">
      <MiniChart
        title="瞬间碰撞合力涨落监测 F_合 - t"
        xMin={xMin}
        xMax={xMax}
        yMin={0}
        yMax={Math.max(1.5, fNetMax)}
        points={points}
        lines={chartLines}
        xKey="t"
        xLabel="时间 t (s)"
        yLabel="合力 F (N)"
        currentVals={currentVals}
        currentXVal={time}
        minWidth={360}
        minHeight={250}
      />
    </div>
  )
}
