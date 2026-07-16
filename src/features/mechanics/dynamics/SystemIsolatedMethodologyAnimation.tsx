import { useRef } from 'react'
import { worldToDesign } from '@/scene'
import { AnimationSvgCanvas } from '@/components/Layout'
import { PhysicsGround, VectorDefs } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useSystemIsolatedPhysics } from './hooks/useSystemIsolatedPhysics'
import { Model0ConnectedBodies } from './components/Model0ConnectedBodies'
import { Model1InclineEquilibrium } from './components/Model1InclineEquilibrium'
import { Model2InclineSliding } from './components/Model2InclineSliding'

export default function SystemIsolatedMethodologyAnimation() {
  const p = useSystemIsolatedPhysics()
  const svgRef = useRef<SVGSVGElement>(null)

  const {
    vp,
    canvasSize,
    sceneScale,
    modelType,
    analysisView,
    activeObject,
    m1,
    m2,
    F,
    theta,
    time,
    g,
    thetaRad,
    groundY,
    model0,
    model1,
    model2,
  } = p

  const groundY_design = worldToDesign(0, groundY, sceneScale).py
  const isSystemView = analysisView === 0
  const isIsolatedView = analysisView === 1
  const font = canvasSize.font

  return (
    <div className="w-full h-full relative select-none">
      <AnimationSvgCanvas
        containerRef={p.containerRef}
        transform={vp.transform}
        svgRef={svgRef}
      >
        <PhysicsGround
          x={vp.designLeft}
          y={groundY_design}
          width={vp.designVisibleW}
          type="ground"
          appearance={{
            showHatch: true,
            color: PHYSICS_COLORS.labelText,
          }}
        />

        {modelType === 0 && (
          <Model0ConnectedBodies
            sceneScale={sceneScale}
            groundY={groundY}
            isSystemView={isSystemView}
            isIsolatedView={isIsolatedView}
            activeObject={activeObject}
            m1={m1}
            m2={m2}
            F={F}
            g={g}
            model0={model0}
            font={font}
          />
        )}

        {modelType === 1 && (
          <Model1InclineEquilibrium
            sceneScale={sceneScale}
            groundY={groundY}
            isSystemView={isSystemView}
            isIsolatedView={isIsolatedView}
            activeObject={activeObject}
            m1={m1}
            m2={m2}
            F={F}
            theta={theta}
            thetaRad={thetaRad}
            g={g}
            model1={model1}
            font={font}
          />
        )}

        {modelType === 2 && (
          <Model2InclineSliding
            sceneScale={sceneScale}
            groundY={groundY}
            isSystemView={isSystemView}
            isIsolatedView={isIsolatedView}
            activeObject={activeObject}
            m1={m1}
            m2={m2}
            theta={theta}
            thetaRad={thetaRad}
            g={g}
            time={time}
            model2={model2}
            font={font}
          />
        )}

        <defs>
          <VectorDefs colors={[
            PHYSICS_COLORS.appliedForce,
            PHYSICS_COLORS.gravity,
            PHYSICS_COLORS.normalForce,
            PHYSICS_COLORS.friction,
            PHYSICS_COLORS.tension,
            PHYSICS_COLORS.acceleration,
            '#f43f5e'
          ]} />
        </defs>
      </AnimationSvgCanvas>
    </div>
  )
}
