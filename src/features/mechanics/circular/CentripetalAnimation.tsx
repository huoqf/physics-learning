import { useCentripetalPhysics } from './hooks/useCentripetalPhysics'
import { CentripetalScene } from './components/CentripetalScene'

export default function CentripetalAnimation() {
  const physics = useCentripetalPhysics()
  const { containerRef, canvasSize, vp } = physics

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
      </svg>
    </div>
  )
}
