import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS } from '@/theme/physics'
import { RelationChart } from '@/components/Chart'
import { useCentripetalPhysics } from './hooks/useCentripetalPhysics'
import { CENTRIPETAL_CHART_RANGE } from './hooks/useCentripetalPhysics'
import { CentripetalScene } from './components/CentripetalScene'

export default function CentripetalAnimation() {
  const DESIGN = CANVAS_PRESETS.square
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: DESIGN })
  const physics = useCentripetalPhysics(vp, containerRef)

  return (
    <div
      ref={containerRef}
      data-viewport
      className="w-full h-full relative bg-white rounded-lg shadow-inner"
      onMouseMove={physics.handleContainerMouseMove}
      onMouseUp={physics.handleContainerMouseUp}
      onMouseLeave={physics.handleContainerMouseUp}
    >
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <CentripetalScene physics={physics} font={canvasSize.font} />
      </AnimationSvgCanvas>
      {physics.showFaCard && (
        <div
          className="absolute cursor-ew-resize"
          style={{
            right: DESIGN.width - physics.cardX - physics.cardWidth,
            top: physics.cardY,
            width: physics.cardWidth,
            height: physics.cardHeight,
          }}
          onMouseDown={physics.handleChartMouseDown}
        >
          <RelationChart
            points={physics.faPoints}
            xDomain={[0, CENTRIPETAL_CHART_RANGE.aMax]}
            yDomain={[0, CENTRIPETAL_CHART_RANGE.fMax]}
            xLabel="a (m/s²)"
            yLabel="F (N)"
            title={`动力学联动 (F_c = m · a_c)  m=${physics.params.m.toFixed(1)}kg`}
            color={PHYSICS_COLORS.appliedForce}
            strokeWidth={1.5}
            cursorX={physics.a_c}
            cursorLabel={(_x, f) => `F=${f.toFixed(1)}N`}
            markers={[]}
          />
        </div>
      )}
    </div>
  )
}
