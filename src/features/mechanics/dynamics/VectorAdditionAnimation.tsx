import { VectorDefs } from '@/components/Physics'
import { useRef } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
// computeScale 已内联：根据画布尺寸和物理世界范围计算缩放比
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

  const scale = Math.min(preset.width / 20, preset.height / 20) * 0.6

  const vaSceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: preset.width, physicsHeight: preset.height })

  const physicsData = useVectorAdditionPhysics({
    f1, f2, angle, phi, mode, canvasWidth: preset.width, canvasHeight: preset.height, scale, time, isPlaying,
  })

  const { handleDragStart, handleDragMove } = useVectorDrag({ svgRef, vp, designW: preset.width, designH: preset.height, scale, phi, mode, updateParam })

  const centerX = preset.width / 2
  const centerY = preset.height / 2

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      svgRef={svgRef}
      onPointerMove={(e) => handleDragMove(e.clientX, e.clientY)}
    >
      <VectorGrid centerX={centerX} centerY={centerY} scale={scale}
        visibleW={preset.width} visibleH={preset.height} showGrid={showGrid} />

      <line x1={20} y1={centerY} x2={preset.width - 20} y2={centerY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axisBold} />
      <line x1={centerX} y1={20} x2={centerX} y2={preset.height - 20}
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
