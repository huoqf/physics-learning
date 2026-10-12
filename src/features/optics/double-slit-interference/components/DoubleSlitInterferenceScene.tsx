import React from 'react'
import type { DoubleSlitInterferencePhysicsResult } from '../hooks/useDoubleSlitInterferencePhysics'
import type { CanvasPreset } from '@/hooks/useAnimationViewport'

import { DoubleSlitApparatusTrack } from './DoubleSlitApparatusTrack'
import { DoubleSlitEyepieceScene } from './DoubleSlitEyepieceScene'
import { DoubleSlitTheoryScene } from './DoubleSlitTheoryScene'

interface DoubleSlitInterferenceSceneProps {
  physics: DoubleSlitInterferencePhysicsResult
  canvasSize: {
    font: (size: number) => number
    width: number
    height: number
  }
  preset: CanvasPreset
  wavelength: number
  slitDistance: number
  screenDistance: number
  time: number
  mode?: number
}

/**
 * 光的双缝干涉场景分发组件：
 * - mode === 1: 高考实验装配与测微目镜读数场景
 * - mode === 0: 理论演示相干波前与光强分布场景
 */
export const DoubleSlitInterferenceScene: React.FC<DoubleSlitInterferenceSceneProps> = (props) => {
  const { physics, canvasSize, wavelength, slitDistance, screenDistance, mode = 0 } = props
  const { font } = canvasSize
  const { wavelengthColor } = physics

  if (mode === 1) {
    return (
      <g className="double-slit-experiment-container">
        <DoubleSlitApparatusTrack
          wavelengthColor={wavelengthColor}
          wavelength={wavelength}
          slitDistance={slitDistance}
          screenDistance={screenDistance}
          font={font}
        />
        <DoubleSlitEyepieceScene
          physics={physics}
          wavelength={wavelength}
          font={font}
        />
      </g>
    )
  }

  return <DoubleSlitTheoryScene {...props} />
}