import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  calculateSandboxState,
  calculateCycleState,
  calculatePistonY,
  calculateForceVector,
  temperatureToSpeedScale,
} from '@/physics/firstLaw'
import { useFirstLawPhysics } from './hooks/useFirstLawPhysics'
import { FirstLawScene } from './components/FirstLawScene'

export default function FirstLawAnimation() {
  const { params, isPlaying, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
    })),
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })
  const { font } = canvasSize

  const visibleWidth = vp.visibleW / vp.scale
  const visibleHeight = vp.visibleH / vp.scale
  const visibleX = (vp.visibleX - vp.tx) / vp.scale
  const visibleY = (vp.visibleY - vp.ty) / vp.scale

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'viewport',
    physicsWidth: 3.0,
    physicsHeight: 6.0,
    originSource: 'custom',
    originX: visibleX + visibleWidth / 2,
    originY: visibleY + visibleHeight,
  })

  const mode = params.mode ?? 0
  const W_input = params.W ?? 0
  const Q_input = params.Q ?? 0
  const adiabatic = params.adiabatic ?? 0

  const state = mode === 1
    ? calculateCycleState(time)
    : calculateSandboxState(W_input, Q_input, adiabatic === 1)

  const { V, T, W, Q, deltaU, currentStepIndex } = state

  const pistonY = calculatePistonY(mode, V, W_input)
  const speedScale = temperatureToSpeedScale(T)
  const { isWorkApplied, forceVector, forceOrigin } = calculateForceVector(W, pistonY)

  const { particlesRef, heatParticlesRef } = useFirstLawPhysics({
    pistonY,
    speedScale,
    Q,
    isPlaying,
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <FirstLawScene
          mode={mode}
          T={T}
          W={W}
          Q={Q}
          deltaU={deltaU}
          pistonY={pistonY}
          adiabatic={adiabatic}
          isWorkApplied={isWorkApplied}
          forceVector={forceVector}
          forceOrigin={forceOrigin}
          currentStepIndex={currentStepIndex}
          sceneScale={sceneScale}
          font={font}
          particlesRef={particlesRef}
          heatParticlesRef={heatParticlesRef}
        />
      </AnimationSvgCanvas>
    </div>
  )
}
