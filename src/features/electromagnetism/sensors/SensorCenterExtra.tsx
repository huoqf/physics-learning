import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve } from '@/components/Chart'
import { CHART_COLORS } from '@/theme/physics'
import { useSensorPhysics } from './hooks/useSensorPhysics'

export default function SensorCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params }))
  )

  const sensorType = params.sensorType ?? 0
  const illuminance = params.illuminance ?? 100
  const temperature = params.temperature ?? 25
  const magneticB = params.magneticB ?? 1.0
  const currentI = params.currentI ?? 0.8
  const carrierType = params.carrierType ?? 0
  const rFixed = params.rFixed ?? 5000
  const vThreshold = params.vThreshold ?? 2.5

  const physics = useSensorPhysics({
    sensorType,
    illuminance,
    temperature,
    magneticB,
    currentI,
    carrierType,
    rFixed,
    vThreshold,
  })

  return (
    <div className="w-full h-full p-2 bg-white rounded-lg flex flex-col">
      <CharacteristicCurve
        title={`传感器输入-输出特性曲线 (${physics.xLabel} vs ${physics.yLabel})`}
        points={physics.curvePoints}
        currentX={physics.currentX}
        xLabel={physics.xLabel}
        yLabel={physics.yLabel}
        xDomain={physics.xDomain}
        yDomain={physics.yDomain}
        thresholds={
          physics.thresholdLineY != null
            ? [
                {
                  y: physics.thresholdLineY,
                  label: '动作触发阈值',
                  color: CHART_COLORS.criticalPt,
                },
              ]
            : undefined
        }
      />
    </div>
  )
}
