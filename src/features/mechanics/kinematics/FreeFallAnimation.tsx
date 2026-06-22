import { useCanvasSize } from '@/utils'
import { useEffect, useMemo, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  VT_CHART_COLORS,
  STROKE,
  OPACITY,
  DASH,
  FONT,
} from '@/theme/physics'
import { useFreeFallPhysics } from './useFreeFallPhysics'
import { getPhysicsAtTime, GRAVITY } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { Ball } from '@/components/Physics/Ball'
import { VelocityTimeChart } from '@/components/Chart'
import type { ChartDataSeries } from '@/components/Chart'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import { MATERIAL, TUBE_PHYSICAL_HEIGHT, RIPPLE_DURATION, RIPPLE_MAX_RADIUS, MaterialA, MaterialB } from './freeFallConfig'
import { useFreeFallLayout } from './useFreeFallLayout'

// ─── 撞击波纹组件 ─────────────────────────────────────────────────────────────
interface RippleProps {
  x: number
  y: number
  color: string
  startTime: number
  currentTime: number
}

function ImpactRipple({ x, y, color, startTime, currentTime }: RippleProps) {
  const elapsed = currentTime - startTime
  if (elapsed < 0 || elapsed > RIPPLE_DURATION) return null
  const progress = elapsed / RIPPLE_DURATION
  const radius = RIPPLE_MAX_RADIUS * progress
  const opacity = 1 - progress
  return (
    <circle
      cx={x} cy={y} r={radius}
      fill="none" stroke={color} strokeWidth={STROKE.reference}
      opacity={opacity * 0.6}
    />
  )
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function FreeFallAnimation() {
    const {params, time, showVectors, showGrid, showTimeSlices, setIsPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    showTimeSlices: s.showTimeSlices,
    setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 100, height: 100 })
  const { font } = canvasSize

  // ── 参数提取 ──────────────────────────────────────────────────────────────
  const pressure = params.pressure ?? 0
  const objectA: MaterialA = (params.objectA === 1 ? 'coin' : 'ironBall') as MaterialA
  const objectB: MaterialB = (params.objectB === 1 ? 'paper' : 'feather') as MaterialB
  const g = params.g ?? 9.8
  const v0 = params.v0 ?? 0

  const matA = MATERIAL[objectA]
  const matB = MATERIAL[objectB]
  const dragKA = pressure * matA.baseDragK
  const dragKB = pressure * matB.baseDragK

  // ── 波纹状态 ─────────────────────────────────────────────────────────────
  const [rippleA, setRippleA] = useState<{ x: number; y: number; time: number } | null>(null)
  const [rippleB, setRippleB] = useState<{ x: number; y: number; time: number } | null>(null)

  // ── 布局计算 ──────────────────────────────────────────────────────────
  const {
    stageWidth, dataX, dataWidth,
    tubeLeft, tubeRight, tubeWidth,
    tubeTop, tubeBottom, tubeHeight,
    originY, groundY, stageHeight,
    ballX, featherX,
  } = useFreeFallLayout(canvasSize)

  // ── 动态 scale ───────────────────────────────────────────────────────────
  const maxFallHeight = TUBE_PHYSICAL_HEIGHT
  const scale = useMemo(
    () => (maxFallHeight > 0 ? stageHeight / maxFallHeight : 25),
    [maxFallHeight, stageHeight]
  )

  const ffScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: stageWidth, height: stageHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: {
      velocity: Math.sqrt(2 * g * TUBE_PHYSICAL_HEIGHT),
      acceleration: GRAVITY,
      gravity: GRAVITY,
      force: 0.5,
    },
  }
  const ffSceneScale = createSceneScale(ffScene)

  // ── 物理引擎应用 (离线预计算与插值) ───────────────────────────────────────
  const { points: pointsA, groundTime: groundTimeA, currentState: stateA } = useFreeFallPhysics(
    v0, g, dragKA, matA.mass, maxFallHeight, time
  )
  const { points: pointsB, currentState: stateB } = useFreeFallPhysics(
    v0, g, dragKB, matB.mass, maxFallHeight, time
  )

  const isLandedA = stateA.isLanded
  const isLandedB = stateB.isLanded
  const effectiveVA = isLandedA ? 0 : stateA.v
  const effectiveVB = isLandedB ? 0 : stateB.v
  const effectiveYA = stateA.y
  const effectiveYB = stateB.y
  
  // 物理坐标映射为像素坐标（带摆动微动效）
  const currentYA = originY + effectiveYA * scale
  const currentYB = originY + effectiveYB * scale
  const swayAngleB = stateB.swayAngle
  const swayDxB = stateB.swayDx

  // ── 整体落地判断 ──────────────────────────────────────────────────────────
  const isAllLanded = isLandedA && isLandedB
  useEffect(() => {
    if (isAllLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isAllLanded, time, setIsPlaying])

  // ── 局部波纹状态同步 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isLandedA) {
      setRippleA({ x: ballX, y: groundY, time })
    } else {
      setRippleA(null)
    }
  }, [isLandedA, ballX, groundY])

  useEffect(() => {
    if (isLandedB) {
      setRippleB({ x: featherX + swayDxB, y: groundY, time })
    } else {
      setRippleB(null)
    }
  }, [isLandedB, featherX, swayDxB, groundY])

  // ── 轨迹追踪 ────────────────────────────────────────────────────────────
  const trailA = useMemo(() => {
    return pointsA
      .filter(p => p.t <= time + 1e-9)
      .map(p => ({ x: ballX, y: originY + p.y * scale }))
  }, [pointsA, time, ballX, originY, scale])

  const trailB = useMemo(() => {
    return pointsB
      .filter(p => p.t <= time + 1e-9)
      .map(p => ({ x: featherX + p.swayDx, y: originY + p.y * scale }))
  }, [pointsB, time, featherX, originY, scale])

  // ── 频闪点（基于预计算点抽取，每0.1秒一个点） ────────────────────────────────────
  const flashPointsRenderA = useMemo(() => {
    if (!showGrid || showTimeSlices) return []
    // 步长为 0.01s，每隔 10 个点即为一个 0.1s 的频闪点
    const pts = pointsA.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0)
    return pts.map((pt, i) => {
      const cy = originY + pt.y * scale
      const opacity = pts.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / (pts.length - 1))
      return (
        <circle key={`fa-${i}`} cx={ballX} cy={Math.min(cy, groundY - 14)} r={4}
          fill={PHYSICS_COLORS.referencePoint} opacity={opacity} />
      )
    })
  }, [showGrid, showTimeSlices, pointsA, time, originY, scale, ballX, groundY])

  const flashPointsRenderB = useMemo(() => {
    if (!showGrid || showTimeSlices) return []
    const pts = pointsB.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0)
    return pts.map((pt, i) => {
      const cy = originY + pt.y * scale
      const opacity = pts.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / (pts.length - 1))
      return (
        <circle key={`fb-${i}`} cx={featherX + pt.swayDx} cy={Math.min(cy, groundY - 10)} r={3}
          fill={CHART_COLORS.compareB} opacity={opacity * 0.7} />
      )
    })
  }, [showGrid, showTimeSlices, pointsB, time, originY, scale, featherX, groundY])

  // ── 历史已捕获频闪列表（右侧表格用） ───────────────────────────────────────
  const flashPointsTableA = useMemo(() => {
    return pointsA.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0)
  }, [pointsA, time])

  const flashPointsTableB = useMemo(() => {
    return pointsB.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0)
  }, [pointsB, time])

  // ── 时间切片 ────────────────────────────────────────────────────────────
  const TIME_SLICE_COLORS = [CHART_COLORS.primary, CHART_COLORS.compareB, CHART_COLORS.compareC, CHART_COLORS.criticalPt] as const
  const TIME_SLICE_RATIOS = [1, 3, 5, 7] as const

  const timeSliceBlocks = useMemo(() => {
    if (!showTimeSlices) return []
    const blocks: Array<{ y: number; height: number; ratio: number | null; color: string; displacement: number }> = []
    const sliceTime = groundTimeA / 4
    for (let i = 0; i < 4; i++) {
      const t1 = i * sliceTime
      const t2 = (i + 1) * sliceTime
      const res1 = getPhysicsAtTime(pointsA, t1, groundTimeA)
      const res2 = getPhysicsAtTime(pointsA, t2, groundTimeA)
      const dy = res2.y - res1.y
      blocks.push({
        y: originY + res1.y * scale,
        height: dy * scale,
        ratio: dragKA === 0 ? TIME_SLICE_RATIOS[i] : null,
        color: TIME_SLICE_COLORS[i],
        displacement: dy,
      })
    }
    return blocks
  }, [pointsA, groundTimeA, dragKA, showTimeSlices, originY, scale])

  // ── 环境状态文字 ─────────────────────────────────────────────────────────
  const envLabel = useMemo(() => {
    if (pressure <= 0.01) return '趋近自由落体'
    if (pressure <= 0.3) return '空气阻力较小'
    return '空气阻力明显'
  }, [pressure])

  const tubeLabel = useMemo(() => {
    if (pressure <= 0.01) return '牛顿管（真空）'
    if (pressure >= 0.99) return '牛顿管（有空气）'
    return `牛顿管（气压 ${(pressure * 100).toFixed(0)}%）`
  }, [pressure])

  // ── 渲染位置极限截断 ─────────────────────────────────────────────────────
  const renderYA = Math.min(currentYA, groundY - 14)
  const renderYB = Math.min(currentYB, groundY - 10)

  // ── v-t 图参数 ────────────────────────────────────────────────────────
  const vtChartTop = canvasSize.height * 0.03
  const vtChartHeight = canvasSize.height * 0.62
  const vtXMax = useMemo(() => {
    const effectiveXMax = Math.max(Math.min(groundTimeA * 1.2, 8), 2)
    return Math.round(effectiveXMax * 10) / 10
  }, [groundTimeA])

  // 用于绘制的点：按 time 截断（图表本身也会再按 currentTime 截断一次，这里保留以减少传输量）
  const vtPointsA = useMemo(() => {
    return pointsA.filter((p) => p.t <= Math.min(time, vtXMax) + 1e-9).map((p) => ({ t: p.t, v: p.v }))
  }, [pointsA, time, vtXMax])

  const vtPointsB = useMemo(() => {
    return pointsB.filter((p) => p.t <= Math.min(time, vtXMax) + 1e-9).map((p) => ({ t: p.t, v: p.v }))
  }, [pointsB, time, vtXMax])

  // 用于坐标轴定标的“完整”点：仅按 vtXMax 截尾，不随 time 变化，避免 Y 轴动态扩张
  const vtDomainPointsA = useMemo(() => {
    return pointsA.filter((p) => p.t <= vtXMax + 1e-9).map((p) => ({ t: p.t, v: p.v }))
  }, [pointsA, vtXMax])

  const vtDomainPointsB = useMemo(() => {
    return pointsB.filter((p) => p.t <= vtXMax + 1e-9).map((p) => ({ t: p.t, v: p.v }))
  }, [pointsB, vtXMax])

  const vtAdditionalSeries: ChartDataSeries[] = useMemo(() => [{
    points: vtPointsB,
    domainPoints: vtDomainPointsB,
    label: matB.label,
    series: 'accent',
    showArea: true,
    areaVariant: 'alt',
    areaIntensity: 'subtle',
  }], [vtPointsB, vtDomainPointsB, matB.label])

  // ── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 定义科学光影渐变 */}
        <defs>
          {/* 玻璃壁效果渐变 */}
          <linearGradient id="glass-tube-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.25" />
            <stop offset="5%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.1" />
            <stop offset="15%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.05" />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.0" />
            <stop offset="85%" stopColor={SCENE_COLORS.materials.glassGrad[2]} stopOpacity="0.05" />
            <stop offset="95%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.1" />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.25" />
          </linearGradient>

          {/* 硬币金红质感渐变 */}
          <radialGradient id="coin-grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.northLight} />
            <stop offset="25%" stopColor={SCENE_COLORS.magnet.northBase} />
            <stop offset="70%" stopColor={SCENE_COLORS.magnet.northMid} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.northShadow} />
          </radialGradient>

          {/* 箭头定义 */}
          <VectorDefs colors={[PHYSICS_COLORS.acceleration, PHYSICS_COLORS.forceNet, CHART_COLORS.compareB]} />
        </defs>

        {/* ========== 左侧动画舞台 ========== */}

        {/* 1. 牛顿管玻璃管 */}
        <rect
          x={tubeLeft} y={tubeTop}
          width={tubeWidth} height={tubeHeight}
          fill="url(#glass-tube-grad)"
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.objectLine}
          rx={8}
          opacity={0.7}
        />
        {/* 玻璃管外框微光 */}
        <rect
          x={tubeLeft + 1.5} y={tubeTop + 1.5}
          width={tubeWidth - 3} height={tubeHeight - 3}
          fill="none"
          stroke={colors.neutral.white}
          strokeWidth={1}
          rx={7}
          opacity={0.3}
        />
        {/* 玻璃管左侧折射白高光线 */}
        <line
          x1={tubeLeft + 4} y1={tubeTop + 8} x2={tubeLeft + 4} y2={tubeBottom - 8}
          stroke={colors.neutral.white} strokeWidth={2} strokeLinecap="round" opacity={0.25}
        />

        <text
          x={tubeLeft + tubeWidth / 2} y={tubeTop - 25}
          fontSize={FONT.axis} fill={pressure <= 0.01 ? CANVAS_COLORS.annotation : PHYSICS_COLORS.labelText}
          textAnchor="middle" fontWeight="600" opacity={0.7}
        >
          {tubeLabel}
        </text>
        <text x={ballX} y={originY - 18} fontSize={font(9)} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">{matA.label}</text>
        <text x={featherX} y={originY - 18} fontSize={font(9)} fill={CHART_COLORS.compareB} textAnchor="middle" fontWeight="bold">{matB.label}</text>

        {/* 地面线 */}
        <PhysicsGround
          x={tubeLeft + 10}
          y={groundY}
          width={tubeRight - tubeLeft - 20}
          appearance={{
            color: 'rgba(51, 65, 85, 0.5)' // PHYSICS_COLORS.labelText is neutral-700 (#334155), alpha 0.5
          }}
        />

        {/* y=0 释放线 */}
        <line x1={ballX} y1={originY - 20} x2={ballX} y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} opacity={0.3} />
        <line x1={featherX} y1={originY - 20} x2={featherX} y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} opacity={0.2} />

        {/* 标注 */}
        <text x={tubeLeft - 5} y={originY} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="end">y=0</text>
        <text x={tubeLeft - 5} y={groundY} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="end">y=h</text>

        {/* 时间切片色块 */}
        {timeSliceBlocks.map((block, i) => (
          <g key={`slice-${i}`}>
            <rect x={ballX - 24} y={block.y} width={48} height={block.height}
              fill={block.color} opacity={0.12} stroke={block.color}
              strokeWidth={STROKE.reference} strokeOpacity={0.5} rx={2} />
            {block.ratio !== null && (
              <text x={ballX + 32} y={block.y + block.height / 2 + 4}
                fontSize={FONT.small} fill={block.color} fontWeight="bold" textAnchor="middle">{block.ratio}</text>
            )}
            <text x={ballX + 32} y={block.y + block.height / 2 + (block.ratio !== null ? 16 : 4)}
              fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">{block.displacement.toFixed(2)}m</text>
          </g>
        ))}

        {/* 频闪圆 */}
        {flashPointsRenderA}
        {flashPointsRenderB}

        {/* 轨迹追踪线 */}
        {trailA.length >= 2 && (
          <polyline
            points={trailA.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke={PHYSICS_COLORS.velocity}
            strokeWidth={STROKE.trackHistory} opacity={OPACITY.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
          />
        )}
        {trailB.length >= 2 && (
          <polyline
            points={trailB.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke={CHART_COLORS.compareB}
            strokeWidth={STROKE.trackHistory} opacity={OPACITY.trackHistory}
            strokeDasharray={DASH.trackHistory.join(' ')}
          />
        )}

        {/* 2. 物体A（铁球/硬币 - 带高级反射渐变） */}
        {objectA === 'ironBall' ? (
          <Ball
            cx={ballX}
            cy={renderYA}
            r={14}
            type="steel"
            strokeWidth={STROKE.objectLine}
          />
        ) : (
          <g transform={`translate(${ballX}, ${renderYA})`}>
            {/* 硬币立体层 */}
            <circle cx={0} cy={1.5} r={13.5} fill={SCENE_COLORS.magnet.northShadow} />
            <circle cx={0} cy={0} r={13.5} fill="url(#coin-grad)" stroke={SCENE_COLORS.magnet.northMid} strokeWidth={STROKE.objectThin} />
            {/* 内圈装饰线 */}
            <circle cx={0} cy={0} r={10} fill="none" stroke={SCENE_COLORS.magnet.northLight} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.6} />
          </g>
        )}

        {/* 3. 物体B（羽毛/纸片 - 物理偏摆与旋转） */}
        <g transform={`translate(${featherX + swayDxB}, ${renderYB}) rotate(${(swayAngleB * 180) / Math.PI})`}>
          {objectB === 'feather' ? (
            <g>
              {/* 精美 SVG 羽毛 */}
              {/* 左羽片 */}
              <path d="M 0,-16 C -6,-8 -8,4 -3,14 L 0,11 C -3,2 -3,-8 0,-16" fill={CHART_COLORS.highlight} opacity={0.4} />
              {/* 右羽片 */}
              <path d="M 0,-16 C 6,-8 8,4 3,14 L 0,11 C 3,2 3,-8 0,-16" fill={CHART_COLORS.highlight} opacity={0.4} />
              {/* 羽轴 */}
              <line x1={0} y1={-16} x2={0} y2={16} stroke={CHART_COLORS.compareB} strokeWidth={1.5} strokeLinecap="round" />
            </g>
          ) : (
            // 纸片偏转摆动
            <g>
              <rect x={-10} y={-4} width={20} height={8}
                fill="rgba(245, 158, 11, 0.15)" stroke={CHART_COLORS.compareB} strokeWidth={STROKE.objectLine} rx={1} />
              {/* 纸张微弱折痕线 */}
              <line x1={-10} y1={0} x2={10} y2={0} stroke={CHART_COLORS.compareB} strokeWidth={0.5} opacity={0.6} />
            </g>
          )}
        </g>

        {/* 4. 重力矢量箭头 */}
        {showVectors && !isLandedA && (
          <g>
            <VectorArrow
              origin={{ x: ballX - 28, y: -renderYA }}
              vector={{ x: 0, y: -g }}
              type="gravity"
              sceneScale={ffSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={ballX - 40} y={Math.min(renderYA + ffSceneScale.maxVectorLength * 0.5, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">g</text>
            {g > GRAVITY && (
              <text x={ballX - 40} y={Math.min(renderYA + ffSceneScale.maxVectorLength * 0.5, groundY - 10) + 10}
                fontSize={font(7)} fill={PHYSICS_COLORS.gravity} fontWeight="bold" opacity={0.7}>▲max</text>
            )}
          </g>
        )}
        {showVectors && !isLandedB && (
          <g transform={`translate(${swayDxB}, 0)`}>
            <VectorArrow
              origin={{ x: featherX - 28, y: -renderYB }}
              vector={{ x: 0, y: -g }}
              type="gravity"
              sceneScale={ffSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={featherX - 40} y={Math.min(renderYB + ffSceneScale.maxVectorLength * 0.5, groundY - 10)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.gravity} fontWeight="bold">g</text>
            {g > GRAVITY && (
              <text x={featherX - 40} y={Math.min(renderYB + ffSceneScale.maxVectorLength * 0.5, groundY - 10) + 10}
                fontSize={font(7)} fill={PHYSICS_COLORS.gravity} fontWeight="bold" opacity={0.7}>▲max</text>
            )}
          </g>
        )}

        {/* 5. 空气阻力矢量箭头 */}
        {showVectors && !isLandedA && stateA.fDrag > 0.001 && (
          <g>
            <VectorArrow
              origin={{ x: ballX + 18, y: -renderYA }}
              vector={{ x: 0, y: stateA.fDrag }}
              type="forceComponent"
              sceneScale={ffSceneScale}
              strokeWidth={STROKE.vectorSub}
            />
            <text x={ballX + 28} y={Math.max(renderYA - ffSceneScale.maxVectorLength * 0.2, originY + 5)}
              fontSize={FONT.small} fill={PHYSICS_COLORS.airResistance} fontWeight="bold">f</text>
          </g>
        )}
        {showVectors && !isLandedB && stateB.fDrag > 0.001 && (
          <g transform={`translate(${swayDxB}, 0)`}>
            <VectorArrow
              origin={{ x: featherX + 16, y: -renderYB }}
              vector={{ x: 0, y: stateB.fDrag }}
              type="force"
              sceneScale={ffSceneScale}
              color={CHART_COLORS.compareB}
              strokeWidth={STROKE.vectorSub}
            />
            <text x={featherX + 26} y={Math.max(renderYB - ffSceneScale.maxVectorLength * 0.2, originY + 5)}
              fontSize={FONT.small} fill={CHART_COLORS.compareB} fontWeight="bold">f'</text>
          </g>
        )}

        {/* 6. 速度矢量箭头 */}
        {showVectors && !isLandedA && Math.abs(effectiveVA) > 0.1 && (
          <g>
            <VectorArrow
              origin={{ x: ballX + 28, y: -renderYA }}
              vector={{ x: 0, y: -effectiveVA }}
              type="velocity"
              sceneScale={ffSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={ballX + 38} y={renderYA + 16}
              fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}
        {showVectors && !isLandedB && Math.abs(effectiveVB) > 0.1 && (
          <g transform={`translate(${swayDxB}, 0)`}>
            <VectorArrow
              origin={{ x: featherX + 28, y: -renderYB }}
              vector={{ x: 0, y: -effectiveVB }}
              type="velocity"
              sceneScale={ffSceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={featherX + 38} y={renderYB + 16}
              fontSize={FONT.small} fill={CHART_COLORS.compareB} fontWeight="bold">v'</text>
          </g>
        )}

        {/* 落地标注 */}
        {isLandedA && (
          <text x={ballX} y={groundY - 40} fontSize={FONT.small} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">{matA.label}落地</text>
        )}
        {isLandedB && (
          <text x={featherX + swayDxB} y={groundY - 40} fontSize={FONT.small} fill={CHART_COLORS.compareB} textAnchor="middle" fontWeight="bold">{matB.label}落地</text>
        )}

        {/* 6. 撞击波纹 */}
        {rippleA && (
          <ImpactRipple x={rippleA.x} y={rippleA.y} color={PHYSICS_COLORS.velocity}
            startTime={rippleA.time} currentTime={time} />
        )}
        {rippleB && (
          <ImpactRipple x={rippleB.x} y={rippleB.y} color={CHART_COLORS.compareB}
            startTime={rippleB.time} currentTime={time} />
        )}

        {/* ========== 右侧数据/图表区 ========== */}

        {/* 频闪数据表格 */}
        <g transform={`translate(${dataX}, ${vtChartTop})`}>
          <rect width={dataWidth} height={canvasSize.height * 0.32} fill="white" stroke={CHART_COLORS.gridLine} rx={4} />
          <text x={dataWidth / 2} y={18} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
            频闪数据记录表
          </text>

          <rect y={24} width={dataWidth} height={18} fill={CHART_COLORS.gridLine} opacity={0.15} />
          <line x1={0} y1={42} x2={dataWidth} y2={42} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <text x={dataWidth * 0.12} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">t(s)</text>
          <text x={dataWidth * 0.38} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">v_A(m/s)</text>
          <text x={dataWidth * 0.62} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">v_B(m/s)</text>
          <text x={dataWidth * 0.85} y={37} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">y_A(m)</text>

          {flashPointsTableA.map((pt, i) => {
            const ptB = flashPointsTableB[i]
            const isCurrent = i === flashPointsTableA.length - 1
            const availableH = canvasSize.height * 0.32 - 55
            const maxRows = Math.min(flashPointsTableA.length, Math.floor(availableH / 16))
            const displayPoints = flashPointsTableA.slice(-maxRows)
            if (!displayPoints.includes(pt)) return null
            const idx = displayPoints.indexOf(pt)
            const rowY = 50 + idx * 16
            return (
              <g key={`row-${i}`}>
                {isCurrent && <rect x={0} y={rowY - 12} width={dataWidth} height={18} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />}
                <text x={dataWidth * 0.12} y={rowY} fontSize={font(9)} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{pt.t.toFixed(1)}</text>
                <text x={dataWidth * 0.38} y={rowY} fontSize={font(9)} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{pt.v.toFixed(2)}</text>
                <text x={dataWidth * 0.62} y={rowY} fontSize={font(9)} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? CHART_COLORS.compareB : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{ptB ? ptB.v.toFixed(2) : '-'}</text>
                <text x={dataWidth * 0.85} y={rowY} fontSize={font(9)} fontFamily="monospace" textAnchor="middle"
                  fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>{pt.y.toFixed(3)}</text>
                <line x1={0} y1={rowY + 4} x2={dataWidth} y2={rowY + 4} stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.chartRef} />
              </g>
            )
          })}
        </g>

        {/* v-t 图 */}
        <foreignObject x={dataX} y={vtChartTop + canvasSize.height * 0.32 + 12} width={dataWidth} height={vtChartHeight}>
          <div style={{ width: '100%', height: '100%' }}>
            <VelocityTimeChart
              points={vtPointsA}
              domainPoints={vtDomainPointsA}
              currentTime={Math.min(time, vtXMax)}
              tMax={vtXMax}
              title="速度－时间图像 (v-t 图)"
              showArea
              series="primary"
              additionalSeries={vtAdditionalSeries}
              showGrid
            />
          </div>
        </foreignObject>

        {/* 底部文字标注（5个） */}
        <text x={dataX + 8} y={canvasSize.height * 0.97} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontFamily="monospace" fontWeight="bold">
          v{matA.label === '铁球' ? '球' : '币'} = {effectiveVA.toFixed(2)} m/s
        </text>
        <text x={dataX + dataWidth * 0.35} y={canvasSize.height * 0.97} fontSize={FONT.small} fill={CHART_COLORS.compareB} fontFamily="monospace" fontWeight="bold">
          v{matB.label === '羽毛' ? '羽' : '纸'} = {effectiveVB.toFixed(2)} m/s
        </text>
        <text x={dataX + dataWidth * 0.65} y={canvasSize.height * 0.97} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} fontFamily="monospace">
          f'_air = {stateB.fDrag.toFixed(4)} N
        </text>
        <text x={dataX + dataWidth * 0.85} y={canvasSize.height * 0.97} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
          t = {time.toFixed(2)} s
        </text>
        <text x={dataX + dataWidth} y={canvasSize.height * 0.97} fontSize={FONT.small}
          fill={pressure <= 0.01 ? CANVAS_COLORS.annotation : PHYSICS_COLORS.labelTextLight}
          textAnchor="end" fontWeight={pressure <= 0.01 ? 'bold' : 'normal'}>
          {envLabel}
        </text>
      </svg>
    </div>
  )
}
