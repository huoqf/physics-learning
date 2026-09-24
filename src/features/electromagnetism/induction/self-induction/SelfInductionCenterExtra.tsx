import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CharacteristicCurve } from '@/components/Chart'
import { useSelfInductionPhysics } from './hooks/useSelfInductionPhysics'

export default function SelfInductionCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const mode = params.mode ?? 0
  const E = params.E ?? 12
  const L = params.L ?? 2.0
  const RL = params.RL ?? 2.0
  const RA = params.RA ?? 6.0
  const B = params.B ?? 1.5
  const isSlotted = params.isSlotted ?? 0
  const switchState = params.switchState ?? 1

  const physics = useSelfInductionPhysics({
    mode,
    E,
    L,
    RL,
    RA,
    B,
    isSlotted,
    switchState,
    time,
  })

  if (mode === 2) {
    // Mode 2: 摆角衰减时序图
    return (
      <div className="w-full h-full p-2 bg-white rounded-lg flex flex-col">
        <CharacteristicCurve
          title="电磁阻尼振荡图像 θ - t"
          points={physics.chartSeries1}
          currentX={time}
          xLabel="时间 t / s"
          yLabel="摆角 θ / rad"
          xDomain={[0, physics.tMax]}
          yDomain={[-0.5, 0.5]}
          series="primary"
        />
      </div>
    )
  }

  // Mode 0 / Mode 1: 电流响应曲线
  return (
    <div className="w-full h-full p-2 bg-white rounded-lg flex flex-col">
      <CharacteristicCurve
        title={mode === 0 ? '通电自感电流响应 I - t 对比' : '断电自感局部回路放电电流 I - t'}
        points={physics.chartSeries1}
        currentX={time}
        xLabel="时间 t / s"
        yLabel="支路电流 I / A"
        xDomain={[0, physics.tMax]}
        additionalSeries={
          mode === 0
            ? [
                {
                  points: physics.chartSeries2,
                  label: '电感支路 IL',
                  series: 'secondary',
                },
              ]
            : undefined
        }
        thresholds={
          mode === 1
            ? [
                {
                  y: E / RA,
                  label: '断开前灯泡正常电流 IA',
                  color: '#94a3b8',
                },
              ]
            : undefined
        }
      />
    </div>
  )
}
