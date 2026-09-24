import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSensorPhysics } from './hooks/useSensorPhysics'
import { SensorScene } from './components/SensorScene'

export default function SensorAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const sensorType = params.sensorType ?? 0
  const illuminance = params.illuminance ?? 100
  const temperature = params.temperature ?? 25
  const magneticB = params.magneticB ?? 1.0
  const currentI = params.currentI ?? 0.8
  const carrierType = params.carrierType ?? 0
  const rFixed = params.rFixed ?? 5000
  const vThreshold = params.vThreshold ?? 2.5

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

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

  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'viewport',
    physicsWidth: 10,
    physicsHeight: 4,
    refMagnitudes: {
      velocity: 1.0,
      force: 2.0,
      currentDirection: 2.0,
    },
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <SensorScene
        physics={physics}
        canvasSize={canvasSize}
        sceneScale={sceneScale}
        vp={vp}
        time={time}
      />
    </AnimationSvgCanvas>
  )
}
