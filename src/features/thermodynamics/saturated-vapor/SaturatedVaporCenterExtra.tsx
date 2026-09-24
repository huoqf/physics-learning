import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve } from '@/components/Chart/CharacteristicCurve'
import {
  calculateSaturatedVaporPressure,
  calculateRelativeHumidity,
} from '@/physics/thermodynamics/saturatedVapor'

export default function SaturatedVaporCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const tempCelsius = params.tempCelsius ?? 25
  const vaporPressure = params.vaporPressure ?? 1580

  const humidity = useMemo(() => {
    return calculateRelativeHumidity(vaporPressure, tempCelsius)
  }, [vaporPressure, tempCelsius])

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

  const currentP_kPa = +(vaporPressure / 1000).toFixed(2)

  const thresholds = useMemo(() => {
    return [
      {
        y: currentP_kPa,
        label: `实际分压 p=${currentP_kPa} kPa (RH=${humidity.rh}%)`,
        color: '#3B82F6',
        dasharray: '3 3',
      },
    ]
  }, [currentP_kPa, humidity.rh])

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
