import React from 'react'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import { useInclineForceLayout } from '../hooks/useInclineForceLayout'
import { InclineSlopeBackground } from './InclineSlopeBackground'
import { OrthogonalDecompositionOverlay } from './OrthogonalDecompositionOverlay'
import { InclineForceVectors } from './InclineForceVectors'

interface InclineForceDiagramProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
  showForceComponents: boolean
  bFieldDir?: number
  font?: (size: number) => number
}

export const InclineForceDiagram: React.FC<InclineForceDiagramProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  theta,
  showForceComponents,
  bFieldDir = 0,
  font = (s) => s,
}) => {
  const layout = useInclineForceLayout({
    w,
    h,
    physicsResult,
    theta,
  })

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 侧视图底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill="none"
        stroke="none"
      />

      <InclineSlopeBackground
        w={w}
        h={h}
        x0={layout.x0}
        y0={layout.y0}
        rightX={layout.rightX}
        topY={layout.topY}
        slopeW={layout.slopeW}
        slopeH={layout.slopeH}
        padX={layout.padX}
        B={B}
        bFieldDir={bFieldDir}
        theta={theta}
        thetaRad={layout.thetaRad}
        physicsResult={physicsResult}
        signAxisStart={layout.signAxisStart}
        signAxisEnd={layout.signAxisEnd}
        signAxisAngleDeg={layout.signAxisAngleDeg}
        font={font}
      />

      <OrthogonalDecompositionOverlay
        px={layout.px}
        py={layout.py}
        thetaRad={layout.thetaRad}
        showForceComponents={showForceComponents}
        G_projection={layout.G_projection}
        Fa_projection={layout.Fa_projection}
        font={font}
      />

      <InclineForceVectors
        px={layout.px}
        py={layout.py}
        I={I}
        G_phys={layout.G_phys}
        N_phys={layout.N_phys}
        Fa_phys={layout.Fa_phys}
        f_phys={layout.f_phys}
        localScale={layout.localScale}
        physicsResult={physicsResult}
        forceScale={layout.forceScale}
        G_mag={layout.G_mag}
        thetaRad={layout.thetaRad}
        font={font}
      />
    </g>
  )
}

export default InclineForceDiagram
