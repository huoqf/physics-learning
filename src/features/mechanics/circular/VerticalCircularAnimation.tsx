import { useVerticalCircularPhysics } from './hooks/useVerticalCircularPhysics'
import { VerticalCircularScene } from './components/VerticalCircularScene'
import { ForceDecompositionCard } from './components/ForceDecompositionCard'

export default function VerticalCircularAnimation() {
  const physics = useVerticalCircularPhysics()
  const { containerRef, canvasSize, vp, currentPoint, cardWidth, cardHeight, cardX, cardY, params } = physics

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
          <VerticalCircularScene physics={physics} />
        </g>
        {currentPoint && (
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
