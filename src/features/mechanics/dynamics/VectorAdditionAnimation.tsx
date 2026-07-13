import { VectorDefs } from '@/components/Physics'
import { useRef } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { computeScale } from '@/utils/coordinate'
import { useVectorAdditionPhysics } from './useVectorAdditionPhysics'
import { useVectorDrag } from './useVectorDrag'
import { VectorGrid } from './VectorGrid'
import { VectorAngleArc } from './VectorAngleArc'
import { VectorDecomposition } from './VectorDecomposition'
import { VectorParallelogram } from './VectorParallelogram'
import { VectorTriangle } from './VectorTriangle'
import { AnimationSvgCanvas } from '@/components/Layout'

export default function VectorAdditionAnimation() {
  const { params, showVectors, showGrid, isPlaying, time, updateParam } = useAnimationStore(
    useShallow((s) => ({
      params: s.params, showVectors: s.showVectors,
      showGrid: s.showGrid, isPlaying: s.isPlaying, time: s.time, updateParam: s.updateParam,
    }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const f1 = params.f1 ?? 10
  const f2 = params.f2 ?? 8
  const angle = params.angle ?? 60
  const phi = params.phi ?? 0
  const mode = params.mode ?? 0

  const WORLD = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 } as const
  const scale = computeScale(vp.visibleW, vp.visibleH, WORLD) * 0.6

  const vaSceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: preset.width, physicsHeight: preset.height })

  const physicsData = useVectorAdditionPhysics({
    f1, f2, angle, phi, mode, canvasWidth: vp.visibleW, canvasHeight: vp.visibleH, scale, time, isPlaying,
  })

  const { handleDragStart, handleDragMove } = useVectorDrag({ svgRef, visibleW: vp.visibleW, visibleH: vp.visibleH, scale, phi, mode, updateParam })

  const centerX = vp.visibleW / 2
  const centerY = vp.visibleH / 2

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      svgRef={svgRef}
      onPointerMove={(e) => handleDragMove(e.clientX, e.clientY)}
    >
      <VectorGrid centerX={centerX} centerY={centerY} scale={scale}
        visibleW={vp.visibleW} visibleH={vp.visibleH} showGrid={showGrid} />

      <line x1={20} y1={centerY} x2={vp.visibleW - 20} y2={centerY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axisBold} />
      <line x1={centerX} y1={20} x2={centerX} y2={vp.visibleH - 20}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axisBold} />

      <circle cx={centerX} cy={centerY} r={CANVAS_STYLE.object.pointMassRadius}
        fill={PHYSICS_COLORS.labelText} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
      <circle cx={centerX} cy={centerY} r={12} fill="none"
        stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="2,2" />

      {showVectors && (
        <g>
          {mode === 2 && <VectorDecomposition physicsData={physicsData} sceneScale={vaSceneScale} onDragStart={handleDragStart} />}
          {mode === 0 && <VectorParallelogram physicsData={physicsData} sceneScale={vaSceneScale} onDragStart={handleDragStart} />}
          {mode === 1 && <VectorTriangle physicsData={physicsData} sceneScale={vaSceneScale} isPlaying={isPlaying} onDragStart={handleDragStart} />}
        </g>
      )}

      <VectorAngleArc physicsData={physicsData} angle={angle} mode={mode} font={font} />

      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.forceNet, PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.tension, PHYSICS_COLORS.forceComponent]} />
      </defs>
    </AnimationSvgCanvas>
  )
}
