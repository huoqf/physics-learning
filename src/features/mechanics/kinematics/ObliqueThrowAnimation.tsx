import { PhysicsVectorArrow, VectorDefs, Ball, ParticleTrajectory } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import React, { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  STROKE,
  DASH,
} from '@/theme/physics'
import { VelocityTimeChart } from '@/components/Chart'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { worldToDesign } from '@/scene'

const OBLIQUE_PRESET = CANVAS_PRESETS.splitH

export default function ObliqueThrowAnimation() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const { v0 = 15, angle = 45, g = 9.8 } = params
  const angleRad = (angle * Math.PI) / 180

  // ── 1. 物理公式精确计算 ──────────────────────────────────
  const v0x = v0 * Math.cos(angleRad)
  const v0y = v0 * Math.sin(angleRad)
  const groundTime = g > 0 ? (2 * v0y) / g : 0
  const maxHeight = g > 0 ? (v0y * v0y) / (2 * g) : 0
  const range = v0x * groundTime
  const maxTime = Math.max(groundTime, 0.1)

  // 挂载标准的 splitH Viewport (420 x 650)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: OBLIQUE_PRESET,
  })
  const { font } = canvasSize

  // 设计坐标系参数 (420 x 650)
  const designOriginX = 50
  const designGroundY = 570
  const stageHeight = 480
  const stageWidth = OBLIQUE_PRESET.width - designOriginX - 30

  // 物理坐标转换用 sceneScale
  const obliqueSceneScale = useSceneScale({
    vp,
    preset: OBLIQUE_PRESET,
    anchor: 'custom',
    customOriginX: designOriginX,
    customOriginY: designGroundY, // 起点在地面 570px
    customScaleX: stageWidth / Math.max(range, 1),
    customScaleY: stageHeight / Math.max(maxHeight * 1.25, 1),
    refMagnitudes: { velocity: Math.max(v0, 10) },
  })

  const isLanded = time >= groundTime && groundTime > 0
  const activeT = isLanded ? groundTime : Math.max(time, 0)

  // 当前物理状态
  const currentPhys = useMemo(() => {
    const x = v0x * activeT
    const y = Math.max(0, v0y * activeT - 0.5 * g * activeT * activeT)
    const vx = v0x
    const vy = v0y - g * activeT
    return { x, y, vx, vy }
  }, [v0x, v0y, g, activeT])

  // 落地自动暂停
  useEffect(() => {
    if (isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isLanded, time, setIsPlaying])

  // 小球 Design 坐标
  const ballDesign = useMemo(() => {
    const pos = worldToDesign(currentPhys.x, currentPhys.y, obliqueSceneScale)
    return { cx: pos.px, cy: pos.py }
  }, [currentPhys.x, currentPhys.y, obliqueSceneScale])

  // 轨迹点计算
  const trajectoryPoints = useMemo(() => {
    const history: { x: number; y: number }[] = []
    const predicted: { x: number; y: number }[] = []
    const sampleCount = 60

    for (let i = 0; i <= sampleCount; i++) {
      const tSample = (i / sampleCount) * groundTime
      const px = v0x * tSample
      const py = v0y * tSample - 0.5 * g * tSample * tSample
      const pos = worldToDesign(px, Math.max(0, py), obliqueSceneScale)
      predicted.push({ x: pos.px, y: pos.py })
      if (tSample <= activeT + 1e-5) {
        history.push({ x: pos.px, y: pos.py })
      }
    }
    return { history, predicted }
  }, [v0x, v0y, g, groundTime, activeT, obliqueSceneScale])

  const tailPoints = useMemo(() => {
    return trajectoryPoints.history.slice(-8)
  }, [trajectoryPoints.history])

  // v-t 图表数据
  const vtChartData = useMemo(() => {
    const domainVx: { t: number; v: number }[] = []
    const domainVy: { t: number; v: number }[] = []
    const pointsVx: { t: number; v: number }[] = []
    const pointsVy: { t: number; v: number }[] = []

    const steps = 40
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * groundTime
      const vx = v0x
      const vy = v0y - g * t
      domainVx.push({ t, v: vx })
      domainVy.push({ t, v: vy })
      if (t <= activeT + 1e-5) {
        pointsVx.push({ t, v: vx })
        pointsVy.push({ t, v: vy })
      }
    }
    return { pointsVx, domainVx, pointsVy, domainVy }
  }, [v0x, v0y, g, groundTime, activeT])

  // 网格线
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    const gridCols = 8
    const gridRows = 10
    for (let i = 1; i < gridRows; i++) {
      const yPos = designGroundY - (i * stageHeight) / gridRows
      lines.push(
        <line
          key={`h-grid-${i}`}
          x1={designOriginX}
          y1={yPos}
          x2={OBLIQUE_PRESET.width - 15}
          y2={yPos}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    for (let i = 1; i < gridCols; i++) {
      const xPos = designOriginX + (i * stageWidth) / gridCols
      lines.push(
        <line
          key={`v-grid-${i}`}
          x1={xPos}
          y1={designGroundY - stageHeight}
          x2={xPos}
          y2={designGroundY}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    return lines
  }, [showGrid, designGroundY, stageHeight, designOriginX, stageWidth])

  return (
    <div className="w-full h-full flex flex-row gap-2 p-2 bg-slate-50 rounded-lg">
      {/* ── 1. 左平级分区：AnimationSvgCanvas 斜抛动画 ── */}
      <div ref={containerRef} className="flex-1 min-w-0 relative">
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          className="bg-white rounded-lg shadow-inner"
        >
          <VectorDefs colors={[PHYSICS_COLORS.velocityX, PHYSICS_COLORS.velocityY, PHYSICS_COLORS.velocity]} />

          {gridLines}

          {/* 坐标轴 */}
          <line x1={designOriginX} y1={designGroundY - stageHeight} x2={designOriginX} y2={designGroundY} stroke={CANVAS_COLORS.axis} strokeWidth={STROKE.axis} />
          <line x1={designOriginX} y1={designGroundY} x2={OBLIQUE_PRESET.width - 15} y2={designGroundY} stroke={CANVAS_COLORS.axis} strokeWidth={STROKE.axis} />

          <text x={designOriginX - 10} y={designGroundY - stageHeight + 10} fontSize={font(10)} fill={PHYSICS_COLORS.labelText} textAnchor="end">y / m</text>
          <text x={designOriginX - 10} y={designGroundY + 4} fontSize={font(10)} fill={PHYSICS_COLORS.labelText} textAnchor="end">0</text>
          <text x={OBLIQUE_PRESET.width - 20} y={designGroundY + 16} fontSize={font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x / m</text>

          {/* 抛出角度指示盘 */}
          {!isLanded && (
            <path
              d={`M ${designOriginX} ${designGroundY} L ${designOriginX + 35} ${designGroundY} A 35 35 0 0 0 ${designOriginX + 35 * Math.cos(angleRad)} ${designGroundY - 35 * Math.sin(angleRad)} Z`}
              fill={SCENE_COLORS.effects.sectorFill}
              stroke={PHYSICS_COLORS.velocityX}
              strokeWidth={0.6}
              strokeDasharray="2,2"
            />
          )}

          {/* 弹射炮筒 */}
          <g transform={`translate(${designOriginX}, ${designGroundY}) rotate(${-angle})`}>
            <rect x={0} y={-5} width={26} height={10} fill={PHYSICS_COLORS.labelText} opacity={0.8} rx={2} />
            <circle cx={4} cy={0} r={2} fill={PHYSICS_COLORS.velocityY} />
          </g>

          {/* 轨迹 */}
          <ParticleTrajectory
            historyPoints={trajectoryPoints.history}
            predictedPoints={trajectoryPoints.predicted}
            tailPoints={tailPoints}
            isFocus
            chargeSign="none"
          />

          {/* 分方向投影球 */}
          {!isLanded && (
            <>
              <Ball cx={ballDesign.cx} cy={designGroundY} r={6} type="steelGhost" stroke={PHYSICS_COLORS.velocityX} />
              <Ball cx={designOriginX} cy={ballDesign.cy} r={6} type="steelGhost" stroke={PHYSICS_COLORS.velocityY} />
              <line x1={ballDesign.cx} y1={ballDesign.cy} x2={ballDesign.cx} y2={designGroundY} stroke={CANVAS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
              <line x1={ballDesign.cx} y1={ballDesign.cy} x2={designOriginX} y2={ballDesign.cy} stroke={CANVAS_COLORS.grid} strokeWidth={0.8} strokeDasharray="3,3" />
            </>
          )}

          {/* 规范 PhysicsVectorArrow (严禁 pixelLength) */}
          {showVectors && !isLanded && (
            <g>
              <PhysicsVectorArrow
                originDesign={{ x: ballDesign.cx, y: ballDesign.cy }}
                vector={{ x: currentPhys.vx, y: 0 }}
                type="velocityX"
                sceneScale={obliqueSceneScale}
                strokeWidth={STROKE.vectorSub}
              />
              <PhysicsVectorArrow
                originDesign={{ x: ballDesign.cx, y: ballDesign.cy }}
                vector={{ x: 0, y: currentPhys.vy }}
                type="velocityY"
                sceneScale={obliqueSceneScale}
                strokeWidth={STROKE.vectorSub}
              />
              <PhysicsVectorArrow
                originDesign={{ x: ballDesign.cx, y: ballDesign.cy }}
                vector={{ x: currentPhys.vx, y: currentPhys.vy }}
                type="velocity"
                sceneScale={obliqueSceneScale}
                strokeWidth={STROKE.vectorMain}
              />
            </g>
          )}

          {/* 主钢小球 */}
          {!isLanded && (
            <Ball cx={ballDesign.cx} cy={ballDesign.cy} r={10} type="steel" />
          )}

          {/* 落地指示 */}
          {isLanded && (
            <g transform={`translate(${ballDesign.cx}, ${designGroundY - 12})`}>
              <Ball cx={0} cy={0} r={10} type="steel" />
              <text y={-16} fontSize={font(11)} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">落地</text>
            </g>
          )}
        </AnimationSvgCanvas>
      </div>

      {/* ── 2. 右平级分区：v-t 图表 ── */}
      <div className="w-[360px] shrink-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
        <VelocityTimeChart
          mode="animated"
          points={vtChartData.pointsVx}
          domainPoints={vtChartData.domainVx}
          additionalSeries={[
            {
              points: vtChartData.pointsVy,
              domainPoints: vtChartData.domainVy,
              label: 'vᵧ',
              series: 'secondary',
            },
          ]}
          currentTime={activeT}
          tMax={maxTime * 1.1}
          vRange={[-v0 * 1.1, v0 * 1.1]}
          title="斜抛运动 速度分量 - 时间 (v-t) 图像"
          showCursor={!isLanded}
          showGrid
        />
      </div>
    </div>
  )
}
