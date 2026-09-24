import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve } from '@/components/Chart/CharacteristicCurve'
import { CHART_COLORS } from '@/theme/physics'
import {
  calculateSaturatedVaporPressure,
  calculateVaporPressureWithVolume,
} from '@/physics/thermodynamics/saturatedVapor'

export default function SaturatedVaporCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const tempCelsius = params.tempCelsius ?? 25
  const referencePressure = params.referencePressure ?? 1580
  const pistonVolume = params.pistonVolume ?? 1.0

  // 实际分压由等温 p-V 关系推导（未饱和按玻意耳定律，饱和后锁定在 ps）
  const state = useMemo(() => {
    return calculateVaporPressureWithVolume(referencePressure, pistonVolume, tempCelsius)
  }, [referencePressure, pistonVolume, tempCelsius])

  const curvePoints = useMemo(() => {
    const points: { x: number; y: number }[] = []
    for (let t = 0; t <= 60; t += 2) {
      points.push({
        x: t,
        y: +(calculateSaturatedVaporPressure(t) / 1000).toFixed(2),
      })
    }
    return points
  }, [])

  const currentP_kPa = +(state.p / 1000).toFixed(2)
  const rh = +(Math.min(100, (state.p / Math.max(1, state.ps)) * 100)).toFixed(1)

  const thresholds = useMemo(() => {
    return [
      {
        y: currentP_kPa,
        label: state.isSaturated
          ? `实际分压 p=${currentP_kPa} kPa = ps（饱和锁定）`
          : `实际分压 p=${currentP_kPa} kPa (RH=${rh}%)`,
        color: CHART_COLORS.primary,
        dasharray: '3 3',
      },
    ]
  }, [currentP_kPa, rh, state.isSaturated])

  return (
    <div className="w-full h-full flex flex-col p-2 bg-white rounded-xl shadow-sm border border-neutral-100 min-h-0">
      <div className="flex-1 min-h-0">
        <CharacteristicCurve
          points={curvePoints}
          title="水蒸气饱和汽压 - 温度特性曲线 (ps - T)"
          xLabel="温度 T / ℃"
          yLabel="饱和汽压 ps / kPa"
          xDomain={[0, 60]}
          currentX={tempCelsius}
          thresholds={thresholds}
          series="primary"
        />
      </div>
    </div>
  )
}
