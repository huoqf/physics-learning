import { useMemo } from 'react'
import { Ball, PhysicsGround, PhysicsVectorArrow, ParticleTrajectory } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, STROKE, DASH } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { ObliqueThrowPhysicsResult } from '../hooks/useObliqueThrowPhysics'

export interface ObliqueThrowSceneProps {
  physics: ObliqueThrowPhysicsResult
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
  angle: number
  showVectors?: boolean
  showGrid?: boolean
  showVacuumCompare?: boolean
  showPrevTrajectory?: boolean
}

/**
 * 智能生成物理刻度步长 (1, 2, 5, 10, 20, 50, 100...)
 */
function getNiceStep(range: number, targetTicks = 6): number {
  if (range <= 0) return 5
  const rawStep = range / targetTicks
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const relStep = rawStep / mag

  if (relStep < 1.5) return 1 * mag
  if (relStep < 3.5) return 2 * mag
  if (relStep < 7.5) return 5 * mag
  return 10 * mag
}

export function ObliqueThrowScene({
  physics,
  canvasSize,
  sceneScale,
  angle,
  showVectors = true,
  showGrid = true,
  showVacuumCompare = false,
  showPrevTrajectory = true,
}: ObliqueThrowSceneProps) {
  const { font } = canvasSize

  // 1. 物理坐标转换为设计坐标
  const originPos = worldToDesign(0, 0, sceneScale)
  const ballPos = worldToDesign(physics.x, physics.y, sceneScale)
  const topPos = worldToDesign(physics.topX, physics.topY, sceneScale)
  const rangePos = worldToDesign(physics.range, 0, sceneScale)

  // 2. 动态物理刻度轴与网格线生成 (Physical Ruler Ticks)
  const ticksData = useMemo(() => {
    const maxPhysicalX = Math.max(physics.range * 1.15, 15)
    const maxPhysicalY = Math.max(physics.topY * 1.35, 6)

    const xStep = getNiceStep(maxPhysicalX, 7)
    const yStep = getNiceStep(maxPhysicalY, 5)

    const xTicks: { xVal: number; pos: { px: number; py: number } }[] = []
    for (let x = xStep; x <= maxPhysicalX; x += xStep) {
      xTicks.push({ xVal: x, pos: worldToDesign(x, 0, sceneScale) })
    }

    const yTicks: { yVal: number; pos: { px: number; py: number } }[] = []
    for (let y = yStep; y <= maxPhysicalY; y += yStep) {
      yTicks.push({ yVal: y, pos: worldToDesign(0, y, sceneScale) })
    }

    return { xTicks, yTicks }
  }, [physics.range, physics.topY, sceneScale])

  // 3. 轨迹坐标转换
  const historyDesignPoints = useMemo(() => {
    return physics.historyPoints.map((pt) => {
      const pos = worldToDesign(pt.x, pt.y, sceneScale)
      return { x: pos.px, y: pos.py }
    })
  }, [physics.historyPoints, sceneScale])

  const predictedDesignPoints = useMemo(() => {
    return physics.predictedPoints.map((pt) => {
      const pos = worldToDesign(pt.x, pt.y, sceneScale)
      return { x: pos.px, y: pos.py }
    })
  }, [physics.predictedPoints, sceneScale])

  const vacPredictedDesignPoints = useMemo(() => {
    if (!physics.vacPredictedPoints || !showVacuumCompare) return undefined
    return physics.vacPredictedPoints.map((pt) => {
      const pos = worldToDesign(pt.x, pt.y, sceneScale)
      return { x: pos.px, y: pos.py }
    })
  }, [physics.vacPredictedPoints, showVacuumCompare, sceneScale])

  // 上一次参数轨迹 (对比留痕)
  const prevPredictedDesignPoints = useMemo(() => {
    if (!physics.prevPredictedPoints || !showPrevTrajectory) return undefined
    return physics.prevPredictedPoints.map((pt) => {
      const pos = worldToDesign(pt.x, pt.y, sceneScale)
      return { x: pos.px, y: pos.py }
    })
  }, [physics.prevPredictedPoints, showPrevTrajectory, sceneScale])

  // 4. 拖尾点 (最近 8 点)
  const tailPoints = useMemo(() => {
    return historyDesignPoints.slice(-8)
  }, [historyDesignPoints])

  // 角度弧度
  const angleRad = (angle * Math.PI) / 180

  return (
    <g>
      {/* ── 0. 动态物理网格线与数值刻度 ── */}
      {showGrid && (
        <g stroke={CANVAS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.axis.join(' ')}>
          {/* 动态水平网格 */}
          {ticksData.yTicks.map(({ yVal, pos }) => (
            <g key={`y-grid-${yVal}`}>
              <line x1={originPos.px} y1={pos.py} x2={originPos.px + 820} y2={pos.py} />
            </g>
          ))}
          {/* 动态竖直网格 */}
          {ticksData.xTicks.map(({ xVal, pos }) => (
            <g key={`x-grid-${xVal}`}>
              <line x1={pos.px} y1={originPos.py - 300} x2={pos.px} y2={originPos.py} />
            </g>
          ))}
        </g>
      )}

      {/* ── 1. 物理基座与坐标轴刻度数字 ── */}
      <PhysicsGround x={originPos.px - 40} y={originPos.py} width={900} type="ground" />

      {/* 坐标轴线 */}
      <line
        x1={originPos.px}
        y1={originPos.py - 290}
        x2={originPos.px}
        y2={originPos.py}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.axis}
      />
      <text x={originPos.px - 10} y={originPos.py - 290} fontSize={font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
        y / m
      </text>

      {/* X 轴刻度数字 */}
      {ticksData.xTicks.map(({ xVal, pos }) => (
        <g key={`x-tick-${xVal}`}>
          <line x1={pos.px} y1={originPos.py} x2={pos.px} y2={originPos.py + 4} stroke={CANVAS_COLORS.axis} strokeWidth={1} />
          <text x={pos.px} y={originPos.py + 16} fontSize={font(10)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
            {`${xVal}m`}
          </text>
        </g>
      ))}

      {/* Y 轴刻度数字 */}
      {ticksData.yTicks.map(({ yVal, pos }) => (
        <g key={`y-tick-${yVal}`}>
          <line x1={originPos.px - 4} y1={pos.py} x2={originPos.px} y2={pos.py} stroke={CANVAS_COLORS.axis} strokeWidth={1} />
          <text x={originPos.px - 8} y={pos.py + 4} fontSize={font(10)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
            {`${yVal}m`}
          </text>
        </g>
      ))}

      <text x={originPos.px + 820} y={originPos.py + 18} fontSize={font(11)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        x / m
      </text>

      {/* ── 2. 留痕对比轨迹 (上一参数轨迹) ── */}
      {prevPredictedDesignPoints && (
        <g>
          <path
            d={prevPredictedDesignPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')}
            fill="none"
            stroke={PHYSICS_COLORS.angularVelocity}
            strokeWidth={1.2}
            strokeDasharray="4,4"
            opacity={0.5}
          />
          <text
            x={prevPredictedDesignPoints[Math.floor(prevPredictedDesignPoints.length / 2)]?.x || originPos.px + 100}
            y={(prevPredictedDesignPoints[Math.floor(prevPredictedDesignPoints.length / 2)]?.y || originPos.py - 50) - 8}
            fontSize={font(9)}
            fill={PHYSICS_COLORS.angularVelocity}
            opacity={0.7}
          >
            上一参数轨迹
          </text>
        </g>
      )}

      {/* ── 3. 最高点与射程关键特征标注 ── */}
      {physics.topY > 0.1 && (
        <g>
          {/* 最高点虚线 */}
          <line
            x1={topPos.px}
            y1={originPos.py}
            x2={topPos.px}
            y2={topPos.py}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={0.8}
            strokeDasharray="3,3"
          />
          <line
            x1={originPos.px}
            y1={topPos.py}
            x2={topPos.px}
            y2={topPos.py}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={0.8}
            strokeDasharray="3,3"
          />
          <text
            x={topPos.px}
            y={topPos.py - 10}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.displacement}
            textAnchor="middle"
            fontWeight="600"
          >
            {`Hmax = ${physics.topY.toFixed(1)}m`}
          </text>
        </g>
      )}

      {/* 射程落地标记 */}
      {physics.range > 0.5 && (
        <g transform={`translate(${rangePos.px}, ${originPos.py})`}>
          <line x1={0} y1={-15} x2={0} y2={0} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} />
          <text y={16} fontSize={font(10)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            {`射程 X = ${physics.range.toFixed(1)}m`}
          </text>
        </g>
      )}

      {/* ── 4. 抛射角度指示盘与炮筒 ── */}
      {!physics.isLanded && (
        <path
          d={`M ${originPos.px} ${originPos.py} L ${originPos.px + 35} ${originPos.py} A 35 35 0 0 0 ${
            originPos.px + 35 * Math.cos(angleRad)
          } ${originPos.py - 35 * Math.sin(angleRad)} Z`}
          fill={SCENE_COLORS.effects.sectorFill}
          stroke={PHYSICS_COLORS.velocityX}
          strokeWidth={0.8}
          strokeDasharray="2,2"
        />
      )}
      <text
        x={originPos.px + 42}
        y={originPos.py - 12}
        fontSize={font(10)}
        fill={PHYSICS_COLORS.velocityX}
        fontWeight="bold"
      >
        {`θ = ${angle}°`}
      </text>

      {/* 抛射炮筒/发射器 */}
      <g transform={`translate(${originPos.px}, ${originPos.py}) rotate(${-angle})`}>
        <rect x={0} y={-6} width={28} height={12} fill={SCENE_COLORS.materials.pulleyDark} rx={2} />
        <circle cx={4} cy={0} r={3} fill={PHYSICS_COLORS.referencePoint} />
      </g>

      {/* ── 5. 物理轨迹 ── */}
      {/* 真空对照轨迹（带阻力模式） */}
      {vacPredictedDesignPoints && (
        <path
          d={vacPredictedDesignPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')}
          fill="none"
          stroke={PHYSICS_COLORS.displacement}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.6}
        />
      )}

      {/* 主运动轨迹 */}
      <ParticleTrajectory
        historyPoints={historyDesignPoints}
        predictedPoints={predictedDesignPoints}
        tailPoints={tailPoints}
        isFocus
        chargeSign="none"
      />

      {/* ── 6. 分方向投影虚影小球 ── */}
      {!physics.isLanded && (
        <g>
          {/* 水平投影球 */}
          <Ball cx={ballPos.px} cy={originPos.py} r={6} type="steelGhost" stroke={PHYSICS_COLORS.velocityX} />
          {/* 竖直投影球 */}
          <Ball cx={originPos.px} cy={ballPos.py} r={6} type="steelGhost" stroke={PHYSICS_COLORS.velocityY} />
          {/* 正交虚线 */}
          <line
            x1={ballPos.px}
            y1={ballPos.py}
            x2={ballPos.px}
            y2={originPos.py}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={0.8}
            strokeDasharray="3,3"
          />
          <line
            x1={ballPos.px}
            y1={ballPos.py}
            x2={originPos.px}
            y2={ballPos.py}
            stroke={CANVAS_COLORS.grid}
            strokeWidth={0.8}
            strokeDasharray="3,3"
          />
        </g>
      )}

      {/* ── 7. 矢量箭头 (合速度与分速度) ── */}
      {showVectors && !physics.isLanded && (
        <g>
          {/* 水平速度 vx */}
          <PhysicsVectorArrow
            originDesign={{ x: ballPos.px, y: ballPos.py }}
            vector={{ x: physics.vx, y: 0 }}
            type="velocityX"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorSub}
          />
          {/* 竖直速度 vy */}
          <PhysicsVectorArrow
            originDesign={{ x: ballPos.px, y: ballPos.py }}
            vector={{ x: 0, y: physics.vy }}
            type="velocityY"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorSub}
          />
          {/* 合速度 v */}
          <PhysicsVectorArrow
            originDesign={{ x: ballPos.px, y: ballPos.py }}
            vector={{ x: physics.vx, y: physics.vy }}
            type="velocity"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
          />
        </g>
      )}

      {/* ── 8. 运动主体小球 ── */}
      {!physics.isLanded && (
        <g>
          <Ball cx={ballPos.px} cy={ballPos.py} r={10} type="steel" />
          {/* 数值标注 */}
          <text
            x={ballPos.px}
            y={ballPos.py - 20}
            fontSize={font(11)}
            fill={PHYSICS_COLORS.velocity}
            fontWeight="bold"
            textAnchor="middle"
          >
            {`v = ${physics.v.toFixed(1)} m/s`}
          </text>
        </g>
      )}

      {/* 落地标记 */}
      {physics.isLanded && (
        <g transform={`translate(${ballPos.px}, ${originPos.py - 10})`}>
          <Ball cx={0} cy={0} r={10} type="steel" />
          <text y={-18} fontSize={font(11)} fill={PHYSICS_COLORS.displacement} fontWeight="bold" textAnchor="middle">
            🎯 落地
          </text>
        </g>
      )}
    </g>
  )
}
