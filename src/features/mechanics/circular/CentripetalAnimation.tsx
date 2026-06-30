import { useCentripetalPhysics } from './hooks/useCentripetalPhysics'
import { CentripetalScene } from './components/CentripetalScene'
import { ForceDecompositionCard } from './components/ForceDecompositionCard'

export default function CentripetalAnimation() {
  const physics = useCentripetalPhysics()
  const { containerRef, canvasSize, vp, isAdvanced, currentPoint, cardWidth, cardHeight, cardX, cardY, params } = physics

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner"
        onMouseMove={physics.handleSvgMouseMove}
        onMouseUp={physics.handleSvgMouseUp}
        onMouseLeave={physics.handleSvgMouseUp}
      >
        <g transform={vp.transform}>
          <CentripetalScene physics={physics} />
        </g>
        {isAdvanced && currentPoint && (
          <ForceDecompositionCard
            currentPoint={currentPoint}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardX={cardX}
            cardY={cardY}
            m={params.m}
            r={params.r}
            v0={params.v0}
            trackType={params.trackType}
            canvasSize={canvasSize}
          />
        )}
      </svg>
    </div>
  )
}
